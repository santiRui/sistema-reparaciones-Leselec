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
import { Search, Edit, Eye, Wrench, DollarSign, ArrowRight, FileText, User, Users } from "lucide-react"

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
  // Repair stage fields
  encargadoReparacion?: string
  armador?: string
  fechaInicioReparacion?: string
  fechaFinReparacion?: string
  observacionesReparacion?: string
  estadoReparacion?: "pendiente" | "en_proceso" | "completada"
}

export default function RepairPage() {
  const router = useRouter()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [personal, setPersonal] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  // Reparaciones cargadas desde Supabase para la etapa 'presupuesto'
  const [budgetRepairs, setBudgetRepairs] = useState<Repair[]>([])
  // Reparaciones cargadas desde Supabase para la etapa 'reparacion'
  const [repairRepairs, setRepairRepairs] = useState<Repair[]>([])
  const [repairFormData, setRepairFormData] = useState({
    encargadoReparacion: "",
    supervisor: "",
    tecnicos: [] as string[],
    armador: "",
    observacionesReparacion: "",
    estadoReparacion: "pendiente" as "pendiente" | "en_proceso" | "completada",
    prioridad: "",
    fechaInicioReparacion: "",
    fechaFinReparacion: "",
  })

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

    // Cargar personal para selectores de encargado, supervisor y técnicos
    const fetchPersonal = async () => {
      const { data: personalList } = await supabase
        .from('personal')
        .select('*')
        .eq('activo', true)
      setPersonal(personalList || [])
    }
    fetchPersonal()
    // Load clients
    const savedClients = localStorage.getItem("clients")
    if (savedClients) {
      setClients(JSON.parse(savedClients))
    }

    // Cargar reparaciones en etapa 'presupuesto' desde Supabase
    const loadBudgetRepairs = async () => {
      const { data, error } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'presupuesto')
      
      if (error) {
        console.error('Error cargando reparaciones de presupuesto:', error)
      } else if (data) {
        setBudgetRepairs(data as Repair[])
      }
    }

    // Cargar reparaciones en etapa 'reparacion' desde Supabase
    const loadRepairRepairs = async () => {
      const { data, error } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'reparacion')
      
      if (error) {
        console.error('Error cargando reparaciones en taller:', error)
      } else if (data) {
        const repairsWithDetails = await Promise.all((data || []).map(async (rep: any, idx: number) => {
          // Consultar equipo asociado
          const { data: equipo } = await supabase
            .from('equipos')
            .select('*')
            .eq('reparacion_id', rep.id)
            .single();
          // Consultar cliente asociado
          const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', rep.cliente_id)
            .single();
          // Consultar presupuesto asociado
          const { data: presupuesto } = await supabase
            .from('presupuestos')
            .select('*')
            .eq('reparacion_id', rep.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();
          return {
            id: rep.id.toString(),
            numeroIngreso: `R-${new Date(rep.fecha_creacion).getFullYear()}-${(idx+1).toString().padStart(3, '0')}`,
            fechaIngreso: rep.fecha_creacion.split('T')[0],
            recepcionista: '', // puedes completar si tienes el usuario
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
            // Campos de reparación
            encargadoReparacion: rep.encargado_reparacion || '',
            armador: rep.armador || '',
            fechaInicioReparacion: rep.fecha_inicio_reparacion || '',
            fechaFinReparacion: rep.fecha_fin_reparacion || '',
            observacionesReparacion: rep.observaciones_reparacion || '',
            estadoReparacion: rep.estado_reparacion || 'pendiente',
          };
        }));
        setRepairRepairs(repairsWithDetails);
      }
    }

    loadBudgetRepairs()
    loadRepairRepairs()
  }, [router])

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRepair) return

    try {
      // Actualizar solo fecha_actualizacion en reparaciones
      const { error: reparacionError } = await supabase
        .from('reparaciones')
        .update({ fecha_actualizacion: new Date().toISOString() })
        .eq('id', editingRepair.id)
      if (reparacionError) {
        console.error('Error actualizando reparacion:', reparacionError)
        throw reparacionError
      }
      // Upsert en trabajos_reparacion con supervisor, fechas y prioridad
      const { error: trabajoError, data: trabajoData } = await supabase
        .from('trabajos_reparacion')
        .upsert([
          {
            reparacion_id: Number(editingRepair.id),
            encargado_id: repairFormData.encargadoReparacion ? Number(repairFormData.encargadoReparacion) : null,
            supervisor_id: repairFormData.supervisor ? Number(repairFormData.supervisor) : null,
            estado_reparacion: repairFormData.estadoReparacion,
            prioridad: repairFormData.prioridad || null,
            fecha_inicio: repairFormData.fechaInicioReparacion || null,
            fecha_fin: repairFormData.fechaFinReparacion || null,
            observaciones: repairFormData.observacionesReparacion,
          }
        ], { onConflict: 'reparacion_id' })
      if (trabajoError) {
        console.error('Error actualizando trabajos_reparacion:', trabajoError)
        throw trabajoError
      }
      // Guardar técnicos múltiples en trabajos_tecnicos
      if (trabajoData && trabajoData.length > 0 && repairFormData.tecnicos && repairFormData.tecnicos.length > 0) {
        // Primero, eliminar técnicos anteriores
        await supabase.from('trabajos_tecnicos').delete().eq('trabajo_id', trabajoData[0].id)
        // Insertar los nuevos técnicos
        const tecnicosRows = repairFormData.tecnicos.map((tecnicoId: string) => ({ trabajo_id: trabajoData[0].id, tecnico_id: Number(tecnicoId) }))
        await supabase.from('trabajos_tecnicos').insert(tecnicosRows)
      }

      // Actualizar el estado local
      const updatedRepair: Repair = {
        ...editingRepair,
        ...repairFormData,
      }

      const updatedRepairs = repairs.map((repair) =>
        repair.id === editingRepair.id ? updatedRepair : repair,
      )

      setRepairs(updatedRepairs)
      setRepairRepairs(updatedRepairs.filter((repair: Repair) => repair.estado === "reparacion"))

      // Si el estado cambió a completada, actualizar la lista
      if (repairFormData.estadoReparacion === 'completada') {
        setRepairRepairs(prev => prev.filter(repair => repair.id !== editingRepair.id))
      }

      // Reset form
      setRepairFormData({
        encargadoReparacion: "",
        supervisor: "",
        tecnicos: [],
        armador: "",
        observacionesReparacion: "",
        estadoReparacion: "pendiente",
        prioridad: "",
        fechaInicioReparacion: "",
        fechaFinReparacion: "",
      })
      setEditingRepair(null)
      
    } catch (error) {
      console.error('Error actualizando reparación:', error)
      // Aquí podrías agregar un toast o notificación de error
    } finally {
      setIsRepairDialogOpen(false)
    }
  }

  const handleMoveToDelivery = async (repair: Repair) => {
    try {
      // Actualizar en Supabase
      const { error } = await supabase
        .from('reparaciones')
        .update({
          estado_actual: 'entrega',
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', repair.id)
      
      if (error) throw error
      
      // Actualizar el estado local
      const updatedRepair = { ...repair, estado: "entrega" as const }
      const updatedRepairs = repairs.map((r) => (r.id === repair.id ? updatedRepair : r))
      
      setRepairs(updatedRepairs)
      setRepairRepairs(prev => prev.filter(r => r.id !== repair.id))
      
    } catch (error) {
      console.error('Error moviendo a entrega:', error)
      // Aquí podrías agregar un toast o notificación de error
    }
  }

  const handleEditRepair = (repair: Repair) => {
    setEditingRepair(repair)
    setRepairFormData({
      encargadoReparacion: repair.encargadoReparacion || "",
      supervisor: repair.supervisor || "",
      tecnicos: repair.tecnicos || [],
      armador: repair.armador || "",
      observacionesReparacion: repair.observacionesReparacion || "",
      estadoReparacion: repair.estadoReparacion || "pendiente",
      prioridad: repair.prioridad || "",
      fechaInicioReparacion: repair.fechaInicioReparacion || "",
      fechaFinReparacion: repair.fechaFinReparacion || "",
    })
    setIsRepairDialogOpen(true)
  }

  const handleView = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    setViewingRepair({ ...repair, cliente: client })
  }

  const handleMoveFromBudget = async (repairId: string) => {
    try {
      // Actualizar en Supabase
      const { error } = await supabase
        .from('reparaciones')
        .update({
          estado_actual: 'reparacion',
          estado_reparacion: 'pendiente',
          fecha_inicio_reparacion: new Date().toISOString()
        })
        .eq('id', repairId)
      
      if (error) throw error
      
      // Actualizar el estado local
      const updatedRepairs = repairs.map((repair) =>
        repair.id === repairId
          ? {
              ...repair,
              estado: "reparacion" as const,
              estadoReparacion: "pendiente" as const,
              fechaInicioReparacion: new Date().toISOString().split("T")[0],
            }
          : repair
      )
      
      setRepairs(updatedRepairs)
      setRepairRepairs(updatedRepairs.filter((repair: Repair) => repair.estado === "reparacion"))
      
      // Actualizar la lista de presupuestos
      setBudgetRepairs(budgetRepairs.filter(repair => repair.id !== repairId))
      
    } catch (error) {
      console.error('Error moviendo a reparación:', error)
      // Aquí podrías agregar un toast o notificación de error
    } finally {
      setIsBudgetDialogOpen(false)
    }
  }

  const filteredRepairRepairs = repairRepairs.filter((repair: Repair) => {
    const client = repair.cliente
    const clientName = client ? `${client.nombre} ${client.apellido}` : ""

    return (
      (repair.numeroIngreso || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repair.equipo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repair.marcaEquipo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((repair.encargadoReparacion || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((repair.armador || "").toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "secondary"
      case "en_proceso":
        return "default"
      case "completada":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendiente":
        return "Pendiente"
      case "en_proceso":
        return "En Proceso"
      case "completada":
        return "Completada"
      default:
        return "Pendiente"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Wrench className="h-8 w-8 text-primary" />
                Reparaciones
              </h1>
              <p className="text-muted-foreground">
                {filteredRepairRepairs.length} equipo{filteredRepairRepairs.length !== 1 ? 's' : ''} en taller
              </p>
            </div>

            <div className="flex gap-3">
              <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <ArrowRight className="h-4 w-4" />
                    Mover desde Presupuesto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Mover Equipos a Reparación</DialogTitle>
                    <DialogDescription>Seleccione equipos presupuestados para iniciar reparación</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {budgetRepairs.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay equipos presupuestados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {budgetRepairs.map((repair) => {
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
                                  <div className="flex items-center gap-2 mt-1">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-600">${repair.importe}</span>
                                  </div>
                                </div>
                                <Button size="sm" onClick={() => handleMoveFromBudget(repair.id)}>
                                  Iniciar Reparación
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, equipo, cliente o técnico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {repairRepairs.filter((r) => r.estadoReparacion === "pendiente").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pendientes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {repairRepairs.filter((r) => r.estadoReparacion === "en_proceso").length}
                  </div>
                  <div className="text-sm text-muted-foreground">En Proceso</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repair Table */}
          <Card>
            <CardHeader>
              <CardTitle>Equipos en Reparación</CardTitle>
              <CardDescription>
                {filteredRepairRepairs.length} equipo{filteredRepairRepairs.length !== 1 ? 's' : ''} en taller
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
                      <TableHead>Equipo de Trabajo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Presupuesto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepairRepairs.map((repair) => {
                      const client = repair.cliente
                      const isCompleted = repair.estadoReparacion === "completada"

                      return (
                        <TableRow key={repair.id}>
                          <TableCell className="font-mono font-medium">{repair.numeroIngreso}</TableCell>
                          <TableCell>
                            {client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{repair.equipo}</p>
                              <p className="text-sm text-muted-foreground">{repair.marcaEquipo}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {repair.encargadoReparacion && (
                                <div className="flex items-center gap-1 text-sm">
                                  <User className="h-3 w-3" />
                                  <span>{repair.encargadoReparacion}</span>
                                </div>
                              )}
                              {repair.armador && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{repair.armador}</span>
                                </div>
                              )}
                              {!repair.encargadoReparacion && !repair.armador && (
                                <span className="text-sm text-muted-foreground">Sin asignar</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(repair.estadoReparacion || "pendiente")}>
                              {getStatusText(repair.estadoReparacion || "pendiente")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {repair.importe && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">${repair.importe}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleView(repair)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditRepair(repair)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isCompleted && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveToDelivery(repair)}
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

                {filteredRepairRepairs.length === 0 && (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No se encontraron reparaciones" : "No hay equipos en reparación"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "Intente con otros términos de búsqueda"
                        : "Mueva equipos desde presupuesto para iniciar reparaciones"}
                    </p>
                    {!searchTerm && budgetRepairs.length > 0 && (
                      <Button onClick={() => setIsBudgetDialogOpen(true)} className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Mover desde Presupuesto
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Repair Form Dialog */}
      <Dialog open={isRepairDialogOpen} onOpenChange={setIsRepairDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Reparación - {editingRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Asigne el equipo de trabajo y gestione el estado de la reparación</DialogDescription>
          </DialogHeader>

          {editingRepair && (
            <form onSubmit={handleRepairSubmit} className="space-y-6">
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
                      <Label className="text-sm font-medium text-muted-foreground">Presupuesto</Label>
                      <p className="text-foreground font-bold text-green-600">${editingRepair.importe}</p>
                    </div>
                  </div>
                  {editingRepair.diagnosticoFalla && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Diagnóstico</Label>
                        <p className="text-foreground">{editingRepair.diagnosticoFalla}</p>
                      </div>
                    </>
                  )}
                  {editingRepair.descripcionProceso && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium text-muted-foreground">Proceso de Reparación</Label>
                      <p className="text-foreground">{editingRepair.descripcionProceso}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Repair Team Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Equipo de Trabajo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="encargadoReparacion">Encargado de Reparación *</Label>
                      <Input
                        id="encargadoReparacion"
                        value={repairFormData.encargadoReparacion}
                        onChange={(e) => setRepairFormData({ ...repairFormData, encargadoReparacion: e.target.value })}
                        placeholder="Nombre del encargado técnico"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="armador">Armador/Técnico *</Label>
                      <Input
                        id="armador"
                        value={repairFormData.armador}
                        onChange={(e) => setRepairFormData({ ...repairFormData, armador: e.target.value })}
                        placeholder="Nombre del armador o técnico"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoReparacion">Estado de la Reparación *</Label>
                    <select
                      id="estadoReparacion"
                      value={repairFormData.estadoReparacion}
                      onChange={(e) =>
                        setRepairFormData({
                          ...repairFormData,
                          estadoReparacion: e.target.value as "pendiente" | "en_proceso" | "completada",
                        })
                      }
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      required
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacionesReparacion">Observaciones de Reparación</Label>
                    <Textarea
                      id="observacionesReparacion"
                      value={repairFormData.observacionesReparacion}
                      onChange={(e) =>
                        setRepairFormData({ ...repairFormData, observacionesReparacion: e.target.value })
                      }
                      placeholder="Notas sobre el progreso, problemas encontrados, etc."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRepairDialogOpen(false)
                    setEditingRepair(null)
                    setRepairFormData({
                      encargadoReparacion: "",
                      supervisor: "",
                      tecnicos: [],
                      armador: "",
                      observacionesReparacion: "",
                      estadoReparacion: "pendiente",
                      prioridad: "",
                      fechaInicioReparacion: "",
                      fechaFinReparacion: "",
                    })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Actualizar Reparación</Button>
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
            <DialogDescription>Información completa del equipo y reparación</DialogDescription>
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
              {viewingRepair.diagnosticoFalla && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información de Presupuesto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Diagnóstico</Label>
                      <p className="text-foreground">{viewingRepair.diagnosticoFalla}</p>
                    </div>
                    {viewingRepair.descripcionProceso && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Proceso</Label>
                        <p className="text-foreground">{viewingRepair.descripcionProceso}</p>
                      </div>
                    )}
                    {viewingRepair.importe && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Importe</Label>
                        <p className="text-foreground text-xl font-bold text-green-600">${viewingRepair.importe}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Repair Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de Reparación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Encargado</Label>
                      <p className="text-foreground">{viewingRepair.encargadoReparacion || "Sin asignar"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Armador</Label>
                      <p className="text-foreground">{viewingRepair.armador || "Sin asignar"}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(viewingRepair.estadoReparacion || "pendiente")}>
                        {getStatusText(viewingRepair.estadoReparacion || "pendiente")}
                      </Badge>
                    </div>
                  </div>

                  {viewingRepair.observacionesReparacion && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Observaciones</Label>
                      <p className="text-foreground">{viewingRepair.observacionesReparacion}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingRepair.fechaInicioReparacion && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha Inicio</Label>
                        <p className="text-foreground">
                          {new Date(viewingRepair.fechaInicioReparacion).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    )}
                    {viewingRepair.fechaFinReparacion && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha Finalización</Label>
                        <p className="text-foreground">
                          {new Date(viewingRepair.fechaFinReparacion).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    )}
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
