"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Trash2, RotateCcw, Search } from "lucide-react"

type DeletedRepair = {
  id: string
  numeroIngreso: string
  cliente: string
  equipos: string
  estadoAnterior: string
  fechaEliminacion: string | null
  fechaCreacion: string | null
}

const estadoLabels: Record<string, string> = {
  recepcion: "Recepción",
  presupuesto: "Presupuesto",
  reparacion: "Reparación",
  entrega: "Entrega",
}

export default function PapeleraPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [deletedRepairs, setDeletedRepairs] = useState<DeletedRepair[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }
    fetchDeleted()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchDeleted = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("reparaciones")
      .select("*")
      .eq("estado_actual", "deleted")
      .order("fecha_eliminacion", { ascending: false })

    if (error) {
      console.error("Error cargando papelera:", error)
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los casos eliminados." })
      setLoading(false)
      return
    }

    const mapped = await Promise.all(
      (data || []).map(async (rep: any) => {
        const { data: equipos } = await supabase
          .from("equipos")
          .select("tipo_equipo, cantidad")
          .eq("reparacion_id", rep.id)
        const { data: cliente } = await supabase
          .from("clientes")
          .select("nombre, apellido")
          .eq("id", rep.cliente_id)
          .maybeSingle()

        return {
          id: rep.id.toString(),
          numeroIngreso: rep.numero_ingreso || rep.id.toString(),
          cliente: cliente ? `${cliente.nombre} ${cliente.apellido}` : "Sin cliente",
          equipos: (equipos || [])
            .map((eq: any) => `${eq.tipo_equipo || "Equipo"} x${eq.cantidad || 1}`)
            .join(", "),
          estadoAnterior: rep.estado_anterior || "recepcion",
          fechaEliminacion: rep.fecha_eliminacion || null,
          fechaCreacion: rep.fecha_creacion || null,
        } as DeletedRepair
      })
    )

    setDeletedRepairs(mapped)
    setLoading(false)
  }

  const handleRestore = async (repair: DeletedRepair) => {
    const destino = estadoLabels[repair.estadoAnterior] ? repair.estadoAnterior : "recepcion"
    const { error } = await supabase
      .from("reparaciones")
      .update({
        estado_actual: destino,
        estado_anterior: null,
        fecha_eliminacion: null,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", repair.id)

    if (error) {
      console.error("Error restaurando reparación:", error)
      toast({ variant: "destructive", title: "Error", description: "No se pudo restaurar el caso." })
      return
    }

    setDeletedRepairs((prev) => prev.filter((r) => r.id !== repair.id))
    toast({
      title: "Caso restaurado",
      description: `El ingreso ${repair.numeroIngreso} volvió a la etapa "${estadoLabels[destino] || destino}".`,
    })
  }

  const filteredRepairs = useMemo(() => {
    return deletedRepairs.filter((r) => {
      const term = searchTerm.trim().toLowerCase()
      const matchesTerm =
        !term ||
        r.numeroIngreso.toLowerCase().includes(term) ||
        r.cliente.toLowerCase().includes(term) ||
        r.equipos.toLowerCase().includes(term)

      // Filtro por rango de fecha de eliminación
      let matchesDate = true
      if (r.fechaEliminacion) {
        const elim = new Date(r.fechaEliminacion)
        if (fromDate) {
          const from = new Date(`${fromDate}T00:00:00`)
          if (elim < from) matchesDate = false
        }
        if (toDate) {
          const to = new Date(`${toDate}T23:59:59`)
          if (elim > to) matchesDate = false
        }
      } else if (fromDate || toDate) {
        // Si se filtra por fecha y el registro no tiene fecha de eliminación, se excluye
        matchesDate = false
      }

      return matchesTerm && matchesDate
    })
  }, [deletedRepairs, searchTerm, fromDate, toDate])

  const formatDate = (value: string | null) => {
    if (!value) return "-"
    const d = new Date(value)
    return d.toLocaleString("es-AR")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <div className="p-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2 rounded-md bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Papelera</h1>
              <p className="text-muted-foreground">
                Casos eliminados. Buscá por fecha de eliminación y restaurá los que necesites.
              </p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Filtrá por texto o por rango de fecha de eliminación.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="N° ingreso, cliente o equipo"
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="from">Eliminado desde</Label>
                  <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="to">Eliminado hasta</Label>
                  <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
              {(searchTerm || fromDate || toDate) && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setFromDate("")
                      setToDate("")
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Casos eliminados ({filteredRepairs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Cargando...</div>
              ) : filteredRepairs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No hay casos eliminados que coincidan.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Ingreso</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Equipos</TableHead>
                        <TableHead>Etapa previa</TableHead>
                        <TableHead>Fecha de eliminación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRepairs.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-medium">{repair.numeroIngreso}</TableCell>
                          <TableCell>{repair.cliente}</TableCell>
                          <TableCell>{repair.equipos || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {estadoLabels[repair.estadoAnterior] || repair.estadoAnterior}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(repair.fechaEliminacion)}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <RotateCcw className="h-4 w-4" />
                                  Restaurar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restaurar caso</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    El ingreso <strong>{repair.numeroIngreso}</strong> volverá a la etapa{" "}
                                    <strong>{estadoLabels[repair.estadoAnterior] || repair.estadoAnterior}</strong>.
                                    ¿Confirmás la restauración?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRestore(repair)}>
                                    Restaurar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
