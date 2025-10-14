"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useEffect } from "react";
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, Printer, CheckCircle, Calendar } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"

// Mock data for completed deliveries
const mockCompletedRepairs = [
  {
    id: "REP-001",
    entryNumber: "ING-001",
    entryDate: "2024-01-15",
    completionDate: "2024-01-25",
    client: { name: "Juan Pérez", type: "particular", dni: "12345678", email: "juan@email.com" },
    equipment: "Motor Eléctrico",
    brand: "WEG",
    serialNumber: "WEG123456",
    power: "5 HP",
    voltage: "380V",
    diagnosis: "Bobinado quemado",
    budgetAmount: 85000,
    repairManager: "Carlos Rodríguez",
    assembler: "Miguel Torres",
    cashier: "Ana García",
    pickupDate: "2024-01-25",
    pickupPerson: "Juan Pérez",
    pickupId: "12345678",
    stage: "completed",
  },
  {
    id: "REP-002",
    entryNumber: "ING-002",
    entryDate: "2024-01-16",
    completionDate: "2024-01-26",
    client: { name: "Empresa ABC S.A.", type: "empresa", dni: "20123456789", email: "contacto@abc.com" },
    equipment: "Bomba Centrífuga",
    brand: "Grundfos",
    serialNumber: "GRU789012",
    power: "10 HP",
    voltage: "380V",
    diagnosis: "Rodamientos desgastados",
    budgetAmount: 120000,
    repairManager: "Luis Martínez",
    assembler: "Roberto Silva",
    cashier: "Ana García",
    pickupDate: "2024-01-26",
    pickupPerson: "María López",
    pickupId: "87654321",
    stage: "completed",
  },
]

export default function CompletedPage() {
  const [repairs, setRepairs] = useState(mockCompletedRepairs)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRepair, setSelectedRepair] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [completedRepairs, setCompletedRepairs] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    const fetchCompletedRepairs = async () => {
      // Buscar todas las entregas finalizadas
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('*')
        .eq('estado_entrega', 'entregado')
      if (entregasError) return
      // Para cada entrega, buscar la reparación y sus detalles
      const repairsWithDetails = await Promise.all((entregas || []).map(async (entrega: any, idx: number) => {
        const { data: rep } = await supabase
          .from('reparaciones')
          .select('*')
          .eq('id', entrega.reparacion_id)
          .single();
        if (!rep) return null;
        const { data: equipos } = await supabase
          .from('equipos')
          .select('*')
          .eq('reparacion_id', rep.id);
        const { data: cliente } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', rep.cliente_id)
          .single();
        const { data: presupuesto } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('reparacion_id', rep.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        const { data: trabajo } = await supabase
          .from('trabajos_reparacion')
          .select('*')
          .eq('reparacion_id', rep.id)
          .single();
        return {
          id: rep.id.toString(),
          numeroIngreso: rep.numero_ingreso,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          cliente: cliente ? `${cliente.nombre} ${cliente.apellido}` : '',
          tipoCliente: cliente?.tipo_cliente || '',
          dniCuil: cliente?.dni_cuil || '',
          telefono: cliente?.telefono || '',
          email: cliente?.email || '',
          direccion: cliente?.direccion || '',
          equipos: (equipos || []).map((eq: any) => ({
            id: eq.id?.toString() || '',
            tipo_equipo: eq.tipo_equipo,
            marca: eq.marca,
            numero_serie: eq.numero_serie,
            cantidad: eq.cantidad || 1,
            potencia: eq.potencia,
            tension: eq.tension,
            revoluciones: eq.revoluciones,
          })),
          equipo: equipos && equipos[0] ? equipos[0].tipo_equipo : '',
          marcaEquipo: equipos && equipos[0] ? equipos[0].marca : '',
          numeroSerie: equipos && equipos[0] ? equipos[0].numero_serie : '',
          potencia: equipos && equipos[0] ? equipos[0].potencia : '',
          tension: equipos && equipos[0] ? equipos[0].tension : '',
          revoluciones: equipos && equipos[0] ? equipos[0].revoluciones : '',
          fechaEntrega: entrega.fecha_retiro || '',
          nombreRetirante: entrega.nombre_retirante || '',
          apellidoRetirante: entrega.apellido_retirante || '',
          dniRetirante: entrega.dni_retirante || '',
          estadoEntrega: entrega.estado_entrega || '',
          diagnostico: presupuesto?.diagnostico_falla || '',
          descripcionProceso: presupuesto?.descripcion_proceso || '',
          repuestos: presupuesto?.repuestos_necesarios || '',
          monto: presupuesto?.importe_total || '',
          encargado: trabajo?.encargado_reparacion || '',
          armador: trabajo?.armador || '',
          estadoReparacion: trabajo?.estado_reparacion || '',
          observacionesReparacion: trabajo?.observaciones || '',
          cajero: entrega.cajero_id || '',
          recepcionista: rep.recepcionista || '',
          observaciones: rep.observaciones_recepcion || '',
        }
      }))
      setCompletedRepairs(repairsWithDetails.filter(Boolean))
    }
    fetchCompletedRepairs()
  }, [])

  const filteredRepairs = completedRepairs.filter(
    (repair) =>
      (repair.numeroIngreso || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repair.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repair.equipo || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewRepair = (repair: any) => {
    setSelectedRepair(repair)
    setIsViewDialogOpen(true)
  }

  const handlePrintRepair = (repair: any) => {
    const printContent = `
      <html>
        <head>
          <title>Entrega ${repair.numeroIngreso}</title>
          <style>
            @media print {
  html, body {
    height: 100%;
    max-height: 100vh;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  .section {
    page-break-inside: avoid;
    margin-bottom: 6px !important;
    padding: 8px 10px !important;
    font-size: 11px !important;
  }
  .header {
    margin-bottom: 10px !important;
  }
  .field {
    margin-bottom: 3px !important;
  }

              html, body { width: 210mm; height: 297mm; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 10mm 8mm 10mm 8mm;
              font-size: 12px;
              color: #222;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .logo {
              font-size: 22px;
              font-weight: bold;
              color: #0056A6;
              margin-bottom: 4px;
            }
            .badge {
              background: #2d8f5a;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;
              margin-left: 8px;
              letter-spacing: 1px;
            }
            .section {
              margin-bottom: 12px;
              border: 1px solid #ddd;
              padding: 12px 18px;
              border-radius: 5px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin-top: 0;
              margin-bottom: 8px;
              font-size: 15px;
              color: #0056A6;
            }
            .field {
              margin-bottom: 4px;
            }
            .field strong {
              display: inline-block;
              width: 170px;
              font-size: 12px;
            }
            .importe {
              color: green;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LESELEC INGENIERÍA</div>
            <h2>Entrega - ${repair.numeroIngreso}</h2>
            <span class="badge">ENTREGA</span>
          </div>
          <div class="section">
            <h3>Recepción</h3>
            <div class="field"><strong>Fecha de Ingreso:</strong> ${repair.fechaIngreso ? new Date(repair.fechaIngreso).toLocaleDateString('es-AR') : ''}</div>
            <div class="field"><strong>Recepcionista:</strong> ${repair.recepcionista || '-'}</div>
            <div class="field"><strong>Observaciones de Recepción:</strong> ${repair.observaciones || '-'}</div>
          </div>
          <div class="section">
            <h3>Información del Cliente</h3>
            <div class="field"><strong>Cliente:</strong> ${repair.cliente}</div>
            <div class="field"><strong>DNI/CUIL:</strong> ${repair.dniCuil || '-'}</div>
            <div class="field"><strong>Tipo:</strong> ${repair.tipoCliente || '-'}</div>
            <div class="field"><strong>Teléfono:</strong> ${repair.telefono || '-'}</div>
            <div class="field"><strong>Email:</strong> ${repair.email || '-'}</div>
            <div class="field"><strong>Dirección:</strong> ${repair.direccion || '-'}</div>
          </div>
          <div class="section">
            <h3>Información de los Equipos</h3>
            ${(Array.isArray(repair.equipos) && repair.equipos.length > 0)
              ? (repair.equipos as Array<{
                  tipo_equipo: string;
                  cantidad: number;
                  marca: string;
                  numero_serie: string;
                  potencia?: string;
                  tension?: string;
                  revoluciones?: string;
                }>).map((eq) => `
                <div class="field" style="margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee;">
                  <strong>Equipo:</strong> ${eq.tipo_equipo} (x${eq.cantidad})<br/>
                  <strong>Marca:</strong> ${eq.marca}<br/>
                  <strong>N° Serie:</strong> ${eq.numero_serie}<br/>
                  <strong>Potencia:</strong> ${eq.potencia || "N/A"}<br/>
                  <strong>Tensión:</strong> ${eq.tension || "N/A"}<br/>
                  <strong>Revoluciones:</strong> ${eq.revoluciones || "N/A"}
                </div>
              `).join('')
              : `<div class="field"><strong>Equipo:</strong> ${repair.equipo}</div>`}
          </div>
          <div class="section">
            <h3>Presupuesto</h3>
            <div class="field"><strong>Diagnóstico de Falla:</strong> ${repair.diagnostico || '-'}</div>
            <div class="field"><strong>Descripción del Proceso:</strong> ${repair.descripcionProceso || '-'}</div>
            <div class="field"><strong>Repuestos:</strong> ${repair.repuestos || '-'}</div>
            <div class="field"><strong>Importe Total:</strong> <span class="importe">
              $${repair.monto ? Number(repair.monto).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span></div>
          </div>
          <div class="section">
            <h3>Reparación</h3>
            <div class="field"><strong>Encargado:</strong> ${repair.encargado || '-'}</div>
            <div class="field"><strong>Armador:</strong> ${repair.armador || '-'}</div>
            <div class="field"><strong>Estado Reparación:</strong> ${repair.estadoReparacion || '-'}</div>
            <div class="field"><strong>Observaciones Reparación:</strong> ${repair.observacionesReparacion || '-'}</div>
          </div>
          <div class="section">
            <h3>Entrega</h3>
            <div class="field"><strong>Nombre Retirante:</strong> ${repair.nombreRetirante || '-'}</div>
            <div class="field"><strong>DNI Retirante:</strong> ${repair.dniRetirante || '-'}</div>
            <div class="field"><strong>Fecha de Retiro:</strong> ${repair.fechaEntrega ? new Date(repair.fechaEntrega + 'T00:00:00').toLocaleDateString('es-AR') : ''}</div>
            <div class="field"><strong>Estado de Entrega:</strong> ${repair.estadoEntrega === 'entregado' ? 'Entregado' : 'Pendiente'}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <div className="flex-1 p-8 space-y-8 overflow-auto">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Reparaciones Finalizadas</h1>
            <p className="text-lg text-gray-600">Historial completo de reparaciones completadas</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-0 bg-white">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar por número de ingreso, cliente o equipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Completadas</p>
                    <p className="text-3xl font-bold text-green-600">{repairs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white cursor-pointer" onClick={() => setShowMonthSelector(true)}>
  <CardContent className="p-6">
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-blue-100 rounded-full">
        <Calendar className="w-6 h-6 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {monthNames[selectedMonth]} {selectedYear}
        </p>
        <p className="text-3xl font-bold text-blue-600">
          {completedRepairs.filter((r) => {
            const fecha = new Date(r.fechaEntrega);
            return fecha.getMonth() === selectedMonth && fecha.getFullYear() === selectedYear;
          }).length}
        </p>
      </div>
    </div>
    {showMonthSelector && (
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)}>&lt;</button>
        <span className="font-medium">{monthNames[selectedMonth]} {selectedYear}</span>
        <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)}>&gt;</button>
      </div>
    )}
  </CardContent>
</Card>
          </div>

          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="px-6 py-6 border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900">Reparaciones Completadas</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Historial de todas las reparaciones finalizadas con detalles completos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">N° Ingreso</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Cliente</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Tipo</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Equipo</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Marca</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">N° Serie</TableHead>
                                            <TableHead className="px-6 py-4 font-semibold text-gray-900">Fecha Ingreso</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Fecha Entrega</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Estado</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepairs.map((repair) => (
                      <TableRow
                        key={repair.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <TableCell className="px-6 py-4 font-medium text-gray-900">{repair.numeroIngreso}</TableCell>
                        <TableCell className="px-6 py-4">{repair.cliente}</TableCell>
                        <TableCell className="px-6 py-4">{repair.tipoCliente}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div>
                            {Array.isArray(repair.equipos) && repair.equipos.length > 0
                              ? repair.equipos.map((eq, idx) => (
                                  <div key={eq.id || idx} style={{ fontWeight: 500, marginBottom: 2 }}>
                                    {eq.tipo_equipo} <span style={{ color: '#666', fontWeight: 400 }}>(x{eq.cantidad})</span>
                                  </div>
                                ))
                              : <span className="text-muted-foreground">Sin equipos</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">{repair.marcaEquipo}</TableCell>
                        <TableCell className="px-6 py-4">{repair.numeroSerie}</TableCell>
                                                <TableCell className="px-6 py-4">{repair.fechaIngreso ? new Date(repair.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : ''}</TableCell>
                        <TableCell className="px-6 py-4">{repair.fechaEntrega ? new Date(repair.fechaEntrega + 'T00:00:00').toLocaleDateString('es-AR') : ''}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" />
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRepair(repair)}
                              className="hover:bg-blue-50 hover:border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintRepair(repair)}
                              className="hover:bg-gray-50 hover:border-gray-200"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Repair Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reparación Completada - {selectedRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Información completa de la reparación finalizada</DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="space-y-8">
              {/* Recepción */}
              <div>
                <h2 className="text-xl font-bold mb-2">Recepción</h2>
                <ul className="space-y-1">
                  <li><strong>Fecha:</strong> {selectedRepair.fechaIngreso}</li>
                  <li><strong>Cliente:</strong> {selectedRepair.cliente}</li>
                  <li><strong>Tipo:</strong> {selectedRepair.tipoCliente}</li>
                  <li><strong>Equipo:</strong> {selectedRepair.equipo}</li>
                  <li><strong>Marca:</strong> {selectedRepair.marcaEquipo}</li>
                  <li><strong>N° Serie:</strong> {selectedRepair.numeroSerie}</li>
                </ul>
              </div>
              {/* Presupuesto */}
              <div>
                <h2 className="text-xl font-bold mb-2">Presupuesto</h2>
                <ul className="space-y-1">
                  <li><strong>Diagnóstico:</strong> {selectedRepair.diagnostico}</li>
                  <li><strong>Monto:</strong> ${selectedRepair.monto?.toLocaleString()}</li>
                </ul>
              </div>
              {/* Reparación */}
              <div>
                <h2 className="text-xl font-bold mb-2">Reparación</h2>
                <ul className="space-y-1">
                  <li><strong>Encargado:</strong> {selectedRepair.encargado}</li>
                  <li><strong>Armador:</strong> {selectedRepair.armador}</li>
                </ul>
              </div>
              {/* Entrega */}
              <div>
                <h2 className="text-xl font-bold mb-2">Entrega</h2>
                <ul className="space-y-1">
                  <li><strong>Cajero:</strong> {selectedRepair.cajero}</li>
                  <li><strong>Fecha Retiro:</strong> {selectedRepair.fechaEntrega}</li>
                  <li><strong>Retirante:</strong> {selectedRepair.nombreRetirante} {selectedRepair.apellidoRetirante}</li>
                  <li><strong>DNI:</strong> {selectedRepair.dniRetirante}</li>
                  <li><strong>Fecha Finalización:</strong> {selectedRepair.fechaFinalizacion}</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
