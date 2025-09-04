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

  useEffect(() => {
    const fetchCompletedRepairs = async () => {
      const { data: repData, error: repError } = await supabase
        .from('reparaciones')
        .select('*')
        .in('estado_actual', ['facturacion', 'finalizada'])
        .order('id', { ascending: true })
      if (repError) return
      const repairsWithEquipos = await Promise.all((repData || []).map(async (rep: any, idx: number) => {
        const { data: equipo } = await supabase
          .from('equipos')
          .select('*')
          .eq('reparacion_id', rep.id)
          .single()
        let recepcionista = ''
        if (rep.creado_por) {
          const { data: user } = await supabase
            .from('personal')
            .select('nombre_completo')
            .eq('id', rep.creado_por)
            .single()
          recepcionista = user?.nombre_completo || ''
        }
        return {
          id: rep.id.toString(),
          numeroIngreso: `R-${new Date(rep.fecha_creacion).getFullYear()}-${(idx+1).toString().padStart(3, '0')}`,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          recepcionista,
          clienteId: rep.cliente_id.toString(),
          equipo: equipo?.tipo_equipo || '',
          marcaEquipo: equipo?.marca || '',
          numeroSerie: equipo?.numero_serie || '',
          elementosFaltantes: rep.elementos_faltantes || '',
          accesorios: rep.accesorios || '',
          potencia: equipo?.potencia || '',
          tension: equipo?.tension || '',
          revoluciones: equipo?.revoluciones || '',
          numeroRemito: rep.numero_remito || '',
          numeroOrdenCompra: rep.numero_orden_compra || '',
          observaciones: rep.observaciones_recepcion || '',
          estado: rep.estado_actual,
          fechaCreacion: rep.fecha_creacion,
        }
      }))
      setCompletedRepairs(repairsWithEquipos)
    }
    fetchCompletedRepairs()
  }, [])

  const filteredRepairs = repairs.filter(
    (repair) =>
      repair.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipment.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewRepair = (repair: any) => {
    setSelectedRepair(repair)
    setIsViewDialogOpen(true)
  }

  const handlePrintRepair = (repair: any) => {
    const printContent = `
      <html>
        <head>
          <title>Reparación ${repair.entryNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0056A6; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
            .section h3 { margin-top: 0; color: #0056A6; }
            .field { margin-bottom: 8px; }
            .field strong { display: inline-block; width: 150px; }
            .completed-badge { background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LESELEC INGENIERÍA</div>
            <h2>Reparación Finalizada - ${repair.entryNumber}</h2>
            <span class="completed-badge">COMPLETADA</span>
          </div>
          
          <div class="section">
            <h3>Información de Recepción</h3>
            <div class="field"><strong>Fecha de Ingreso:</strong> ${repair.entryDate}</div>
            <div class="field"><strong>N° de Ingreso:</strong> ${repair.entryNumber}</div>
            <div class="field"><strong>Cliente:</strong> ${repair.client.name}</div>
            <div class="field"><strong>Tipo:</strong> ${repair.client.type}</div>
            <div class="field"><strong>Equipo:</strong> ${repair.equipment}</div>
            <div class="field"><strong>Marca:</strong> ${repair.brand}</div>
            <div class="field"><strong>N° Serie:</strong> ${repair.serialNumber}</div>
            <div class="field"><strong>Potencia:</strong> ${repair.power}</div>
            <div class="field"><strong>Tensión:</strong> ${repair.voltage}</div>
          </div>

          <div class="section">
            <h3>Diagnóstico y Presupuesto</h3>
            <div class="field"><strong>Diagnóstico:</strong> ${repair.diagnosis}</div>
            <div class="field"><strong>Monto:</strong> $${repair.budgetAmount?.toLocaleString()}</div>
          </div>

          <div class="section">
            <h3>Reparación</h3>
            <div class="field"><strong>Encargado:</strong> ${repair.repairManager}</div>
            <div class="field"><strong>Armador:</strong> ${repair.assembler}</div>
          </div>

          <div class="section">
            <h3>Entrega</h3>
            <div class="field"><strong>Cajero:</strong> ${repair.cashier}</div>
            <div class="field"><strong>Fecha de Retiro:</strong> ${repair.pickupDate}</div>
            <div class="field"><strong>Retirante:</strong> ${repair.pickupPerson}</div>
            <div class="field"><strong>DNI:</strong> ${repair.pickupId}</div>
            <div class="field"><strong>Fecha Finalización:</strong> ${repair.completionDate}</div>
          </div>
        </body>
      </html>
    `

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
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Entregas Finalizadas</h1>
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

            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Este Mes</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {repairs.filter((r) => new Date(r.completionDate).getMonth() === new Date().getMonth()).length}
                    </p>
                  </div>
                </div>
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
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Equipo</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Fecha Ingreso</TableHead>
                      <TableHead className="px-6 py-4 font-semibold text-gray-900">Fecha Finalización</TableHead>
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
                        <TableCell className="px-6 py-4 font-medium text-gray-900">{repair.entryNumber}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{repair.client.name}</p>
                            <Badge variant="outline" className="text-xs font-medium">
                              {repair.client.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{repair.equipment}</p>
                            <p className="text-sm text-gray-500">{repair.brand}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-700">{repair.entryDate}</TableCell>
                        <TableCell className="px-6 py-4 text-gray-700">{repair.completionDate}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completada
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
            <DialogTitle>Reparación Completada - {selectedRepair?.entryNumber}</DialogTitle>
            <DialogDescription>Información completa de la reparación finalizada</DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reception Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recepción</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Fecha:</strong> {selectedRepair.entryDate}
                  </div>
                  <div>
                    <strong>Cliente:</strong> {selectedRepair.client.name}
                  </div>
                  <div>
                    <strong>Equipo:</strong> {selectedRepair.equipment}
                  </div>
                  <div>
                    <strong>Marca:</strong> {selectedRepair.brand}
                  </div>
                  <div>
                    <strong>N° Serie:</strong> {selectedRepair.serialNumber}
                  </div>
                  <div>
                    <strong>Potencia:</strong> {selectedRepair.power}
                  </div>
                  <div>
                    <strong>Tensión:</strong> {selectedRepair.voltage}
                  </div>
                </CardContent>
              </Card>

              {/* Budget Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Presupuesto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Diagnóstico:</strong> {selectedRepair.diagnosis}
                  </div>
                  <div>
                    <strong>Monto:</strong> ${selectedRepair.budgetAmount?.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              {/* Repair Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reparación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Encargado:</strong> {selectedRepair.repairManager}
                  </div>
                  <div>
                    <strong>Armador:</strong> {selectedRepair.assembler}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Cajero:</strong> {selectedRepair.cashier}
                  </div>
                  <div>
                    <strong>Fecha Retiro:</strong> {selectedRepair.pickupDate}
                  </div>
                  <div>
                    <strong>Retirante:</strong> {selectedRepair.pickupPerson}
                  </div>
                  <div>
                    <strong>DNI:</strong> {selectedRepair.pickupId}
                  </div>
                  <div>
                    <strong>Fecha Finalización:</strong> {selectedRepair.completionDate}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
