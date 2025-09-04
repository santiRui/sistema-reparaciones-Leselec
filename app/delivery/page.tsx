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
import { Search, Edit, Eye, Package, DollarSign, ArrowRight, FileText, User } from "lucide-react"

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
  // Delivery stage fields
  cajero?: string
  fechaRetiro?: string
  dniRetirante?: string
  nombreRetirante?: string
  apellidoRetirante?: string
  firmaRetirante?: string
  estadoEntrega?: "pendiente" | "entregado"
  fechaEntrega?: string
}

export default function DeliveryPage() {
  const router = useRouter()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [deliveryFormData, setDeliveryFormData] = useState({
    cajero: "",
    fechaRetiro: "",
    dniRetirante: "",
    nombreRetirante: "",
    apellidoRetirante: "",
    firmaRetirante: "",
    estadoEntrega: "pendiente" as "pendiente" | "entregado",
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
      setDeliveryFormData((prev) => ({ ...prev, cajero: JSON.parse(userData).username }))
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
  }, [router])

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRepair) return

    const updatedRepair: Repair = {
      ...editingRepair,
      ...deliveryFormData,
      fechaEntrega:
        deliveryFormData.estadoEntrega === "entregado"
          ? new Date().toISOString().split("T")[0]
          : editingRepair.fechaEntrega,
    }

    const updatedRepairs = repairs.map((repair) => (repair.id === editingRepair.id ? updatedRepair : repair))

    setRepairs(updatedRepairs)
    localStorage.setItem("repairs", JSON.stringify(updatedRepairs))

    // Reset form
    setDeliveryFormData({
      cajero: currentUser?.username || "",
      fechaRetiro: "",
      dniRetirante: "",
      nombreRetirante: "",
      apellidoRetirante: "",
      firmaRetirante: "",
      estadoEntrega: "pendiente",
    })
    setEditingRepair(null)
    setIsDeliveryDialogOpen(false)
  }

  const handleMoveToBilling = (repair: Repair) => {
    const updatedRepair = { ...repair, estado: "facturacion" as const }
    const updatedRepairs = repairs.map((r) => (r.id === repair.id ? updatedRepair : r))
    setRepairs(updatedRepairs)
    localStorage.setItem("repairs", JSON.stringify(updatedRepairs))
  }

  const handleEditDelivery = (repair: Repair) => {
    setEditingRepair(repair)
    setDeliveryFormData({
      cajero: repair.cajero || currentUser?.username || "",
      fechaRetiro: repair.fechaRetiro || "",
      dniRetirante: repair.dniRetirante || "",
      nombreRetirante: repair.nombreRetirante || "",
      apellidoRetirante: repair.apellidoRetirante || "",
      firmaRetirante: repair.firmaRetirante || "",
      estadoEntrega: repair.estadoEntrega || "pendiente",
    })
    setIsDeliveryDialogOpen(true)
  }

  const handleView = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    setViewingRepair({ ...repair, cliente: client })
  }

  const handleMoveFromRepair = (repairId: string) => {
    const updatedRepairs = repairs.map((repair) =>
      repair.id === repairId
        ? {
            ...repair,
            estado: "entrega" as const,
            estadoEntrega: "pendiente" as const,
          }
        : repair,
    )
    setRepairs(updatedRepairs)
    localStorage.setItem("repairs", JSON.stringify(updatedRepairs))
    setIsRepairDialogOpen(false)
  }

  // Reparaciones cargadas desde Supabase para la etapa 'entrega'
  const [deliveryRepairs, setDeliveryRepairs] = useState<Repair[]>([]);
  // Reparaciones completadas para mover a entrega
  const [completedRepairs, setCompletedRepairs] = useState<Repair[]>([]);

  const filteredDeliveryRepairs = deliveryRepairs.filter((repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    const clientName = client ? `${client.nombre} ${client.apellido}` : ""

    return (
      repair.numeroIngreso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.marcaEquipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repair.nombreRetirante && repair.nombreRetirante.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (repair.apellidoRetirante && repair.apellidoRetirante.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <Package className="h-8 w-8 text-primary" />
                Entrega de Equipos
              </h1>
              <p className="text-muted-foreground">Gestione la entrega de equipos reparados</p>
            </div>

            <div className="flex gap-3">
              <Dialog open={isRepairDialogOpen} onOpenChange={setIsRepairDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <ArrowRight className="h-4 w-4" />
                    Mover desde Reparación
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Mover Equipos a Entrega</DialogTitle>
                    <DialogDescription>Seleccione equipos reparados para preparar entrega</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {completedRepairs.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay equipos reparados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedRepairs.map((repair) => {
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
                                  <div className="flex items-center gap-4 mt-1">
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-600">${repair.importe}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm text-blue-600">{repair.encargadoReparacion}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button size="sm" onClick={() => handleMoveFromRepair(repair.id)}>
                                  Preparar Entrega
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
                  placeholder="Buscar por número, equipo, cliente o retirante..."
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
                    {deliveryRepairs.filter((r) => r.estadoEntrega === "pendiente").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pendientes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {deliveryRepairs.filter((r) => r.estadoEntrega === "entregado").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Entregados</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Table */}
          <Card>
            <CardHeader>
              <CardTitle>Equipos para Entrega</CardTitle>
              <CardDescription>
                {filteredDeliveryRepairs.length} equipo{filteredDeliveryRepairs.length !== 1 ? "s" : ""} en proceso de
                entrega
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
                      <TableHead>Retirante</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Presupuesto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveryRepairs.map((repair) => {
                      const client = clients.find((c) => c.id === repair.clienteId)
                      const isDelivered = repair.estadoEntrega === "entregado"

                      return (
                        <TableRow key={repair.id}>
                          <TableCell className="font-mono font-medium">{repair.numeroIngreso}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"}
                              </p>
                              <p className="text-sm text-muted-foreground">{client?.telefono}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{repair.equipo}</p>
                              <p className="text-sm text-muted-foreground">{repair.marcaEquipo}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {repair.nombreRetirante ? (
                              <div>
                                <p className="font-medium">
                                  {repair.nombreRetirante} {repair.apellidoRetirante}
                                </p>
                                <p className="text-sm text-muted-foreground font-mono">{repair.dniRetirante}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isDelivered ? "outline" : "secondary"}>
                              {isDelivered ? "Entregado" : "Pendiente"}
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
                              <Button variant="ghost" size="icon" onClick={() => handleEditDelivery(repair)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isDelivered && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveToBilling(repair)}
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

                {filteredDeliveryRepairs.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No se encontraron entregas" : "No hay equipos para entrega"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "Intente con otros términos de búsqueda"
                        : "Mueva equipos desde reparación para preparar entregas"}
                    </p>
                    {!searchTerm && completedRepairs.length > 0 && (
                      <Button onClick={() => setIsRepairDialogOpen(true)} className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Mover desde Reparación
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delivery Form Dialog */}
      <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Entrega - {editingRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Complete la información de entrega del equipo</DialogDescription>
          </DialogHeader>

          {editingRepair && (
            <form onSubmit={handleDeliverySubmit} className="space-y-6">
              {/* Equipment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Equipo</Label>
                      <p className="text-foreground">{editingRepair.equipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Marca</Label>
                      <p className="text-foreground">{editingRepair.marcaEquipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="text-foreground">
                        {clients.find((c) => c.id === editingRepair.clienteId)?.nombre}{" "}
                        {clients.find((c) => c.id === editingRepair.clienteId)?.apellido}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Importe</Label>
                      <p className="text-foreground font-bold text-green-600">${editingRepair.importe}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cajero">Cajero/Responsable *</Label>
                      <Input
                        id="cajero"
                        value={deliveryFormData.cajero}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, cajero: e.target.value })}
                        placeholder="Nombre del cajero o responsable"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaRetiro">Fecha de Retiro</Label>
                      <Input
                        id="fechaRetiro"
                        type="date"
                        value={deliveryFormData.fechaRetiro}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, fechaRetiro: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Datos del Retirante</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombreRetirante">Nombre *</Label>
                        <Input
                          id="nombreRetirante"
                          value={deliveryFormData.nombreRetirante}
                          onChange={(e) =>
                            setDeliveryFormData({ ...deliveryFormData, nombreRetirante: e.target.value })
                          }
                          placeholder="Nombre de quien retira"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellidoRetirante">Apellido *</Label>
                        <Input
                          id="apellidoRetirante"
                          value={deliveryFormData.apellidoRetirante}
                          onChange={(e) =>
                            setDeliveryFormData({ ...deliveryFormData, apellidoRetirante: e.target.value })
                          }
                          placeholder="Apellido de quien retira"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dniRetirante">DNI del Retirante *</Label>
                      <Input
                        id="dniRetirante"
                        value={deliveryFormData.dniRetirante}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, dniRetirante: e.target.value })}
                        placeholder="12345678"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firmaRetirante">Firma/Observaciones del Retirante</Label>
                      <Textarea
                        id="firmaRetirante"
                        value={deliveryFormData.firmaRetirante}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, firmaRetirante: e.target.value })}
                        placeholder="Confirmación de recepción, observaciones, etc."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoEntrega">Estado de Entrega *</Label>
                    <select
                      id="estadoEntrega"
                      value={deliveryFormData.estadoEntrega}
                      onChange={(e) =>
                        setDeliveryFormData({
                          ...deliveryFormData,
                          estadoEntrega: e.target.value as "pendiente" | "entregado",
                        })
                      }
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      required
                    >
                      <option value="pendiente">Pendiente de Entrega</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeliveryDialogOpen(false)
                    setEditingRepair(null)
                    setDeliveryFormData({
                      cajero: currentUser?.username || "",
                      fechaRetiro: "",
                      dniRetirante: "",
                      nombreRetirante: "",
                      apellidoRetirante: "",
                      firmaRetirante: "",
                      estadoEntrega: "pendiente",
                    })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Actualizar Entrega</Button>
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
            <DialogDescription>Información completa del equipo y entrega</DialogDescription>
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
                      <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                      <p className="text-foreground">{viewingRepair.cliente?.telefono || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-foreground">{viewingRepair.cliente?.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                      <p className="text-foreground">{viewingRepair.cliente?.direccion || "N/A"}</p>
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
                      <Label className="text-sm font-medium text-muted-foreground">Importe Total</Label>
                      <p className="text-foreground text-xl font-bold text-green-600">${viewingRepair.importe}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Repair Summary */}
              {viewingRepair.encargadoReparacion && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de Reparación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Encargado</Label>
                        <p className="text-foreground">{viewingRepair.encargadoReparacion}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Armador</Label>
                        <p className="text-foreground">{viewingRepair.armador}</p>
                      </div>
                    </div>
                    {viewingRepair.diagnosticoFalla && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-muted-foreground">Diagnóstico</Label>
                        <p className="text-foreground">{viewingRepair.diagnosticoFalla}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cajero/Responsable</Label>
                      <p className="text-foreground">{viewingRepair.cajero || "Sin asignar"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                      <div className="mt-1">
                        <Badge variant={viewingRepair.estadoEntrega === "entregado" ? "outline" : "secondary"}>
                          {viewingRepair.estadoEntrega === "entregado" ? "Entregado" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {viewingRepair.nombreRetirante && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-foreground mb-3">Datos del Retirante</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
                            <p className="text-foreground">
                              {viewingRepair.nombreRetirante} {viewingRepair.apellidoRetirante}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">DNI</Label>
                            <p className="text-foreground font-mono">{viewingRepair.dniRetirante}</p>
                          </div>
                        </div>
                        {viewingRepair.firmaRetirante && (
                          <div className="mt-4">
                            <Label className="text-sm font-medium text-muted-foreground">Firma/Observaciones</Label>
                            <p className="text-foreground">{viewingRepair.firmaRetirante}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingRepair.fechaRetiro && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha de Retiro</Label>
                        <p className="text-foreground">
                          {new Date(viewingRepair.fechaRetiro).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    )}
                    {viewingRepair.fechaEntrega && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha de Entrega</Label>
                        <p className="text-foreground">
                          {new Date(viewingRepair.fechaEntrega).toLocaleDateString("es-AR")}
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
