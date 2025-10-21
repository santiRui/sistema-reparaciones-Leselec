"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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
import { Search, Edit, Eye, Package, DollarSign, ArrowRight, FileText, User, Printer, CheckCircle2 } from "lucide-react"

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
  id: string;
  tipo_equipo: string;
  marca: string;
  numero_serie: string;
  cantidad: number;
  potencia?: string;
  tension?: string;
  revoluciones?: string;
}

interface Repair {
  id: string
  numeroIngreso: string
  fechaIngreso: string
  recepcionista: string
  clienteId: string
  cliente?: Client
  equipos: Equipment[]
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
  seña?: string
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
    estadoEntrega: "pendiente" as "pendiente" | "entregado",
  })
  const { toast } = useToast()
  // Flags de pago editables por cajero en el formulario
  const [paymentFlags, setPaymentFlags] = useState({ diagnosticoAbonado: false, seniaAbonada: false })

  // Cargar reparaciones en etapa 'entrega' desde Supabase y combinar con datos de entregas
  const loadDeliveryRepairs = async () => {
    const { data, error } = await supabase
      .from('reparaciones')
      .select('*')
      .eq('estado_actual', 'entrega')
    if (error) {
      console.error('Error cargando reparaciones para entrega:', error)
    } else if (data) {
      // Traer todas las entregas de una sola vez
      const { data: entregas } = await supabase
        .from('entregas')
        .select('*')
      // Buscar datos de cliente y equipo para cada reparación
      const repairsWithDetails = await Promise.all((data || []).map(async (rep: any, idx: number) => {
        // Obtener TODOS los equipos de la reparación
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
        // Buscar entrega correspondiente
        const entrega = entregas?.find((e: any) => e.reparacion_id === rep.id) || {};
        return {
          id: rep.id.toString(),
          numeroIngreso: rep.numero_ingreso,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          recepcionista: '',
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
          equipo: equipos && equipos[0] ? equipos[0].tipo_equipo : '',
          marcaEquipo: equipos && equipos[0] ? equipos[0].marca : '',
          numeroSerie: equipos && equipos[0] ? equipos[0].numero_serie : '',
          elementosFaltantes: rep.elementos_faltantes || '',
          accesorios: rep.accesorios || '',
          potencia: equipos && equipos[0] ? equipos[0].potencia : '',
          tension: equipos && equipos[0] ? equipos[0].tension : '',
          revoluciones: equipos && equipos[0] ? equipos[0].revoluciones : '',
          numeroRemito: rep.numero_remito || '',
          numeroOrdenCompra: rep.numero_orden_compra || '',
          observaciones: rep.observaciones_recepcion || '',
          estado: rep.estado_actual,
          fechaCreacion: rep.fecha_creacion,
          diagnosticoFalla: presupuesto?.diagnostico_falla || '',
          descripcionProceso: presupuesto?.descripcion_proceso || '',
          repuestos: presupuesto?.repuestos_necesarios || '',
          diagnostico: typeof presupuesto?.diagnostico === 'number' ? presupuesto.diagnostico.toString() : '',
          importe: presupuesto?.importe_total ? presupuesto.importe_total.toString() : '',
          rechazoPresupuesto: presupuesto?.rechazado === true,
          diagnosticoAbonado: presupuesto?.diagnostico_abonado === true,
          seniaAbonada: (presupuesto as any)?.senia_abonada === true || (presupuesto as any)?.["seña_abonada"] === true,
          encargadoReparacion: trabajo?.encargado_reparacion || '',
          armador: trabajo?.armador || '',
          observacionesReparacion: trabajo?.observaciones_reparacion || '',
          estadoReparacion: trabajo?.estado_reparacion || 'pendiente',
          // Datos de entrega combinados
          cajero: entrega.cajero_id || '',
          fechaRetiro: entrega.fecha_retiro || '',
          dniRetirante: entrega.dni_retirante || '',
          nombreRetirante: entrega.nombre_retirante || '',
          apellidoRetirante: entrega.apellido_retirante || '',
          estadoEntrega: entrega.estado_entrega || 'pendiente',
          fechaEntrega: rep.fecha_entrega || '',
        };
      }));
      // Mostrar solo entregas en proceso (no las ya entregadas)
      setDeliveryRepairs((repairsWithDetails as any[]).filter((r) => r.estadoEntrega !== 'entregado'));
    }

  // Marcar seña como pagada manualmente (cajero)
  const handleMarkSeniaPaid = async (repair: Repair) => {
    // Buscar último presupuesto y marcar seña_abonada = true
    const { data: lastPres, error } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('reparacion_id', Number(repair.id))
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error || !lastPres?.id) {
      toast({ variant: 'destructive', title: 'No se pudo marcar la seña', description: 'No se encontró presupuesto para esta reparación.' })
      return;
    }
    const { error: updErr } = await supabase
      .from('presupuestos')
      .update({ senia_abonada: true })
      .eq('id', lastPres.id);
    if (updErr) {
      toast({ variant: 'destructive', title: 'No se pudo marcar la seña', description: updErr.message })
      return;
    }
    // Refrescar lista y estado local
    setDeliveryRepairs(prev => prev.map((r) => r.id === repair.id ? ({ ...r, seniaAbonada: true } as any) : r))
    toast({ title: 'Seña marcada como pagada', description: `Reparación ${repair.numeroIngreso}` })
  }
  };

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

    loadDeliveryRepairs();

    // Cargar reparaciones completadas para mover a entrega
    const loadCompletedRepairs = async () => {
      const { data, error } = await supabase
        .from('reparaciones')
        .select('*')
        .eq('estado_actual', 'reparacion')
      if (error) {
        console.error('Error cargando reparaciones completadas:', error)
      } else if (data) {
        // Buscar sólo las que tienen estadoReparacion 'completada' en trabajos_reparacion
        const completed = [];
        for (const rep of data) {
          const { data: trabajo } = await supabase
            .from('trabajos_reparacion')
            .select('*')
            .eq('reparacion_id', rep.id)
            .single();
          if (trabajo && trabajo.estado_reparacion === 'completada') {
            // Buscar cliente y equipo
            const { data: equipo } = await supabase
              .from('equipos')
              .select('*')
              .eq('reparacion_id', rep.id)
              .single();
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
            completed.push({
              id: rep.id.toString(),
              numeroIngreso: `R-${new Date(rep.fecha_creacion).getFullYear()}-${(completed.length+1).toString().padStart(3, '0')}`,
              fechaIngreso: rep.fecha_creacion.split('T')[0],
              recepcionista: '',
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
              equipos: equipo ? [{ id: String(equipo.id || rep.id), tipo_equipo: equipo.tipo_equipo, marca: equipo.marca, numero_serie: equipo.numero_serie, cantidad: Number(equipo.cantidad || 1), potencia: equipo.potencia, tension: equipo.tension, revoluciones: equipo.revoluciones }] : [],
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
              diagnosticoFalla: presupuesto?.diagnostico_falla || '',
              descripcionProceso: presupuesto?.descripcion_proceso || '',
              repuestos: presupuesto?.repuestos_necesarios || '',
              importe: presupuesto?.importe_total ? presupuesto.importe_total.toString() : '',
              rechazoPresupuesto: presupuesto?.rechazado === true,
              diagnosticoAbonado: presupuesto?.diagnostico_abonado === true,
              seniaAbonada: (presupuesto as any)?.senia_abonada === true || (presupuesto as any)?.["seña_abonada"] === true,
              encargadoReparacion: trabajo?.encargado_reparacion || '',
              armador: trabajo?.armador || '',
              observacionesReparacion: trabajo?.observaciones_reparacion || '',
              estadoReparacion: trabajo?.estado_reparacion || 'pendiente',
            });
          }
        }
        setCompletedRepairs(completed);
      }
    };

    loadDeliveryRepairs();
    loadCompletedRepairs();
  }, [router])

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRepair) return

    const isComplete = (
      (deliveryFormData.cajero?.trim() || "") !== "" &&
      (deliveryFormData.fechaRetiro?.trim() || "") !== "" &&
      (deliveryFormData.nombreRetirante?.trim() || "") !== "" &&
      (deliveryFormData.apellidoRetirante?.trim() || "") !== "" &&
      (deliveryFormData.dniRetirante?.trim() || "") !== "" &&
      deliveryFormData.estadoEntrega === 'entregado'
    )

    // Persistir flags de pago en el último presupuesto (si existen cambios)
    try {
      const { data: lastPres } = await supabase
        .from('presupuestos')
        .select('id')
        .eq('reparacion_id', Number(editingRepair.id))
        .order('id', { ascending: false })
        .limit(1)
        .single();
      if (lastPres?.id) {
        await supabase
          .from('presupuestos')
          .update({ diagnostico_abonado: paymentFlags.diagnosticoAbonado })
          .eq('id', lastPres.id);
        // actualizar estado local de la lista
        setDeliveryRepairs(prev => prev.map((r) => r.id === editingRepair.id ? ({ ...r, diagnosticoAbonado: paymentFlags.diagnosticoAbonado } as any) : r))
      }
    } catch {}

    // Guardar en tabla entregas
    const { error: entregaError } = await supabase
      .from('entregas')
      .upsert([
        {
          reparacion_id: Number(editingRepair.id),
          cajero_id: currentUser?.id || null,
          fecha_retiro: deliveryFormData.fechaRetiro || null,
          nombre_retirante: deliveryFormData.nombreRetirante,
          apellido_retirante: deliveryFormData.apellidoRetirante,
          dni_retirante: deliveryFormData.dniRetirante,
          estado_entrega: deliveryFormData.estadoEntrega,
        }
      ], { onConflict: 'reparacion_id' })
    if (entregaError) {
      toast({ variant: 'destructive', title: 'Error guardando entrega', description: entregaError.message })
      return
    }

    if (isComplete) {
      // Validar si proviene de rechazo: diagnóstico debe estar abonado
      if ((editingRepair as any).rechazoPresupuesto && !paymentFlags.diagnosticoAbonado) {
        toast({ variant: 'destructive', title: 'No se puede finalizar', description: 'Debe estar abonado el diagnóstico para finalizar esta entrega.' })
        return
      }
      // Validar si proviene de rechazo: seña debe estar abonada
      if ((editingRepair as any).rechazoPresupuesto && !(editingRepair as any).seniaAbonada) {
        toast({ variant: 'destructive', title: 'No se puede finalizar', description: 'Debe estar abonada la seña para finalizar esta entrega.' })
        return
      }

      // Marcar entrega como entregada y reparación como finalizada
      await supabase
        .from('entregas')
        .update({ estado_entrega: 'entregado' })
        .eq('reparacion_id', Number(editingRepair.id))

      await supabase
        .from('reparaciones')
        .update({ estado_actual: 'finalizada', fecha_entrega: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() })
        .eq('id', Number(editingRepair.id))
    } else {
      // Mantener en entrega si aún no está completo
      await supabase
        .from('reparaciones')
        .update({ estado_actual: 'entrega', fecha_actualizacion: new Date().toISOString() })
        .eq('id', Number(editingRepair.id))
    }

    // Opcional: actualizar fecha_entrega en reparaciones
    await supabase
      .from('reparaciones')
      .update({ fecha_entrega: new Date().toISOString() })
      .eq('id', Number(editingRepair.id));
    // Recargar lista y datos del formulario
    await loadDeliveryRepairs();
    if (isComplete) {
      // Remover optimistamente de la lista local de entregas en proceso
      setDeliveryRepairs(prev => prev.filter((r) => r.id !== editingRepair.id))
    }
    if (editingRepair) {
      // Buscar en entregas datos actualizados
      const { data: entrega } = await supabase
        .from('entregas')
        .select('*')
        .eq('reparacion_id', Number(editingRepair.id))
        .single();
      setDeliveryFormData({
        cajero: currentUser?.username || "",
        fechaRetiro: entrega?.fecha_retiro || "",
        dniRetirante: entrega?.dni_retirante || "",
        nombreRetirante: entrega?.nombre_retirante || "",
        apellidoRetirante: entrega?.apellido_retirante || "",
        estadoEntrega: entrega?.estado_entrega || "pendiente",
      });
    }
    setEditingRepair(null)
    setIsDeliveryDialogOpen(false)
    toast({ title: isComplete ? 'Entrega finalizada' : 'Entrega actualizada', description: isComplete ? 'La reparación pasó a Entregas finalizadas.' : 'Datos de entrega guardados.' })
  }

  const handleMoveToBilling = (repair: Repair) => {
    const updatedRepair = { ...repair, estado: "facturacion" as const }
    const updatedRepairs = repairs.map((r) => (r.id === repair.id ? updatedRepair : r))
    setRepairs(updatedRepairs)
    localStorage.setItem("repairs", JSON.stringify(updatedRepairs))
  }

  const handleEditDelivery = async (repair: Repair) => {
    // Buscar en entregas
    const { data: entrega } = await supabase
      .from('entregas')
      .select('*')
      .eq('reparacion_id', repair.id)
      .single();
    setEditingRepair(repair)
    setDeliveryFormData({
      cajero: currentUser?.username || "",
      fechaRetiro: entrega?.fecha_retiro || "",
      dniRetirante: entrega?.dni_retirante || "",
      nombreRetirante: entrega?.nombre_retirante || "",
      apellidoRetirante: entrega?.apellido_retirante || "",
      estadoEntrega: entrega?.estado_entrega || "pendiente",
    })
    setPaymentFlags({
      diagnosticoAbonado: (repair as any).diagnosticoAbonado === true,
      seniaAbonada: (repair as any).seniaAbonada === true,
    })
    setIsDeliveryDialogOpen(true)
  }

  const handleView = (repair: Repair) => {
    setViewingRepair({ ...repair, cliente: repair.cliente })
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

  // Mover a reparaciones finalizadas
  const handleMoveToCompleted = async (repair: Repair) => {
    // Actualizar estado en la base de datos (puede ser un campo 'finalizada' en entregas o reparaciones)
    await supabase
      .from('reparaciones')
      .update({ estado_actual: 'finalizada', fecha_actualizacion: new Date().toISOString() })
      .eq('id', repair.id);
    // Recargar lista automáticamente
    await loadDeliveryRepairs();
  };

  // Imprimir entrega
  const handlePrintDelivery = (repair: Repair) => {
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
              font-size: 20px;
              font-weight: bold;
              color: #0056A6;
            }
            .badge {
              background: #2d8f5a;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;
              margin-left: 8px;
            }
            .section {
              margin-bottom: 8px;
              border: 1px solid #ddd;
              padding: 7px 10px;
              border-radius: 5px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin-top: 0;
              margin-bottom: 5px;
              font-size: 14px;
              color: #0056A6;
            }
            .fields {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
            }
            .field {
              flex: 1 1 180px;
              margin-bottom: 4px;
              min-width: 140px;
            }
            .field strong {
              display: inline-block;
              width: 110px;
              font-size: 11px;
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
            <div class="field"><strong>Fecha de Ingreso:</strong> ${new Date(repair.fechaIngreso).toLocaleDateString("es-AR")}</div>
            <div class="field"><strong>Recepcionista:</strong> ${repair.recepcionista || '-'}</div>
            <div class="field"><strong>Observaciones de Recepción:</strong> ${repair.observaciones || '-'}</div>
          </div>
          <div class="section">
            <h3>Información del Cliente</h3>
            <div class="field"><strong>Cliente:</strong> ${repair.cliente ? `${repair.cliente.nombre} ${repair.cliente.apellido}` : "Cliente no encontrado"}</div>
            <div class="field"><strong>DNI/CUIL:</strong> ${repair.cliente?.dniCuil || "N/A"}</div>
            <div class="field"><strong>Tipo:</strong> ${repair.cliente?.tipoCliente || "N/A"}</div>
            <div class="field"><strong>Teléfono:</strong> ${repair.cliente?.telefono || "N/A"}</div>
            <div class="field"><strong>Email:</strong> ${repair.cliente?.email || "N/A"}</div>
            <div class="field"><strong>Dirección:</strong> ${repair.cliente?.direccion || "N/A"}</div>
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
            <div class="field"><strong>Diagnóstico de Falla:</strong> ${repair.diagnosticoFalla || '-'}</div>
            <div class="field"><strong>Descripción del Proceso:</strong> ${repair.descripcionProceso || '-'}</div>
            <div class="field"><strong>Repuestos:</strong> ${repair.repuestos || '-'}</div>
            <div class="field"><strong>Importe Total:</strong> <b style='color:green;'>$
              ${repair.importe ? Number(repair.importe).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </b></div>
            <div class="field"><strong>Seña:</strong> <b style='color:blue;'>$
              ${repair.seña ? Number(repair.seña).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </b></div>
          </div>
          <div class="section">
            <h3>Reparación</h3>
            <div class="field"><strong>Encargado:</strong> ${repair.encargadoReparacion || '-'}</div>
            <div class="field"><strong>Armador:</strong> ${repair.armador || '-'}</div>
            <div class="field"><strong>Estado Reparación:</strong> ${repair.estadoReparacion || '-'}</div>
            <div class="field"><strong>Observaciones Reparación:</strong> ${repair.observacionesReparacion || '-'}</div>
          </div>
          <div class="section">
            <h3>Entrega</h3>
            <div class="field"><strong>Nombre Retirante:</strong> ${repair.nombreRetirante || "-"} ${repair.apellidoRetirante || "-"}</div>
            <div class="field"><strong>DNI Retirante:</strong> ${repair.dniRetirante || "-"}</div>
            <div class="field"><strong>Fecha de Retiro:</strong> ${repair.fechaRetiro ? new Date(repair.fechaRetiro).toLocaleDateString("es-AR") : "-"}</div>
            <div class="field"><strong>Estado de Entrega:</strong> ${repair.estadoEntrega === "entregado" ? "Entregado" : "Pendiente"}</div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Finalizar entrega
  const handleFinalizeDelivery = async (repair: Repair) => {
    // Validar que diagnóstico esté abonado si la entrega proviene de rechazo
    if ((repair as any).rechazoPresupuesto && !(repair as any).diagnosticoAbonado) {
      toast({
        variant: 'destructive',
        title: 'No se puede entregar',
        description: 'Debe estar abonado el diagnóstico para entregar una reparación con presupuesto rechazado.',
      })
      return;
    }
    // Actualizar estado_entrega a 'entregado' en la tabla entregas
    await supabase
      .from('entregas')
      .update({ estado_entrega: 'entregado' })
      .eq('reparacion_id', repair.id);
    // Opcional: actualizar fecha_entrega en reparaciones
    await supabase
      .from('reparaciones')
      .update({ fecha_entrega: new Date().toISOString() })
      .eq('id', repair.id);
    // Recargar lista para que desaparezca del módulo actual
    await loadDeliveryRepairs();
    toast({ title: 'Entrega finalizada', description: 'El equipo fue marcado como entregado.' })
  };

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
                      <TableHead>Diagnóstico</TableHead>
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
                              <p className="font-medium">{repair.cliente ? `${repair.cliente.nombre} ${repair.cliente.apellido}` : "Cliente no encontrado"}</p>
                              <p className="text-sm text-muted-foreground">{repair.cliente?.telefono || ""}</p>
                              <p className="text-xs text-muted-foreground">{repair.cliente?.email || ""}</p>
                              <p className="text-xs text-muted-foreground">{repair.cliente?.direccion || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {Array.isArray(repair.equipos) && repair.equipos.length > 0
                                ? repair.equipos.map((eq, idx) => (
                                    <div key={eq.id || idx} style={{ fontWeight: 500, marginBottom: 2 }}>
                                      {eq.tipo_equipo} <span style={{ color: '#666', fontWeight: 400 }}>(x{eq.cantidad})</span>
                                    </div>
                                  ))
                                : repair.equipo}
                            </div>
                          </TableCell>
                          <TableCell>
                            {repair.nombreRetirante || repair.apellidoRetirante ? (
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
                            {(repair as any).rechazoPresupuesto ? (
                              <Badge variant="destructive">Presupuesto rechazado</Badge>
                            ) : (
                              <Badge variant="secondary">Curso normal</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {repair.importe && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">${repair.importe}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {(repair as any).diagnosticoAbonado ? (
                              <Badge variant="outline" className="text-green-700 border-green-600">Abonado</Badge>
                            ) : (
                              <Badge variant="secondary">Pendiente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" title="Imprimir datos" onClick={() => handlePrintDelivery(repair)}>
                                <Printer className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleView(repair)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditDelivery(repair)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {repair.estadoEntrega === "entregado" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveToCompleted(repair)}
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
                        {editingRepair?.cliente ? `${editingRepair.cliente.nombre} ${editingRepair.cliente.apellido}` : "Cliente no encontrado"}
                      </p>
                      <p className="text-xs text-muted-foreground">{editingRepair?.cliente?.telefono || ""}</p>
                      <p className="text-xs text-muted-foreground">{editingRepair?.cliente?.email || ""}</p>
                      <p className="text-xs text-muted-foreground">{editingRepair?.cliente?.direccion || ""}</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Diagnóstico abonado</Label>
                        <div className="flex items-center gap-3">
                          <input
                            id="diagnosticoAbonado"
                            type="checkbox"
                            checked={paymentFlags.diagnosticoAbonado}
                            onChange={(e) => setPaymentFlags((p) => ({ ...p, diagnosticoAbonado: e.target.checked }))}
                          />
                          <span className="text-sm text-muted-foreground">Marca si el cliente abonó el diagnóstico presencialmente</span>
                        </div>
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
                      estadoEntrega: "pendiente",
                    })
                  }}
                >
                  Cancelar
                </Button>
                {/* Botón dinámico: si formulario completo, finalizar; si no, actualizar */}
                <Button type="submit">
                  {(
                    (deliveryFormData.cajero?.trim() || "") !== "" &&
                    (deliveryFormData.fechaRetiro?.trim() || "") !== "" &&
                    (deliveryFormData.nombreRetirante?.trim() || "") !== "" &&
                    (deliveryFormData.apellidoRetirante?.trim() || "") !== "" &&
                    (deliveryFormData.dniRetirante?.trim() || "") !== "" &&
                    deliveryFormData.estadoEntrega === 'entregado'
                  ) ? 'Finalizar Entrega' : 'Actualizar Entrega'}
                </Button>
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
                      <p className="text-xs text-muted-foreground">{viewingRepair.cliente?.telefono || ""}</p>
                      <p className="text-xs text-muted-foreground">{viewingRepair.cliente?.email || ""}</p>
                      <p className="text-xs text-muted-foreground">{viewingRepair.cliente?.direccion || ""}</p>
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
