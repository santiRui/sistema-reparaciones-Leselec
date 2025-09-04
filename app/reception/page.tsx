"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Eye, ClipboardList, Calendar, ArrowRight, Printer } from "lucide-react"

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
}

export default function ReceptionPage() {
  // ...
  const handleDeleteRepair = async (repairId: string) => {
    // Eliminar equipo asociado primero
    const { error: errorEquipo } = await supabase.from('equipos').delete().eq('reparacion_id', repairId)
    // Eliminar la reparación
    const { error: errorReparacion } = await supabase.from('reparaciones').delete().eq('id', repairId)
    if (errorReparacion) {
      toast({ title: 'Error al eliminar recepción', description: errorReparacion.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Recepción eliminada', description: 'La recepción y su equipo fueron eliminados correctamente.', variant: 'default' })
    // Refrescar lista
    setRepairs((prev) => prev.filter((r) => r.id !== repairId))
  }

  const router = useRouter()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    clienteId: "",
    equipo: "",
    marcaEquipo: "",
    numeroSerie: "",
    elementosFaltantes: "",
    accesorios: "",
    potencia: "",
    tension: "",
    revoluciones: "",
    numeroRemito: "",
    numeroOrdenCompra: "",
    observaciones: "",
  })
  const { toast } = useToast()

  const isReceptionComplete = (repair: Repair) => {
    return repair.clienteId && repair.equipo && repair.marcaEquipo && repair.numeroSerie
  }

  // Función para recargar reparaciones desde Supabase
  const fetchRepairs = async () => {
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
    setRepairs(repairsWithEquipos)
  }

  const moveToNextStage = async (repairId: string) => {
    // Actualizar en Supabase
    const { error } = await supabase
      .from('reparaciones')
      .update({ estado_actual: 'presupuesto', fecha_actualizacion: new Date().toISOString() })
      .eq('id', repairId)
    if (error) {
      toast({ title: 'Error al cambiar de etapa', description: error.message, variant: 'destructive' })
      return
    }
    // Refrescar lista
    fetchRepairs()
    toast({ title: 'Reparación movida a Presupuesto', variant: 'default' })
  }

  const handlePrintRepair = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    const printContent = `
      <html>
        <head>
          <title>Recepción ${repair.numeroIngreso}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0056A6; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
            .section h3 { margin-top: 0; color: #0056A6; }
            .field { margin-bottom: 8px; }
            .field strong { display: inline-block; width: 150px; }
            .reception-badge { background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LESELEC INGENIERÍA</div>
            <h2>Recepción de Equipo - ${repair.numeroIngreso}</h2>
            <span class="reception-badge">RECEPCIÓN</span>
          </div>
          
          <div class="section">
            <h3>Información del Cliente</h3>
            <div class="field"><strong>Cliente:</strong> ${client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"}</div>
            <div class="field"><strong>DNI/CUIL:</strong> ${client?.dniCuil || "N/A"}</div>
            <div class="field"><strong>Tipo:</strong> ${client?.tipoCliente || "N/A"}</div>
            <div class="field"><strong>Teléfono:</strong> ${client?.telefono || "N/A"}</div>
            <div class="field"><strong>Email:</strong> ${client?.email || "N/A"}</div>
            <div class="field"><strong>Dirección:</strong> ${client?.direccion || "N/A"}</div>
          </div>

          <div class="section">
            <h3>Información del Equipo</h3>
            <div class="field"><strong>Fecha de Ingreso:</strong> ${new Date(repair.fechaIngreso).toLocaleDateString("es-AR")}</div>
            <div class="field"><strong>N° de Ingreso:</strong> ${repair.numeroIngreso}</div>
            <div class="field"><strong>Recepcionista:</strong> ${repair.recepcionista}</div>
            <div class="field"><strong>Equipo:</strong> ${repair.equipo}</div>
            <div class="field"><strong>Marca:</strong> ${repair.marcaEquipo}</div>
            <div class="field"><strong>N° Serie:</strong> ${repair.numeroSerie}</div>
            <div class="field"><strong>Potencia:</strong> ${repair.potencia || "N/A"}</div>
            <div class="field"><strong>Tensión:</strong> ${repair.tension || "N/A"}</div>
            <div class="field"><strong>Revoluciones:</strong> ${repair.revoluciones || "N/A"}</div>
          </div>

          <div class="section">
            <h3>Información Adicional</h3>
            <div class="field"><strong>Elementos Faltantes:</strong> ${repair.elementosFaltantes || "Ninguno"}</div>
            <div class="field"><strong>Accesorios:</strong> ${repair.accesorios || "Ninguno"}</div>
            <div class="field"><strong>N° Remito:</strong> ${repair.numeroRemito || "N/A"}</div>
            <div class="field"><strong>N° Orden Compra:</strong> ${repair.numeroOrdenCompra || "N/A"}</div>
            <div class="field"><strong>Observaciones:</strong> ${repair.observaciones || "Sin observaciones"}</div>
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

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("user")
    if (userData) {
      const parsed = JSON.parse(userData)
      // Si no tiene id, buscarlo en Supabase por correo
      if (!parsed.id && parsed.username) {
        const fetchUserId = async () => {
          const { data: personal } = await supabase
            .from('personal')
            .select('id')
            .eq('correo', parsed.username)
            .single()
          setCurrentUser({ ...parsed, id: personal?.id })
        }
        fetchUserId()
      } else {
        setCurrentUser(parsed)
      }
    }

    // Load clients desde Supabase
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('apellido', { ascending: true })
      if (!error) {
        setClients(
          (data || []).map((c: any) => ({
            id: c.id.toString(),
            nombre: c.nombre,
            apellido: c.apellido,
            dniCuil: c.dni_cuil,
            tipoCliente: c.tipo_cliente,
            telefono: c.telefono,
            email: c.email,
            direccion: c.direccion,
          }))
        )
      }
    }
    fetchClients()
    

    // Cargar reparaciones en etapa 'recepcion' desde Supabase
    const fetchRepairs = async () => {
      const { data: repData, error: repError } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'recepcion')
        .order('id', { ascending: true })
      if (repError) return
      // Para cada reparación, obtener equipo asociado
      const repairsWithEquipos = await Promise.all((repData || []).map(async (rep: any, idx: number) => {
        const { data: equipo } = await supabase
          .from('equipos')
          .select('*')
          .eq('reparacion_id', rep.id)
          .single()
        let recepcionista = ''
        console.log('creado_por:', rep.creado_por)
        if (rep.creado_por) {
          const { data: user } = await supabase
            .from('personal')
            .select('nombre_completo')
            .eq('id', rep.creado_por)
            .single()
          console.log('user encontrado:', user)
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
      setRepairs(repairsWithEquipos)
    }
    fetchRepairs()

  }, [router])

  const generateRepairNumber = () => {
    const year = new Date().getFullYear()
    const count = repairs.length + 1
    return `R-${year}-${count.toString().padStart(3, "0")}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id) {
      toast({
        title: 'Error de sesión',
        description: 'No se pudo identificar el usuario. Por favor, cierre sesión y vuelva a ingresar.',
        variant: 'destructive',
      })
      return
    }
    // Insertar en reparaciones
    const { data: reparacion, error: errorReparacion } = await supabase.from('reparaciones').insert({
      cliente_id: formData.clienteId,
      estado_actual: 'recepcion',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      creado_por: currentUser.id,
      elementos_faltantes: formData.elementosFaltantes,
      accesorios: formData.accesorios,
      numero_remito: formData.numeroRemito,
      numero_orden_compra: formData.numeroOrdenCompra,
      observaciones_recepcion: formData.observaciones,
    }).select('id').single()
    if (errorReparacion) {
      toast({ title: 'Error al registrar recepción', description: errorReparacion.message, variant: 'destructive' })
      return
    }
    // Insertar en equipos
    const { error: errorEquipo } = await supabase.from('equipos').insert({
      reparacion_id: reparacion.id,
      tipo_equipo: formData.equipo,
      marca: formData.marcaEquipo,
      numero_serie: formData.numeroSerie,
      potencia: formData.potencia,
      tension: formData.tension,
      revoluciones: formData.revoluciones,
    })
    if (errorEquipo) {
      toast({ title: 'Error al registrar equipo', description: errorEquipo.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Recepción registrada', description: 'La recepción y el equipo fueron registrados correctamente.', variant: 'default' })
    // Limpiar formulario
    setFormData({
      clienteId: "",
      equipo: "",
      marcaEquipo: "",
      numeroSerie: "",
      elementosFaltantes: "",
      accesorios: "",
      potencia: "",
      tension: "",
      revoluciones: "",
      numeroRemito: "",
      numeroOrdenCompra: "",
      observaciones: "",
    })
    setEditingRepair(null)
    setIsDialogOpen(false)
    // Opcional: recargar reparaciones desde Supabase
  }

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair)
    setFormData({
      clienteId: repair.clienteId,
      equipo: repair.equipo,
      marcaEquipo: repair.marcaEquipo,
      numeroSerie: repair.numeroSerie,
      elementosFaltantes: repair.elementosFaltantes,
      accesorios: repair.accesorios,
      potencia: repair.potencia,
      tension: repair.tension,
      revoluciones: repair.revoluciones,
      numeroRemito: repair.numeroRemito,
      numeroOrdenCompra: repair.numeroOrdenCompra,
      observaciones: repair.observaciones,
    })
    setIsDialogOpen(true)
  }

  const handleView = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    setViewingRepair({ ...repair, cliente: client })
  }

  const receptionRepairs = repairs.filter((repair) => repair.estado === "recepcion")

  const filteredRepairs = receptionRepairs.filter((repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    const clientName = client ? `${client.nombre} ${client.apellido}` : ""

    return (
      repair.numeroIngreso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.marcaEquipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  console.log('currentUser:', currentUser)
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-primary" />
                Recepción de Equipos
              </h1>
              <p className="text-muted-foreground">Registre nuevos equipos para reparación</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Recepción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRepair ? "Editar Recepción" : "Nueva Recepción"}</DialogTitle>
                  <DialogDescription>
                    {editingRepair ? "Modifique los datos de la recepción" : "Ingrese los datos del equipo recibido"}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Client Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="clienteId">Cliente *</Label>
                        <Select
                          value={formData.clienteId}
                          onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.nombre} {client.apellido} - {client.dniCuil}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Equipment Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Equipo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="equipo">Tipo de Equipo *</Label>
                          <Input
                            id="equipo"
                            value={formData.equipo}
                            onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
                            placeholder="Motor, Bomba, Generador, etc."
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="marcaEquipo">Marca *</Label>
                          <Input
                            id="marcaEquipo"
                            value={formData.marcaEquipo}
                            onChange={(e) => setFormData({ ...formData, marcaEquipo: e.target.value })}
                            placeholder="WEG, Siemens, ABB, etc."
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="numeroSerie">Número de Serie *</Label>
                        <Input
                          id="numeroSerie"
                          value={formData.numeroSerie}
                          onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="potencia">Potencia</Label>
                          <Input
                            id="potencia"
                            value={formData.potencia}
                            onChange={(e) => setFormData({ ...formData, potencia: e.target.value })}
                            placeholder="5 HP, 3 kW, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tension">Tensión</Label>
                          <Input
                            id="tension"
                            value={formData.tension}
                            onChange={(e) => setFormData({ ...formData, tension: e.target.value })}
                            placeholder="220V, 380V, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="revoluciones">Revoluciones</Label>
                          <Input
                            id="revoluciones"
                            value={formData.revoluciones}
                            onChange={(e) => setFormData({ ...formData, revoluciones: e.target.value })}
                            placeholder="1450 RPM, 3000 RPM, etc."
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información Adicional</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="elementosFaltantes">Elementos Faltantes</Label>
                        <Textarea
                          id="elementosFaltantes"
                          value={formData.elementosFaltantes}
                          onChange={(e) => setFormData({ ...formData, elementosFaltantes: e.target.value })}
                          placeholder="Describa elementos faltantes o indique 'Ninguno'"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accesorios">Accesorios</Label>
                        <Textarea
                          id="accesorios"
                          value={formData.accesorios}
                          onChange={(e) => setFormData({ ...formData, accesorios: e.target.value })}
                          placeholder="Cables, manuales, herramientas, etc."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numeroRemito">Número de Remito</Label>
                          <Input
                            id="numeroRemito"
                            value={formData.numeroRemito}
                            onChange={(e) => setFormData({ ...formData, numeroRemito: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numeroOrdenCompra">Número de Orden de Compra</Label>
                          <Input
                            id="numeroOrdenCompra"
                            value={formData.numeroOrdenCompra}
                            onChange={(e) => setFormData({ ...formData, numeroOrdenCompra: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="observaciones">Observaciones</Label>
                        <Textarea
                          id="observaciones"
                          value={formData.observaciones}
                          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                          placeholder="Describa el problema reportado, estado del equipo, etc."
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
                        setIsDialogOpen(false)
                        setEditingRepair(null)
                        setFormData({
                          clienteId: "",
                          equipo: "",
                          marcaEquipo: "",
                          numeroSerie: "",
                          elementosFaltantes: "",
                          accesorios: "",
                          potencia: "",
                          tension: "",
                          revoluciones: "",
                          numeroRemito: "",
                          numeroOrdenCompra: "",
                          observaciones: "",
                        })
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">{editingRepair ? "Actualizar" : "Registrar Recepción"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
                  <div className="text-2xl font-bold text-primary">{receptionRepairs.length}</div>
                  <div className="text-sm text-muted-foreground">En Recepción</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repairs Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Equipos en Recepción</CardTitle>
              <CardDescription>
                {filteredRepairs.length} equipo{filteredRepairs.length !== 1 ? "s" : ""} en recepción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Ingreso</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Recepcionista</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepairs.map((repair) => {
                      const client = clients.find((c) => c.id === repair.clienteId)
                      const isComplete = isReceptionComplete(repair)
                      return (
                        <TableRow key={repair.id}>
                          <TableCell className="font-mono font-medium">{repair.numeroIngreso}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(repair.fechaIngreso).toLocaleDateString("es-AR")}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"}
                          </TableCell>
                          <TableCell>{repair.equipo}</TableCell>
                          <TableCell>{repair.marcaEquipo}</TableCell>
                          <TableCell>{repair.recepcionista}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {isComplete ? (
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handlePrintRepair(repair)}>
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" onClick={() => moveToNextStage(repair.id)} className="gap-2">
                                    <ArrowRight className="h-4 w-4" />
                                    Pasar a Presupuesto
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleView(repair)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(repair)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {['admin', 'encargado'].includes(currentUser?.role) && (
                                    <>
                                      <span style={{color: 'red', fontWeight: 'bold'}}>BOTÓN AQUÍ</span>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        title="Eliminar recepción"
                                        onClick={() => handleDeleteRepair(repair.id)}
                                      >
                                        🗑️
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {filteredRepairs.length === 0 && (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No se encontraron recepciones" : "No hay equipos en recepción"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "Intente con otros términos de búsqueda"
                        : "Comience registrando la primera recepción"}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Recepción
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Repair Dialog */}
      <Dialog open={!!viewingRepair} onOpenChange={() => setViewingRepair(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Recepción - {viewingRepair?.numeroIngreso}</DialogTitle>
            <DialogDescription>Información completa del equipo recibido</DialogDescription>
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
                      <Label className="text-sm font-medium text-muted-foreground">DNI/CUIL</Label>
                      <p className="text-foreground font-mono">{viewingRepair.cliente?.dniCuil || "N/A"}</p>
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
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tensión</Label>
                      <p className="text-foreground">{viewingRepair.tension || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Revoluciones</Label>
                      <p className="text-foreground">{viewingRepair.revoluciones || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Adicional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Elementos Faltantes</Label>
                    <p className="text-foreground">{viewingRepair.elementosFaltantes || "Ninguno"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Accesorios</Label>
                    <p className="text-foreground">{viewingRepair.accesorios || "Ninguno"}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">N° Remito</Label>
                      <p className="text-foreground font-mono">{viewingRepair.numeroRemito || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">N° Orden de Compra</Label>
                      <p className="text-foreground font-mono">{viewingRepair.numeroOrdenCompra || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Observaciones</Label>
                    <p className="text-foreground">{viewingRepair.observaciones || "Sin observaciones"}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</Label>
                      <p className="text-foreground">
                        {new Date(viewingRepair.fechaIngreso).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Recepcionista</Label>
                      <p className="text-foreground">{viewingRepair.recepcionista}</p>
                    </div>
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
