"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Edit, Eye, Calculator, DollarSign, ArrowRight, FileText } from "lucide-react"

interface Client {
  id: string
  nombre: string
  apellido: string
  dniCuil: string
  tipoCliente: "empresa" | "particular"
  telefono: string
  email: string
  direccion: string
}

interface Repair {
  id: string
  numeroIngreso: string
  fechaIngreso: string
  recepcionista: string
  clienteId: string
  cliente?: Client
  equipo: string
  marcaEquipo: string
  numeroSerie: string
  elementosFaltantes: string
  accesorios: string
  potencia: string
  tension: string
  revoluciones: string
  numeroRemito: string
  numeroOrdenCompra: string
  observaciones: string
  estado: "recepcion" | "presupuesto" | "reparacion" | "entrega" | "facturacion"
  fechaCreacion: string
  // Budget stage fields
  diagnosticoFalla?: string
  descripcionProceso?: string
  repuestos?: string
  importe?: string
  fechaPresupuesto?: string
  presupuestadoPor?: string
}

export default function BudgetPage() {
  const router = useRouter()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)
  const [isReceiptionDialogOpen, setIsReceiptionDialogOpen] = useState(false)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [budgetFormData, setBudgetFormData] = useState({
    diagnosticoFalla: "",
    descripcionProceso: "",
    repuestos: "",
    importe: "",
  })
  const [budgetRepairs, setBudgetRepairs] = useState<Repair[]>([])
  const [receptionRepairs, setReceptionRepairs] = useState<Repair[]>([])

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("user")
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }

    // Load clients
    const savedClients = localStorage.getItem("clients")
    if (savedClients) {
      setClients(JSON.parse(savedClients))
    }

    // Load repairs
    const savedRepairs = localStorage.getItem("repairs")
    if (savedRepairs) {
      setRepairs(JSON.parse(savedRepairs))
    }

    // Cargar reparaciones en presupuesto
    const fetchBudgetRepairs = async () => {
      const { data: repData, error: repError } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'presupuesto')
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
        // Consultar presupuesto asociado
        const { data: presupuesto } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('reparacion_id', rep.id)
          .order('id', { ascending: false })
          .limit(1)
          .single()
        // Consultar cliente asociado
        const { data: cliente } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', rep.cliente_id)
          .single()
        return {
          id: rep.id.toString(),
          numeroIngreso: `R-${new Date(rep.fecha_creacion).getFullYear()}-${(idx+1).toString().padStart(3, '0')}`,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          recepcionista,
          clienteId: rep.cliente_id.toString(),
          cliente: cliente ? {
            id: cliente.id.toString(),
            nombre: cliente.nombre,
            apellido: cliente.apellido,
            dniCuil: cliente.dni_cuil,
            tipoCliente: cliente.tipo_cliente,
            telefono: cliente.telefono,
            email: cliente.email,
            direccion: cliente.direccion,
          } : undefined,
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
          // Datos de presupuesto
          diagnosticoFalla: presupuesto?.diagnostico_falla || '',
          descripcionProceso: presupuesto?.descripcion_proceso || '',
          repuestos: presupuesto?.repuestos_necesarios || '',
          importe: presupuesto?.importe_total ? presupuesto.importe_total.toString() : '',
        }
      }))
      setBudgetRepairs(repairsWithEquipos)
    }
    fetchBudgetRepairs()

    // Cargar reparaciones en recepción
    const fetchReceptionRepairs = async () => {
      const { data: repData, error: repError } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'recepcion')
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
      setReceptionRepairs(repairsWithEquipos)
    }
    fetchReceptionRepairs()
  }, [router])

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;

    // 1. Consultar si ya existe un presupuesto para este reparacion_id
    const { data: existingPresupuesto, error: fetchError } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('reparacion_id', parseInt(editingRepair.id))
      .maybeSingle();

    let budgetError = null;
    if (existingPresupuesto && existingPresupuesto.id) {
      // Si existe, hacer UPDATE
      const { error } = await supabase
        .from('presupuestos')
        .update({
          diagnostico_falla: budgetFormData.diagnosticoFalla,
          descripcion_proceso: budgetFormData.descripcionProceso,
          repuestos_necesarios: budgetFormData.repuestos,
          importe_total: parseFloat(budgetFormData.importe.replace(',', '.')) || 0,
        })
        .eq('id', existingPresupuesto.id);
      budgetError = error;
    } else {
      // Si no existe, hacer INSERT
      const { error } = await supabase
        .from('presupuestos')
        .insert([
          {
            reparacion_id: parseInt(editingRepair.id),
            diagnostico_falla: budgetFormData.diagnosticoFalla,
            descripcion_proceso: budgetFormData.descripcionProceso,
            repuestos_necesarios: budgetFormData.repuestos,
            importe_total: parseFloat(budgetFormData.importe.replace(',', '.')) || 0,
          }
        ]);
      budgetError = error;
    }
    if (budgetError) {
      alert('Error al guardar presupuesto en la base de datos.');
      return;
    }

    // 2. Cambiar el estado de la reparación a 'presupuesto'
    await supabase
      .from('reparaciones')
      .update({ estado_actual: 'presupuesto', fecha_actualizacion: new Date().toISOString() })
      .eq('id', editingRepair.id);

    // 3. Refrescar la lista de reparaciones en presupuesto
    if (typeof window !== 'undefined') {
      window.location.reload();
    }

    // Reset form (por si acaso)
    setBudgetFormData({
      diagnosticoFalla: "",
      descripcionProceso: "",
      repuestos: "",
      importe: "",
    });
    setEditingRepair(null);
    setIsBudgetDialogOpen(false);
  }

  const handleMoveToRepair = async (repair: Repair) => {
    // Actualizar en Supabase
    const { error } = await supabase
      .from('reparaciones')
      .update({ estado_actual: 'reparacion', fecha_actualizacion: new Date().toISOString() })
      .eq('id', repair.id);
    if (error) {
      alert('Error al mover a reparación');
      return;
    }
    // Refrescar la lista de presupuestos
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  const handleEditBudget = (repair: Repair) => {
    setEditingRepair(repair)
    setBudgetFormData({
      diagnosticoFalla: repair.diagnosticoFalla || "",
      descripcionProceso: repair.descripcionProceso || "",
      repuestos: repair.repuestos || "",
      importe: repair.importe || "",
    })
    setIsBudgetDialogOpen(true)
  }

  const handleView = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    setViewingRepair({ ...repair, cliente: client })
  }

  const handleMoveFromReception = (repairId: string) => {
    const updatedRepairs = repairs.map((repair) =>
      repair.id === repairId ? { ...repair, estado: "presupuesto" as const } : repair,
    )
    setRepairs(updatedRepairs)
    localStorage.setItem("repairs", JSON.stringify(updatedRepairs))
    setIsReceiptionDialogOpen(false)
  }

  const filteredBudgetRepairs = budgetRepairs.filter((repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    const clientName = client ? `${client.nombre} ${client.apellido}` : ""

    return (
      repair.numeroIngreso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.marcaEquipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Calculator className="h-8 w-8 text-primary" />
                Presupuestos
              </h1>
              <p className="text-muted-foreground">Gestione diagnósticos y presupuestos de reparación</p>
            </div>

            <div className="flex gap-3">
              <Dialog open={isReceiptionDialogOpen} onOpenChange={setIsReceiptionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <ArrowRight className="h-4 w-4" />
                    Mover desde Recepción
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Mover Equipos a Presupuesto</DialogTitle>
                    <DialogDescription>Seleccione equipos de recepción para crear presupuesto</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {receptionRepairs.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay equipos en recepción</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receptionRepairs.map((repair) => {
                          const client = clients.find((c) => c.id === repair.clienteId)
                          return (
                            <Card key={repair.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {repair.numeroIngreso} - {repair.equipo}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"} •{" "}
                                    {repair.marcaEquipo}
                                  </p>
                                </div>
                                <Button size="sm" onClick={() => handleMoveFromReception(repair.id)}>
                                  Mover a Presupuesto
                                </Button>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número de ingreso, equipo, marca o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{budgetRepairs.length}</div>
                  <div className="text-sm text-muted-foreground">En Presupuesto</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Repairs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Equipos en Presupuesto</CardTitle>
              <CardDescription>
                {filteredBudgetRepairs.length} equipo{filteredBudgetRepairs.length !== 1 ? "s" : ""} esperando
                presupuesto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Ingreso</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Estado Presupuesto</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgetRepairs.map((repair) => {
                      const client = repair.cliente
                      const hasBudget = repair.diagnosticoFalla && repair.importe

                      return (
                        <TableRow key={repair.id}>
                          <TableCell className="font-mono font-medium">{repair.numeroIngreso}</TableCell>
                          <TableCell className="font-medium">
                            {repair.cliente ? `${repair.cliente.nombre} ${repair.cliente.apellido}` : "Cliente no encontrado"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{repair.equipo}</p>
                              <p className="text-sm text-muted-foreground">{repair.marcaEquipo}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={hasBudget ? "default" : "secondary"}>
                              {hasBudget ? "Presupuestado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {repair.importe ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">${repair.importe}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin presupuesto</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleView(repair)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditBudget(repair)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {hasBudget && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveToRepair(repair)}
                                  className="text-green-600 hover:text-green-600"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {filteredBudgetRepairs.length === 0 && (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No se encontraron presupuestos" : "No hay equipos en presupuesto"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "Intente con otros términos de búsqueda"
                        : "Mueva equipos desde recepción para crear presupuestos"}
                    </p>
                    {!searchTerm && receptionRepairs.length > 0 && (
                      <Button onClick={() => setIsReceiptionDialogOpen(true)} className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Mover desde Recepción
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Form Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presupuesto - {editingRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Complete el diagnóstico y presupuesto de reparación</DialogDescription>
          </DialogHeader>

          {editingRepair && (
            <form onSubmit={handleBudgetSubmit} className="space-y-6">
              {/* Equipment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Equipo</Label>
                      <p className="text-foreground">{editingRepair.equipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Marca</Label>
                      <p className="text-foreground">{editingRepair.marcaEquipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">N° Serie</Label>
                      <p className="text-foreground font-mono">{editingRepair.numeroSerie}</p>
                    </div>
                  </div>
                  {editingRepair.observaciones && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Observaciones de Recepción</Label>
                        <p className="text-foreground">{editingRepair.observaciones}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Budget Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de Presupuesto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagnosticoFalla">Diagnóstico de Falla *</Label>
                    <Textarea
                      id="diagnosticoFalla"
                      value={budgetFormData.diagnosticoFalla}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, diagnosticoFalla: e.target.value })}
                      placeholder="Describa el diagnóstico técnico de la falla encontrada"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcionProceso">Descripción del Proceso de Reparación *</Label>
                    <Textarea
                      id="descripcionProceso"
                      value={budgetFormData.descripcionProceso}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, descripcionProceso: e.target.value })}
                      placeholder="Detalle los pasos y procesos necesarios para la reparación"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repuestos">Repuestos Necesarios</Label>
                    <Textarea
                      id="repuestos"
                      value={budgetFormData.repuestos}
                      onChange={(e) => setBudgetFormData({ ...budgetFormData, repuestos: e.target.value })}
                      placeholder="Liste los repuestos necesarios con cantidades y especificaciones"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="importe">Importe Total *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="importe"
                        type="number"
                        step="0.01"
                        value={budgetFormData.importe}
                        onChange={(e) => setBudgetFormData({ ...budgetFormData, importe: e.target.value })}
                        placeholder="0.00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsBudgetDialogOpen(false)
                    setEditingRepair(null)
                    setBudgetFormData({
                      diagnosticoFalla: "",
                      descripcionProceso: "",
                      repuestos: "",
                      importe: "",
                    })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar Presupuesto</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Repair Dialog */}
      <Dialog open={!!viewingRepair} onOpenChange={() => setViewingRepair(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle Completo - {viewingRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Información completa del equipo y presupuesto</DialogDescription>
          </DialogHeader>

          {viewingRepair && (
            <div className="space-y-6">
              {/* Client Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="text-foreground">
                        {viewingRepair.cliente
                          ? `${viewingRepair.cliente.nombre} ${viewingRepair.cliente.apellido}`
                          : "Cliente no encontrado"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                      <Badge variant={viewingRepair.cliente?.tipoCliente === "empresa" ? "default" : "secondary"}>
                        {viewingRepair.cliente?.tipoCliente === "empresa" ? "Empresa" : "Particular"}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                      <p className="text-foreground">{viewingRepair.cliente?.telefono || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-foreground">{viewingRepair.cliente?.email || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equipment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Equipo</Label>
                      <p className="text-foreground">{viewingRepair.equipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Marca</Label>
                      <p className="text-foreground">{viewingRepair.marcaEquipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Número de Serie</Label>
                      <p className="text-foreground font-mono">{viewingRepair.numeroSerie}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Potencia</Label>
                      <p className="text-foreground">{viewingRepair.potencia || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Information */}
              {(viewingRepair.diagnosticoFalla || viewingRepair.importe) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información de Presupuesto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {viewingRepair.diagnosticoFalla && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Diagnóstico de Falla</Label>
                        <p className="text-foreground">{viewingRepair.diagnosticoFalla}</p>
                      </div>
                    )}
                    {viewingRepair.descripcionProceso && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Proceso de Reparación</Label>
                        <p className="text-foreground">{viewingRepair.descripcionProceso}</p>
                      </div>
                    )}
                    {viewingRepair.repuestos && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Repuestos</Label>
                        <p className="text-foreground">{viewingRepair.repuestos}</p>
                      </div>
                    )}
                    {viewingRepair.importe && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Importe Total</Label>
                        <p className="text-foreground text-xl font-bold text-green-600">${viewingRepair.importe}</p>
                      </div>
                    )}
                    {viewingRepair.fechaPresupuesto && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fecha Presupuesto</Label>
                          <p className="text-foreground">
                            {new Date(viewingRepair.fechaPresupuesto).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Presupuestado por</Label>
                          <p className="text-foreground">{viewingRepair.presupuestadoPor}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
