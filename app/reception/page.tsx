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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Search, Edit, Eye, Calculator, DollarSign, ArrowRight, FileText, Printer, Trash2, ClipboardList, Calendar } from "lucide-react"

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

interface Equipment {
  id: string
  tipo_equipo: string
  marca: string
  numero_serie: string
  cantidad: number
  potencia?: string
  tension?: string
  revoluciones?: string
}

interface Repair {
  id: string
  numeroIngreso: string
  fechaIngreso: string
  recepcionista: string
  clienteId: string
  cliente?: Client
  equipos: Equipment[]
  elementosFaltantes: string
  accesorios: string
  numeroRemito: string
  numeroOrdenCompra: string
  observaciones: string
  estado: "recepcion" | "presupuesto" | "reparacion" | "entrega" | "facturacion"
  fechaCreacion: string
}

function formatFecha(fecha: string | Date): string {
  if (!fecha) return '';
  if (fecha instanceof Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  // Si viene con hora, solo tomar la parte de la fecha
  const [datePart] = fecha.split('T');
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}`;
}

export default function ReceptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [deletingRepair, setDeletingRepair] = useState<Repair | null>(null)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    clienteId: "",
    elementosFaltantes: "",
    accesorios: "",
    numeroRemito: "",
    numeroOrdenCompra: "",
    observaciones: "",
  })
  const [equipos, setEquipos] = useState([{
    equipo: "",
    marcaEquipo: "",
    numeroSerie: "",
    cantidad: "1",
    potencia: "",
    tension: "",
    revoluciones: "",
  }])
  const [clientSearch, setClientSearch] = useState("")
  const [imagenes, setImagenes] = useState<File[]>([])

  const confirmDeleteRepair = async (repairToDelete: Repair) => {
    if (!repairToDelete) {
      console.error('No se proporcionó una reparación para eliminar')
      throw new Error('No se proporcionó una reparación para eliminar')
    }
    
    try {
      console.log('Iniciando eliminación de reparación:', repairToDelete.id)
      
      // 1. Primero eliminamos los equipos asociados
      const { error: equiposError } = await supabase
        .from('equipos')
        .delete()
        .eq('reparacion_id', repairToDelete.id)
      
      if (equiposError) {
        console.error('Error al eliminar equipos:', equiposError)
        throw new Error('Error al eliminar los equipos asociados')
      }
      
      // 2. Luego eliminamos la reparación
      const { error: reparacionError } = await supabase
        .from('reparaciones')
        .delete()
        .eq('id', repairToDelete.id)
      
      if (reparacionError) {
        console.error('Error al eliminar reparación:', reparacionError)
        throw new Error('No se pudo eliminar la reparación')
      }
      
      // Actualizar el estado local inmediatamente
      setRepairs(prevRepairs => {
        const updatedRepairs = prevRepairs.filter(rep => rep.id !== repairToDelete.id)
        console.log('Reparaciones después de eliminar:', updatedRepairs.length)
        return updatedRepairs
      })
      
      // Mostrar notificación de éxito
      toast({
        title: "✅ Recepción eliminada",
        description: `La recepción ${repairToDelete.numeroIngreso} ha sido eliminada correctamente.`,
        duration: 2000
      })
      
      // Cerrar el diálogo de confirmación
      setDeletingRepair(null)
      
    } catch (error) {
      console.error('Error al eliminar:', error)
      throw error // Re-lanzar el error para manejarlo en el componente
    }
  }

  const isReceptionComplete = (repair: Repair) => {
    // Considerar completa la recepción cuando hay cliente y al menos un equipo
    // con tipo y marca. El número de serie se vuelve opcional.
    return (
      !!repair.clienteId &&
      repair.equipos.length > 0 &&
      repair.equipos.every(eq => eq.tipo_equipo && eq.marca)
    )
  }

  // Función para recargar reparaciones desde Supabase
  const fetchRepairs = async () => {
    const { data: repData, error: repError } = await supabase
      .from('reparaciones')
      .select('*')
      .eq('estado_actual', 'recepcion')
      .order('id', { ascending: true })
    if (repError) {
      console.error('Error fetching repairs:', repError)
      return
    }
    console.log('Raw repair data:', repData)
    const repairsWithEquipos = await Promise.all((repData || []).map(async (rep: any, idx: number) => {
      // Obtener TODOS los equipos de la reparación
      const { data: equipos } = await supabase
        .from('equipos')
        .select('*')
        .eq('reparacion_id', rep.id)
      let recepcionista = rep.recepcionista || ''
      if (!recepcionista && rep.creado_por) {
        const { data: user } = await supabase
          .from('personal')
          .select('nombre_completo')
          .eq('id', rep.creado_por)
          .single()
        recepcionista = user?.nombre_completo || ''
      }
      console.log('Processing repair:', rep.id, 'numero_ingreso:', rep.numero_ingreso)
      return {
        id: rep.id.toString(),
        numeroIngreso: rep.numero_ingreso,
        fechaIngreso: rep.fecha_creacion.split('T')[0],
        recepcionista,
        clienteId: rep.cliente_id.toString(),
        equipos: (equipos || []).map((eq: any) => ({
          id: eq.id.toString(),
          tipo_equipo: eq.tipo_equipo,
          marca: eq.marca,
          numero_serie: eq.numero_serie,
          cantidad: eq.cantidad || 1,
          potencia: eq.potencia,
          tension: eq.tension,
          revoluciones: eq.revoluciones,
        })),
        elementosFaltantes: rep.elementos_faltantes || '',
        accesorios: rep.accesorios || '',
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
    const equiposHtml = repair.equipos.map((equipo, idx) => `
      <div class="equipo-section">
        <h4>${equipo.tipo_equipo} - ${equipo.marca} <span class="cantidad-badge">Cantidad: ${equipo.cantidad}</span></h4>
        <div class="field"><strong>N° Serie:</strong> ${equipo.numero_serie}</div>
        <div class="field"><strong>Potencia:</strong> ${equipo.potencia || "N/A"}</div>
        <div class="field"><strong>Tensión:</strong> ${equipo.tension || "N/A"}</div>
        <div class="field"><strong>Revoluciones:</strong> ${equipo.revoluciones || "N/A"}</div>
      </div>
    `).join('')
    
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
            .equipo-section { margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
            .equipo-section h4 { margin-top: 0; color: #0056A6; font-size: 16px; }
            .cantidad-badge { background: #0056A6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 10px; }
            .field { margin-bottom: 8px; }
            .field strong { display: inline-block; width: 150px; }
            .reception-badge { background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LESELEC INGENIERÍA</div>
            <h2>Recepción de Equipos - ${repair.numeroIngreso}</h2>
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
            <h3>Información de los Equipos</h3>
            <div class="field"><strong>Fecha de Ingreso:</strong> ${new Date(repair.fechaIngreso).toLocaleDateString("es-AR")}</div>
            <div class="field"><strong>N° de Ingreso:</strong> ${repair.numeroIngreso}</div>
            ${(Array.isArray(repair.equipos) && repair.equipos.length > 0)
              ? repair.equipos.map(eq => `
                <div class="field" style="margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee;">
                  <strong>Equipo:</strong> ${eq.tipo_equipo} (x${eq.cantidad})<br/>
                  <strong>Marca:</strong> ${eq.marca}<br/>
                  <strong>N° Serie:</strong> ${eq.numero_serie}<br/>
                  <strong>Potencia:</strong> ${eq.potencia || "N/A"}<br/>
                  <strong>Tensión:</strong> ${eq.tension || "N/A"}<br/>
                  <strong>Revoluciones:</strong> ${eq.revoluciones || "N/A"}
                </div>
              `).join('')
              : `<div class="field"><strong>Equipo:</strong> -</div>`}
            <div class="field"><strong>N° Orden Compra:</strong> ${repair.numeroOrdenCompra || "N/A"}</div>
            <div class="field"><strong>Observaciones:</strong> ${repair.observaciones || "Sin observaciones"}</div>
          </div>

          <div class="section">
            <h3>Información Adicional</h3>
            <div class="field"><strong>Elementos Faltantes:</strong> ${repair.elementosFaltantes || "Ninguno"}</div>
            <div class="field"><strong>Accesorios:</strong> ${repair.accesorios || "Ninguno"}</div>
            <div class="field"><strong>N° Remito:</strong> ${repair.numeroRemito || "N/A"}</div>
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
            .select('id, nombre_completo, rol')
            .eq('correo', parsed.username)
            .single()
          setCurrentUser({
            ...parsed,
            id: personal?.id,
            nombre_completo: personal?.nombre_completo ?? parsed.nombre_completo,
            role: personal?.rol ?? parsed.role,
          })
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
    try {
      // Crear la reparación (el número de ingreso se genera automáticamente)
      // Obtener la fecha actual en formato dd/mm/aaaa
      const now = new Date();
      const fechaIngreso = formatFecha(now); // dd/mm/aaaa
      // Insertar la reparación con la fecha actual
      // Insertar la reparación con numero_ingreso vacío para que el trigger lo genere
      const { data: reparacionData, error: reparacionError } = await supabase
        .from('reparaciones')
        .insert({
          numero_ingreso: '',
          cliente_id: parseInt(formData.clienteId),
          estado_actual: 'recepcion',
          creado_por: currentUser?.id,
          elementos_faltantes: formData.elementosFaltantes,
          accesorios: formData.accesorios,
          numero_remito: formData.numeroRemito,
          numero_orden_compra: formData.numeroOrdenCompra,
          observaciones_recepcion: formData.observaciones,
          fecha_creacion: now
        })
        .select()
        .single();
      // Si el número de ingreso no viene en la respuesta, hacer un fetch por id
      let reparacionCompleta = reparacionData;
      if (!reparacionData?.numero_ingreso && reparacionData?.id) {
        const { data: reparacionFromDb } = await supabase
          .from('reparaciones')
          .select('*')
          .eq('id', reparacionData.id)
          .single();
        if (reparacionFromDb) {
          reparacionCompleta = reparacionFromDb;
        }
      }
      if (reparacionError) {
        toast({ title: 'Error al registrar recepción', description: reparacionError.message, variant: 'destructive' })
        return
      }
      
      // Insertar todos los equipos
      const equiposToInsert = equipos.map(equipo => ({
        reparacion_id: reparacionData.id,
        tipo_equipo: equipo.equipo,
        marca: equipo.marcaEquipo,
        numero_serie: equipo.numeroSerie,
        cantidad: parseInt(equipo.cantidad) || 1,
        potencia: equipo.potencia,
        tension: equipo.tension,
        revoluciones: equipo.revoluciones,
      }))
      
      const { error: errorEquipo } = await supabase.from('equipos').insert(equiposToInsert)
      if (errorEquipo) {
        toast({ title: 'Error al registrar equipos', description: errorEquipo.message, variant: 'destructive' })
        return
      }

      // Subir imágenes de recepción y guardar URLs en imagenes_recepcion
      if (imagenes.length > 0) {
        const imagenesToInsert: { reparacion_id: number; url: string }[] = []

        for (const file of imagenes) {
          const filePath = `reparacion-${reparacionData.id}/${Date.now()}-${file.name}`

          const { error: uploadError } = await supabase.storage
            .from('recepciones')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Error subiendo imagen:', uploadError)
            continue
          }

          const { data: publicData } = supabase.storage
            .from('recepciones')
            .getPublicUrl(filePath)

          if (publicData?.publicUrl) {
            imagenesToInsert.push({
              reparacion_id: reparacionData.id,
              url: publicData.publicUrl,
            })
          }
        }

        if (imagenesToInsert.length > 0) {
          const { error: insertImgError } = await supabase
            .from('imagenes_recepcion')
            .insert(imagenesToInsert)

          if (insertImgError) {
            console.error('Error guardando URLs de imágenes:', insertImgError)
          }
        }
      }
      toast({ title: 'Recepción registrada', description: `La recepción y el equipo fueron registrados correctamente. N° Ingreso: ${reparacionData.numero_ingreso}`, variant: 'default' })
      // Enviar notificación por correo al cliente (recepción registrada)
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'recepcion',
            reparacionId: reparacionData.id,
            numeroIngreso: (reparacionCompleta && reparacionCompleta.numero_ingreso) ? reparacionCompleta.numero_ingreso : reparacionData.numero_ingreso,
          }),
        })
      } catch (notifyErr) {
        console.warn('No se pudo enviar el correo de recepción:', notifyErr)
      }
      // Limpiar formulario
      setFormData({
        clienteId: "",
        elementosFaltantes: "",
        accesorios: "",
        numeroRemito: "",
        numeroOrdenCompra: "",
        observaciones: "",
      })
      setEquipos([{
        equipo: "",
        marcaEquipo: "",
        numeroSerie: "",
        cantidad: "1",
        potencia: "",
        tension: "",
        revoluciones: "",
      }])
      setImagenes([])
      setEditingRepair(null)
      setIsDialogOpen(false)
      // Agregar la nueva reparación al estado local para mostrar el número de ingreso inmediatamente
      if (reparacionCompleta && reparacionCompleta.numero_ingreso) {
        setRepairs(prev => [
          {
            id: reparacionCompleta.id.toString(),
            numeroIngreso: reparacionCompleta.numero_ingreso,
            fechaIngreso: reparacionCompleta.fecha_creacion.split('T')[0],
            recepcionista: currentUser?.nombre_completo || '',
            clienteId: formData.clienteId,
            equipos: equipos.map((eq, idx) => ({
              id: (idx+1).toString(),
              tipo_equipo: eq.equipo,
              marca: eq.marcaEquipo,
              numero_serie: eq.numeroSerie,
              cantidad: parseInt(eq.cantidad) || 1,
              potencia: eq.potencia,
              tension: eq.tension,
              revoluciones: eq.revoluciones,
            })),
            elementosFaltantes: formData.elementosFaltantes,
            accesorios: formData.accesorios,
            numeroRemito: formData.numeroRemito,
            numeroOrdenCompra: formData.numeroOrdenCompra,
            observaciones: formData.observaciones,
            estado: 'recepcion',
            fechaCreacion: reparacionCompleta.fecha_creacion,
          },
          ...prev
        ]);
      } else {
        fetchRepairs();
      }
    } catch (err: any) {
      toast({ title: 'Error inesperado', description: err.message || 'Ocurrió un error', variant: 'destructive' })
    }
  }

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair)
    setFormData({
      clienteId: repair.clienteId,
      elementosFaltantes: repair.elementosFaltantes,
      accesorios: repair.accesorios,
      numeroRemito: repair.numeroRemito,
      numeroOrdenCompra: repair.numeroOrdenCompra,
      observaciones: repair.observaciones,
    })
    // Cargar todos los equipos de la reparación
    setEquipos(repair.equipos.map(eq => ({
      equipo: eq.tipo_equipo,
      marcaEquipo: eq.marca,
      numeroSerie: eq.numero_serie,
      cantidad: eq.cantidad?.toString() || '1',
      potencia: eq.potencia || '',
      tension: eq.tension || '',
      revoluciones: eq.revoluciones || '',
    })))
    setIsDialogOpen(true)
  }

  const addEquipo = () => {
    setEquipos([...equipos, {
      equipo: "",
      marcaEquipo: "",
      numeroSerie: "",
      cantidad: "1",
      potencia: "",
      tension: "",
      revoluciones: "",
    }])
  }

  const removeEquipo = (index: number) => {
    if (equipos.length > 1) {
      setEquipos(equipos.filter((_, i) => i !== index))
    }
  }

  const updateEquipo = (index: number, field: string, value: string) => {
    const newEquipos = [...equipos]
    newEquipos[index] = { ...newEquipos[index], [field]: value }
    setEquipos(newEquipos)
  }

  const handleView = (repair: Repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    setViewingRepair({ ...repair, cliente: client })
  }

  const receptionRepairs = repairs
    .filter((repair) => repair.estado === "recepcion")
    .sort((a, b) => (a.numeroIngreso || '').localeCompare(b.numeroIngreso || '', undefined, { numeric: true }))

  const filteredRepairs = receptionRepairs.filter((repair) => {
    const client = clients.find((c) => c.id === repair.clienteId)
    const clientName = client ? `${client.nombre} ${client.apellido}` : ""
    const equiposText = repair.equipos?.map(eq => `${eq.tipo_equipo || ''} ${eq.marca || ''}`).join(' ') || ''

    return (
      (repair.numeroIngreso || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      equiposText.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                        <Input
                          id="clienteId"
                          placeholder="Buscar por nombre, email o DNI..."
                          value={formData.clienteId ? clients.find(c => c.id === formData.clienteId)?.nombre + ' ' + clients.find(c => c.id === formData.clienteId)?.apellido + ' - ' + clients.find(c => c.id === formData.clienteId)?.dniCuil : clientSearch || ''}
                          onChange={e => {
                            setClientSearch(e.target.value)
                            setFormData({ ...formData, clienteId: '' })
                          }}
                          autoComplete="off"
                        />
                        {clientSearch && (
                          <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fff', border: '1px solid #ddd', borderRadius: 6, marginTop: 4, zIndex: 100, position: 'absolute', width: '100%' }}>
                            {clients.filter(client => (
                              (client.nombre || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.apellido || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.dniCuil || '').toLowerCase().includes(clientSearch.toLowerCase())
                            )).map(client => (
                              <div
                                key={client.id}
                                style={{ padding: '8px 12px', cursor: 'pointer', background: formData.clienteId === client.id ? '#be123c' : undefined, color: formData.clienteId === client.id ? '#fff' : undefined }}
                                onClick={() => {
                                  setFormData({ ...formData, clienteId: client.id })
                                  setClientSearch('')
                                }}
                              >
                                {client.nombre} {client.apellido} - {client.dniCuil} ({client.email})
                              </div>
                            ))}
                            {clients.filter(client => (
                              (client.nombre || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.apellido || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (client.dniCuil || '').toLowerCase().includes(clientSearch.toLowerCase())
                            )).length === 0 && (
                              <div style={{ padding: '8px 12px', color: '#888' }}>No se encontraron clientes</div>
                            )}
                          </div>
                        )}
                        <input type="hidden" name="clienteId" value={formData.clienteId} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Equipment Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Equipo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Equipos</h3>
                          <Button type="button" onClick={addEquipo} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Equipo
                          </Button>
                        </div>
                        
                        {equipos.map((equipo, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Equipo {index + 1}</h4>
                              {equipos.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeEquipo(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label>Tipo de Equipo *</Label>
                                <Input
                                  value={equipo.equipo}
                                  onChange={(e) => updateEquipo(index, 'equipo', e.target.value)}
                                  placeholder="Motor, Bomba, Generador, etc."
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Marca *</Label>
                                <Input
                                  value={equipo.marcaEquipo}
                                  onChange={(e) => updateEquipo(index, 'marcaEquipo', e.target.value)}
                                  placeholder="WEG, Siemens, ABB, etc."
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Cantidad *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={equipo.cantidad}
                                  onChange={(e) => updateEquipo(index, 'cantidad', e.target.value)}
                                  placeholder="1"
                                  required
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Número de Serie</Label>
                              <Input
                                value={equipo.numeroSerie}
                                onChange={(e) => updateEquipo(index, 'numeroSerie', e.target.value)}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Potencia</Label>
                                <Input
                                  value={equipo.potencia}
                                  onChange={(e) => updateEquipo(index, 'potencia', e.target.value)}
                                  placeholder="5 HP, 3 kW, etc."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tensión</Label>
                                <Input
                                  value={equipo.tension}
                                  onChange={(e) => updateEquipo(index, 'tension', e.target.value)}
                                  placeholder="220V, 380V, etc."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Revoluciones</Label>
                                <Input
                                  value={equipo.revoluciones}
                                  onChange={(e) => updateEquipo(index, 'revoluciones', e.target.value)}
                                  placeholder="1450 RPM, 3000 RPM, etc."
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
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
                        <div className="space-y-2 pt-2">
                          <Label>Imágenes asociadas a las observaciones</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              setImagenes(files)
                            }}
                          />
                          {imagenes.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {imagenes.length} imagen(es) seleccionada(s)
                            </p>
                          )}
                        </div>
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
                          elementosFaltantes: "",
                          accesorios: "",
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
                              {formatFecha(repair.fechaIngreso)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client ? `${client.nombre} ${client.apellido}` : "Cliente no encontrado"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {repair.equipos.map((equipo, idx) => (
                                <div key={equipo.id} className="text-sm">
                                  <span className="font-medium">{equipo.tipo_equipo}</span>
                                  <span className="text-muted-foreground ml-1">(x{equipo.cantidad})</span>
                                  {idx < repair.equipos.length - 1 && <span className="text-muted-foreground">, </span>}
                                </div>
                              ))}
                              {repair.equipos.length === 0 && <span className="text-muted-foreground">Sin equipos</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {repair.equipos.map((equipo, idx) => (
                                <div key={equipo.id} className="text-sm">
                                  <span>{equipo.marca}</span>
                                  {idx < repair.equipos.length - 1 && <span className="text-muted-foreground">, </span>}
                                </div>
                              ))}
                              {repair.equipos.length === 0 && <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>{repair.recepcionista}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {isComplete ? (
                                <div className="flex gap-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está seguro de eliminar esta recepción?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se eliminará permanentemente la recepción <strong>{repair.numeroIngreso}</strong> y todos sus equipos asociados.
                                          <br /><br />
                                          <strong>Cliente:</strong> {clients.find(c => c.id === repair.clienteId)?.nombre} {clients.find(c => c.id === repair.clienteId)?.apellido}
                                          <br />
                                          <strong>Equipos:</strong> {repair.equipos.map(eq => `${eq.tipo_equipo} ${eq.marca} (x${eq.cantidad})`).join(', ')}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={async () => {
                                            try {
                                              await confirmDeleteRepair(repair)
                                            } catch (error) {
                                              console.error('Error al eliminar:', error)
                                              toast({
                                                variant: "destructive",
                                                title: "Error al eliminar",
                                                description: "No se pudo completar la eliminación. Por favor, intente nuevamente.",
                                              })
                                            }
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          title="Eliminar recepción"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Está seguro de eliminar esta recepción?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará permanentemente la recepción <strong>{repair.numeroIngreso}</strong> y todos sus equipos asociados.
                                            <br /><br />
                                            <strong>Cliente:</strong> {clients.find(c => c.id === repair.clienteId)?.nombre} {clients.find(c => c.id === repair.clienteId)?.apellido}
                                            <br />
                                            <strong>Equipos:</strong> {repair.equipos.map(eq => `${eq.tipo_equipo} ${eq.marca} (x${eq.cantidad})`).join(', ')}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={async () => {
                                              try {
                                                await confirmDeleteRepair(repair)
                                              } catch (error) {
                                                console.error('Error al eliminar:', error)
                                                toast({
                                                  variant: "destructive",
                                                  title: "Error al eliminar",
                                                  description: "No se pudo completar la eliminación. Por favor, intente nuevamente.",
                                                })
                                              }
                                            }}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Eliminar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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
                  <CardTitle className="text-lg">Información de los Equipos ({viewingRepair.equipos.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewingRepair.equipos.map((equipo, idx) => (
                    <div key={equipo.id} className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-3">
                        {equipo.tipo_equipo} - {equipo.marca} 
                        <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                          Cantidad: {equipo.cantidad}
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Número de Serie</Label>
                          <p className="text-foreground font-mono">{equipo.numero_serie}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Potencia</Label>
                          <p className="text-foreground">{equipo.potencia || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Tensión</Label>
                          <p className="text-foreground">{equipo.tension || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Revoluciones</Label>
                          <p className="text-foreground">{equipo.revoluciones || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {viewingRepair.equipos.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No hay equipos registrados</p>
                  )}
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
                        {formatFecha(viewingRepair.fechaIngreso)}
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
