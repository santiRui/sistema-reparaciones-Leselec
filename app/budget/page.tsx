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
import { Calculator } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Edit, Eye, DollarSign, ArrowRight, FileText, Printer, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  diagnostico?: string
  importe?: string
  fechaPresupuesto?: string
  presupuestadoPor?: string
  seña?: string
  seniaAbonada?: boolean
  senia_abonada?: boolean
  rechazado?: boolean
  emiteFactura?: boolean
}

export default function BudgetPage() {
  const router = useRouter()
  const { toast } = useToast()
  // State declarations
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [budgetRepairs, setBudgetRepairs] = useState<Repair[]>([])
  const [receptionRepairs, setReceptionRepairs] = useState<Repair[]>([])
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)
  const [isReceiptionDialogOpen, setIsReceiptionDialogOpen] = useState(false)
  const [viewingRepair, setViewingRepair] = useState<Repair | null>(null)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [deletingRepair, setDeletingRepair] = useState<Repair | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [budgetFormData, setBudgetFormData] = useState({
    diagnosticoFalla: "",
    descripcionProceso: "",
    repuestos: "",
    diagnostico: "",
    importe: "",
    seña: "",
    emiteFactura: false,
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
        // Obtener TODOS los equipos de la reparación
        const { data: equipos } = await supabase
          .from('equipos')
          .select('*')
          .eq('reparacion_id', rep.id)
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
          numeroIngreso: rep.numero_ingreso,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          recepcionista,
          clienteId: rep.cliente_id.toString(),
          // Datos del equipo
          equipo: equipos && equipos[0] ? equipos[0].tipo_equipo : '',
          marcaEquipo: equipos && equipos[0] ? equipos[0].marca : '',
          numeroSerie: equipos && equipos[0] ? equipos[0].numero_serie : '',
          elementosFaltantes: rep.elementos_faltantes || '',
          accesorios: rep.accesorios || '',
          potencia: equipos && equipos[0] ? equipos[0].potencia || '' : '',
          tension: equipos && equipos[0] ? equipos[0].tension || '' : '',
          revoluciones: equipos && equipos[0] ? equipos[0].revoluciones || '' : '',
          numeroRemito: rep.numero_remito || '',
          numeroOrdenCompra: rep.numero_orden_compra || '',
          observaciones: rep.observaciones_recepcion || '',
          estado: rep.estado_actual,
          fechaCreacion: rep.fecha_creacion,
          
          // Datos de presupuesto
          diagnosticoFalla: presupuesto?.diagnostico_falla || '',
          descripcionProceso: presupuesto?.descripcion_proceso || '',
          repuestos: presupuesto?.repuestos_necesarios || '',
          diagnostico: typeof presupuesto?.diagnostico === 'number'
            ? presupuesto.diagnostico.toString()
            : (presupuesto?.diagnostico ?? ''),
          importe: presupuesto?.importe_total ? presupuesto.importe_total.toString() : '',
          seña: presupuesto?.["seña"] ? presupuesto["seña"].toString() : '',
          emiteFactura: presupuesto?.emision_factura || false,
          
          // Datos del cliente
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
          
          // Lista de equipos
          equipos: (equipos || []).map((eq: any) => ({
            id: eq.id.toString(),
            tipo_equipo: eq.tipo_equipo,
            marca: eq.marca,
            numero_serie: eq.numero_serie,
            cantidad: eq.cantidad || 1,
            potencia: eq.potencia,
            tension: eq.tension,
            revoluciones: eq.revoluciones,
          }))
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
        const { data: equipos } = await supabase
          .from('equipos')
          .select('*')
          .eq('reparacion_id', rep.id)
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
          numeroIngreso: rep.numero_ingreso,
          fechaIngreso: rep.fecha_creacion.split('T')[0],
          recepcionista,
          clienteId: rep.cliente_id.toString(),
          equipos: equipos || [],
          equipo: Array.isArray(equipos) && equipos[0] ? equipos[0].tipo_equipo : '',
          marcaEquipo: Array.isArray(equipos) && equipos[0] ? equipos[0].marca : '',
          numeroSerie: Array.isArray(equipos) && equipos[0] ? equipos[0].numero_serie : '',
          elementosFaltantes: rep.elementos_faltantes || '',
          accesorios: rep.accesorios || '',
          potencia: Array.isArray(equipos) && equipos[0] ? equipos[0].potencia : '',
          tension: Array.isArray(equipos) && equipos[0] ? equipos[0].tension : '',
          revoluciones: Array.isArray(equipos) && equipos[0] ? equipos[0].revoluciones : '',
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
    
    if (!editingRepair) {
      toast({
        title: "Error",
        description: "No se ha seleccionado ninguna reparación para presupuestar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validar campos requeridos
      if (!budgetFormData.diagnosticoFalla || !budgetFormData.descripcionProceso || !budgetFormData.importe) {
        toast({
          title: "Error",
          description: "Por favor complete los campos requeridos: diagnóstico, descripción e importe",
          variant: "destructive",
        });
        return;
      }

      // Validar formato numérico
      const importe = parseFloat(String(budgetFormData.importe).replace(',', '.')) || 0;
      const diagnostico = parseFloat(String(budgetFormData.diagnostico ?? '0').replace(',', '.')) || 0;
      const seña = parseFloat(budgetFormData.seña.replace(',', '.')) || 0;

      if (isNaN(importe) || importe <= 0) {
        toast({
          title: "Error",
          description: "El importe debe ser un número mayor a cero",
          variant: "destructive",
        });
        return;
      }

      // Obtener la sesión actual (evitar AuthSessionMissingError si no hay login)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError);
      }
      const userId = session?.user?.id ?? null;

      // Continuar con Supabase aunque la sesión no esté disponible; si falla, el catch mostrará detalle

      // 1. Verificar si ya existe un presupuesto para esta reparación
      const { data: existingPresupuesto, error: fetchError } = await supabase
        .from('presupuestos')
        .select('id')
        .eq('reparacion_id', editingRepair.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase fetch presupuesto error:', fetchError);
        throw new Error(fetchError.message || 'Error consultando presupuesto existente');
      }

      // 2. Actualizar o crear el presupuesto
      const budgetData = {
        diagnostico_falla: budgetFormData.diagnosticoFalla,
        descripcion_proceso: budgetFormData.descripcionProceso,
        repuestos_necesarios: budgetFormData.repuestos,
        diagnostico: diagnostico,
        importe_total: importe,
        ["seña"]: seña,
        emision_factura: budgetFormData.emiteFactura || false,
      };

      let operationError = null;
      
      if (existingPresupuesto?.id) {
        // Actualizar presupuesto existente
        const { error } = await supabase
          .from('presupuestos')
          .update(budgetData)
          .eq('id', existingPresupuesto.id);
        operationError = error;
      } else {
        // Crear nuevo presupuesto
        const { error } = await supabase
          .from('presupuestos')
          .insert([{
            ...budgetData,
            reparacion_id: Number(editingRepair.id),
          }]);
        operationError = error;
      }

      if (operationError) {
        console.error('Supabase upsert presupuesto error:', operationError);
        const msg = (operationError as any)?.message || (operationError as any)?.hint || 'Error guardando presupuesto';
        throw new Error(msg);
      }

      // 3. Actualizar el estado de la reparación
      const { error: updateError } = await supabase
        .from('reparaciones')
        .update({ 
          estado_actual: 'presupuesto'
        })
        .eq('id', Number(editingRepair.id));

      if (updateError) {
        console.error('Supabase update reparaciones error:', updateError);
        throw new Error(updateError.message || 'Error actualizando reparación');
      }

      // 4. Actualizar el estado local
      const updatedRepairs = repairs.map(repair => {
        if (repair.id === editingRepair.id) {
          return {
            ...repair,
            diagnosticoFalla: budgetFormData.diagnosticoFalla,
            descripcionProceso: budgetFormData.descripcionProceso,
            repuestos: budgetFormData.repuestos,
            diagnostico: isNaN(diagnostico) ? '' : diagnostico.toString(),
            importe: importe.toString(),
            seña: seña.toString(),
            estado: 'presupuesto' as const, // Ensure type safety for estado
            fechaPresupuesto: new Date().toISOString(),
            presupuestadoPor: (currentUser as any)?.nombre_completo || (currentUser as any)?.email || 'Usuario',
            emiteFactura: budgetFormData.emiteFactura
          };
        }
        return repair;
      });

      setRepairs(updatedRepairs as Repair[]);
      // Persistir en localStorage para que no desaparezca tras recargar
      try {
        localStorage.setItem("repairs", JSON.stringify(updatedRepairs));
      } catch {}
      // Reconstruir el item actualizado aunque no exista en 'repairs'
      const updatedItem: Repair = {
        ...(editingRepair as Repair),
        diagnosticoFalla: budgetFormData.diagnosticoFalla,
        descripcionProceso: budgetFormData.descripcionProceso,
        repuestos: budgetFormData.repuestos,
        diagnostico: isNaN(diagnostico) ? '' : diagnostico.toString(),
        importe: importe.toString(),
        seña: seña.toString(),
        estado: 'presupuesto',
        fechaPresupuesto: new Date().toISOString(),
        presupuestadoPor: (currentUser as any)?.nombre_completo || (currentUser as any)?.email || 'Usuario',
        emiteFactura: budgetFormData.emiteFactura,
      };
      setBudgetRepairs(prev => {
        const idx = prev.findIndex(p => p.id === updatedItem.id);
        const next = idx >= 0 ? prev.map(p => (p.id === updatedItem.id ? updatedItem : p)) : [...prev, updatedItem];
        return next.filter(r => r.estado === 'presupuesto') as Repair[];
      });
      
      // Cerrar el diálogo y limpiar el formulario
      setIsBudgetDialogOpen(false);
      setBudgetFormData({
        diagnosticoFalla: "",
        descripcionProceso: "",
        repuestos: "",
        diagnostico: "",
        importe: "",
        seña: "",
        emiteFactura: false,
      });
      setEditingRepair(null);

      // Mostrar mensaje de éxito
      toast({
        title: "¡Éxito!",
        description: "El presupuesto se ha guardado correctamente",
      });
      // Enviar notificación por correo al cliente (presupuesto disponible)
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'presupuesto',
            reparacionId: (editingRepair as any)?.id,
            numeroIngreso: (editingRepair as any)?.numeroIngreso,
          }),
        });
      } catch (notifyErr) {
        console.warn('No se pudo enviar el correo de presupuesto:', notifyErr);
      }
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error al guardar el presupuesto:', errMsg);
      toast({
        title: "Error",
        description: `No se pudo guardar el presupuesto. ${errMsg || "Por favor, intente nuevamente."}`,
        variant: "destructive",
      });
    }
  }

  const confirmDeleteBudget = async (repairToDelete: Repair) => {
    if (!repairToDelete) {
      console.error('No se proporcionó un presupuesto para eliminar')
      throw new Error('No se proporcionó un presupuesto para eliminar')
    }
    
    try {
      console.log('Iniciando eliminación de presupuesto:', repairToDelete.id)
      
      // 1. Eliminar presupuesto asociado
      const { error: errorPresupuesto } = await supabase
        .from('presupuestos')
        .delete()
        .eq('reparacion_id', repairToDelete.id)
      
      if (errorPresupuesto) {
        console.error('Error al eliminar presupuesto:', errorPresupuesto)
        throw new Error('Error al eliminar los datos del presupuesto')
      }
      
      // 2. Eliminar equipos asociados
      const { error: errorEquipo } = await supabase
        .from('equipos')
        .delete()
        .eq('reparacion_id', repairToDelete.id)
      
      if (errorEquipo) {
        console.error('Error al eliminar equipos:', errorEquipo)
        throw new Error('Error al eliminar los equipos asociados')
      }
      
      // 3. Eliminar la reparación
      const { error: errorReparacion } = await supabase
        .from('reparaciones')
        .delete()
        .eq('id', repairToDelete.id)
      
      if (errorReparacion) {
        console.error('Error al eliminar reparación:', errorReparacion)
        throw new Error('No se pudo eliminar la reparación')
      }
      
      // Actualizar el estado local de budgetRepairs inmediatamente
      setBudgetRepairs(prevBudgetRepairs => {
        const updatedBudgetRepairs = prevBudgetRepairs.filter(rep => rep.id !== repairToDelete.id)
        console.log('Presupuestos después de eliminar:', updatedBudgetRepairs.length)
        return updatedBudgetRepairs
      })
      
      // Mostrar notificación de éxito
      toast({
        title: "✅ Presupuesto eliminado",
        description: `El presupuesto ${repairToDelete.numeroIngreso} ha sido eliminado correctamente.`,
        duration: 2000
      })
      
    } catch (error) {
      console.error('Error al eliminar presupuesto:', error)
      throw error // Re-lanzar el error para manejarlo en el componente
    } finally {
      setDeletingRepair(null)
    }
  }

  const handleMoveToRepair = async (repair: Repair) => {
    // Aquí debes adaptar según cómo guardes el estado de pago o rechazo
    const seniaAbonada = repair.seniaAbonada === true || repair.senia_abonada === true; // ajusta el nombre real
    const rechazado = repair.rechazado === true;
    if (!seniaAbonada && !rechazado) {
      toast({
        variant: "destructive",
        title: "No permitido",
        description: "Para pasar a reparación, la seña debe estar abonada o el presupuesto debe ser rechazado.",
      });
      return;
    }
    try {
      // Actualizar en Supabase
      const { error } = await supabase
        .from('reparaciones')
        .update({ estado_actual: rechazado ? 'finalizada' : 'reparacion', fecha_actualizacion: new Date().toISOString() })
        .eq('id', repair.id);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error al mover",
          description: `No se pudo mover el presupuesto a reparación: ${error.message}`,
        })
        return;
      }
      toast({
        title: rechazado ? "Presupuesto rechazado" : "Movido a reparación",
        description: rechazado ? `El presupuesto ${repair.numeroIngreso} fue rechazado y se cerró la reparación.` : `El presupuesto ${repair.numeroIngreso} ha sido movido a reparación.`,
      });
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 1500)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ocurrió un error inesperado al mover el presupuesto.",
      })
    }
  }

  const handleEditBudget = (repair: Repair) => {
    setEditingRepair(repair)
    setBudgetFormData({
      diagnosticoFalla: repair.diagnosticoFalla || "",
      descripcionProceso: repair.descripcionProceso || "",
      repuestos: repair.repuestos || "",
      diagnostico: repair.diagnostico != null ? String(repair.diagnostico) : "",
      importe: repair.importe || "",
      seña: repair.seña || "",
      emiteFactura: typeof repair.emiteFactura === 'boolean' ? repair.emiteFactura : false,
    })
    setIsBudgetDialogOpen(true)
  }

  const handleView = async (repair: Repair) => {
    let client = clients.find((c) => c.id === repair.clienteId)
    if (!client && repair.clienteId) {
      // Buscar cliente en Supabase si no está en el estado local
      const { data: clienteDb } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', repair.clienteId)
        .single()
      if (clienteDb) {
        client = {
          id: clienteDb.id.toString(),
          nombre: clienteDb.nombre,
          apellido: clienteDb.apellido,
          dniCuil: clienteDb.dni_cuil,
          tipoCliente: clienteDb.tipo_cliente,
          telefono: clienteDb.telefono,
          email: clienteDb.email,
          direccion: clienteDb.direccion,
        }
      }
    }
    setViewingRepair({ ...repair, cliente: client })
    setIsBudgetDialogOpen(true)
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

  // Imprimir presupuesto
  const handlePrintBudget = (repair: Repair) => {
    const client = repair.cliente;
    const printContent = `
      <html>
        <head>
          <title>Presupuesto ${repair.numeroIngreso}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0056A6; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
            .section h3 { margin-top: 0; color: #0056A6; }
            .field { margin-bottom: 8px; }
            .field strong { display: inline-block; width: 160px; }
            .budget-badge { background: #f59e42; color: white; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LESELEC INGENIERÍA</div>
            <h2>Presupuesto de Reparación - ${repair.numeroIngreso}</h2>
            <span class="budget-badge">PRESUPUESTO</span>
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
              : `<div class="field"><strong>Equipo:</strong> ${repair.equipo}</div>`}
          </div>
          <div class="section">
            <h3>Presupuesto</h3>
            <div class="field"><strong>Diagnóstico de Falla:</strong> ${repair.diagnosticoFalla || "-"}</div>
            <div class="field"><strong>Descripción del Proceso:</strong> ${repair.descripcionProceso || "-"}</div>
            <div class="field"><strong>Repuestos:</strong> ${repair.repuestos || "-"}</div>
            <div class="field"><strong>Importe Total:</strong> <b style='color:green;'>$
              ${repair.importe ? Number(repair.importe).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </b></div>
            <div class="field"><strong>Seña:</strong> <b style='color:blue;'>$
              ${repair.seña ? Number(repair.seña).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </b></div>
            <div class="field"><strong>Diagnóstico:</strong> <b style='color:blue;'>$
              ${repair.diagnostico ? Number(repair.diagnostico).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
            </b></div>
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
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Recepcionista</TableHead>
                      <TableHead>Estado Presupuesto</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Seña</TableHead>
                      <TableHead>Diagnóstico</TableHead>
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
                          <TableCell>{repair.fechaIngreso ? new Date(repair.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : ''}</TableCell>
                          <TableCell className="font-medium">
                            {repair.cliente ? `${repair.cliente.nombre} ${repair.cliente.apellido}` : "Cliente no encontrado"}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(repair.equipos)
  ? (
      <div>
        {repair.equipos.map((eq, idx) => (
          <div key={eq.id || idx}>
            {eq.tipo_equipo} (x{eq.cantidad})
          </div>
        ))}
      </div>
    )
  : repair.equipo}
                          </TableCell>
                          <TableCell>
                            {repair.recepcionista}
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
                                <span className="font-medium">{repair.importe ? Number(repair.importe).toLocaleString("es-AR", { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin presupuesto</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {repair.seña ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{Number(repair.seña).toLocaleString("es-AR", { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {repair.diagnostico ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{Number(repair.diagnostico).toLocaleString("es-AR", { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Eliminar presupuesto"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro de eliminar este presupuesto?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto <strong>{repair.numeroIngreso}</strong> y todos sus datos asociados.
                                      <br /><br />
                                      <strong>Cliente:</strong> {repair.cliente ? `${repair.cliente.nombre} ${repair.cliente.apellido}` : "Cliente no encontrado"}
                                      <br />
                                      <strong>Equipo:</strong> {repair.equipo} - {repair.marcaEquipo}
                                      <br />
                                      <strong>Importe:</strong> ${repair.importe ? Number(repair.importe).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={async () => {
                                        try {
                                          await confirmDeleteBudget(repair)
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
                              {hasBudget && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Imprimir presupuesto"
                                    onClick={() => handlePrintBudget(repair)}
                                  >
                                    <Printer className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveToRepair(repair)}
                                    className="text-green-600 hover:text-green-600"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </>
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
                    <Label className="block">¿Se emite factura?</Label>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="emiteFactura"
                          value="no"
                          checked={!budgetFormData.emiteFactura}
                          onChange={() => setBudgetFormData({ ...budgetFormData, emiteFactura: false })}
                          className="w-4 h-4"
                        />
                        <span>No</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="emiteFactura"
                          value="si"
                          checked={budgetFormData.emiteFactura}
                          onChange={() => setBudgetFormData({ ...budgetFormData, emiteFactura: true })}
                          className="w-4 h-4"
                        />
                        <span>Sí</span>
                      </label>
                    </div>
                  </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="diagnostico">Diagnóstico</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="diagnostico"
                          type="number"
                          step="0.01"
                          value={budgetFormData.diagnostico}
                          onChange={(e) => setBudgetFormData({ ...budgetFormData, diagnostico: e.target.value })}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seña">Seña</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="seña"
                          type="number"
                          step="0.01"
                          value={budgetFormData.seña}
                          onChange={(e) => setBudgetFormData({ ...budgetFormData, seña: e.target.value })}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
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
                      diagnostico: "",
                      importe: "",
                      seña: "",
                      emiteFactura: false,
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
                        {viewingRepair?.cliente
                          ? `${viewingRepair?.cliente?.nombre} ${viewingRepair?.cliente?.apellido}`
                          : "Cliente no encontrado"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                      <Badge variant={viewingRepair?.cliente?.tipoCliente === "empresa" ? "default" : "secondary"}>
                        {viewingRepair?.cliente?.tipoCliente === "empresa" ? "Empresa" : "Particular"}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                      <p className="text-foreground">{viewingRepair?.cliente?.telefono || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-foreground">{viewingRepair?.cliente?.email || "N/A"}</p>
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
                      <p className="text-foreground">{viewingRepair?.equipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Marca</Label>
                      <p className="text-foreground">{viewingRepair?.marcaEquipo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Número de Serie</Label>
                      <p className="text-foreground font-mono">{viewingRepair?.numeroSerie}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Potencia</Label>
                      <p className="text-foreground">{viewingRepair?.potencia || "N/A"}</p>
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
