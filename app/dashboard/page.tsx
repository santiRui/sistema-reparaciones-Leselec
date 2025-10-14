"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Calculator, Wrench, Package, Receipt, TrendingUp, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function DashboardPage() {
  const [weeklyStats, setWeeklyStats] = useState({
    finalizadas: 0,
    ingresos: 0,
    presupuestosAprobados: 0,
    facturacionTotal: 0,
  });
  const [recentRepairs, setRecentRepairs] = useState<any[]>([]);
  const router = useRouter()
  const [user, setUser] = useState<any>(null)


  const [stats, setStats] = useState([
    {
      title: "En Recepción",
      value: "-",
      icon: ClipboardList,
      color: "bg-blue-500",
      description: "Equipos recibidos hoy",
    },
    {
      title: "En Presupuesto",
      value: "-",
      icon: Calculator,
      color: "bg-yellow-500",
      description: "Esperando aprobación",
    },
    {
      title: "En Reparación",
      value: "-",
      icon: Wrench,
      color: "bg-orange-500",
      description: "Siendo reparados",
    },
    {
      title: "Para Entrega",
      value: "-",
      icon: Package,
      color: "bg-green-500",
      description: "Listos para retirar",
    },
    {
      title: "Finalizadas",
      value: "-",
      icon: CheckCircle,
      color: "bg-purple-500",
      description: "Reparaciones finalizadas",
    },
  ]);

useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [router])

  useEffect(() => {
    async function fetchStats() {
      // Recepción: estado_actual = 'recepcion'
      const { data: recepcion } = await supabase.from('reparaciones').select('id').eq('estado_actual', 'recepcion');
      // Presupuesto: estado_actual = 'presupuesto'
      const { data: presupuesto } = await supabase.from('reparaciones').select('id').eq('estado_actual', 'presupuesto');
      // Reparación: estado_actual = 'reparacion'
      const { data: reparacion } = await supabase.from('reparaciones').select('id').eq('estado_actual', 'reparacion');
      // Para entrega: estado_actual = 'entrega'
      const { data: entrega } = await supabase.from('reparaciones').select('id').eq('estado_actual', 'entrega');
      // Finalizadas: entregas con estado_entrega = 'entregado'
      const { data: finalizadas } = await supabase.from('entregas').select('id').eq('estado_entrega', 'entregado');
      setStats([
        {
          title: "En Recepción",
          value: String(recepcion?.length ?? 0),
          icon: ClipboardList,
          color: "bg-blue-500",
          description: "Equipos recibidos hoy",
        },
        {
          title: "En Presupuesto",
          value: String(presupuesto?.length ?? 0),
          icon: Calculator,
          color: "bg-yellow-500",
          description: "Esperando aprobación",
        },
        {
          title: "En Reparación",
          value: String(reparacion?.length ?? 0),
          icon: Wrench,
          color: "bg-orange-500",
          description: "Siendo reparados",
        },
        {
          title: "Para Entrega",
          value: String(entrega?.length ?? 0),
          icon: Package,
          color: "bg-green-500",
          description: "Listos para retirar",
        },
        {
          title: "Finalizadas",
          value: String(finalizadas?.length ?? 0),
          icon: CheckCircle,
          color: "bg-purple-500",
          description: "Reparaciones finalizadas",
        },
      ]);
    }
    if (user) {
      fetchStats();
      // Cargar últimas reparaciones reales
      async function fetchRecentRepairs() {
        // Últimas reparaciones registradas
        const { data } = await supabase
          .from('reparaciones')
          .select('id, numero_ingreso, estado_actual, fecha_creacion, clientes (nombre, apellido)')
          .order('fecha_creacion', { ascending: false })
          .limit(10); // Aumentado a 10 para ver más registros
        setRecentRepairs(
          (data || []).map((r: any) => ({
            id: r.id,
            numeroIngreso: r.numero_ingreso || r.id,
            cliente: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido}` : 'Sin cliente',
            estado: r.estado_actual || 'sin estado',
            fecha_creacion: r.fecha_creacion // Asegurar que la fecha se pase al componente
          }))
        );
      }
      fetchRecentRepairs();
      // Cargar estadísticas semanales reales
      async function fetchWeeklyStats() {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        // Finalizadas esta semana
        const { data: finalizadas } = await supabase
          .from('entregas')
          .select('id, fecha_retiro')
          .eq('estado_entrega', 'entregado');
        const finalizadasSemana = (finalizadas || []).filter((f: any) => {
          const fecha = new Date(f.fecha_retiro);
          return fecha >= startOfWeek && fecha <= endOfWeek;
        });
        // Nuevos ingresos esta semana
        const { data: ingresos } = await supabase
          .from('reparaciones')
          .select('id, fecha_creacion');
        const ingresosSemana = (ingresos || []).filter((r: any) => {
          const fecha = new Date(r.fecha_creacion);
          return fecha >= startOfWeek && fecha <= endOfWeek;
        });
        // Presupuestos aprobados esta semana
        const { data: presupuestos } = await supabase
          .from('presupuestos')
          .select('id, fecha_aprobacion, estado')
          .eq('estado', 'aprobado');
        const presupuestosSemana = (presupuestos || []).filter((p: any) => {
          if (!p.fecha_aprobacion) return false;
          const fecha = new Date(p.fecha_aprobacion);
          return fecha >= startOfWeek && fecha <= endOfWeek;
        });
        // Facturación total esta semana
        const { data: facturas } = await supabase
          .from('facturas')
          .select('total, fecha')
        const facturasSemana = (facturas || []).filter((f: any) => {
          const fecha = new Date(f.fecha);
          return fecha >= startOfWeek && fecha <= endOfWeek;
        });
        const facturacionTotal = facturasSemana.reduce((acc: number, f: any) => acc + (Number(f.total) || 0), 0);
        setWeeklyStats({
          finalizadas: finalizadasSemana.length,
          ingresos: ingresosSemana.length,
          presupuestosAprobados: presupuestosSemana.length,
          facturacionTotal,
        });
      }
      fetchWeeklyStats();
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido, {user.username}. Resumen del sistema de reparaciones.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-md ${stat.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="text-xl font-bold">Reparaciones Iniciadas</CardTitle>
      <CardDescription>Listado de las últimas reparaciones registradas en el sistema</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="divide-y divide-gray-200">
        {recentRepairs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No hay reparaciones registradas recientemente.</div>
        ) : (
          recentRepairs.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between py-4">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {item.numeroIngreso}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString('es-AR') : 'Sin fecha'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{item.cliente}</div>
              </div>
              <Badge
                variant={
                  item.estado === "recepcion"
                    ? "default"
                    : item.estado === "presupuesto"
                      ? "secondary"
                      : item.estado === "reparacion"
                        ? "destructive"
                        : item.estado === "entrega"
                          ? "outline"
                          : item.estado === "finalizada"
                            ? "secondary"
                            : "outline"
                }
                className="text-base px-4 py-2 capitalize"
              >
                {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
              </Badge>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
</div>
        </div>
      </div>
    </div>
  )
}
