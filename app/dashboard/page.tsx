"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Calculator, Wrench, Package, Receipt, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = [
    {
      title: "En Recepción",
      value: "12",
      icon: ClipboardList,
      color: "bg-blue-500",
      description: "Equipos recibidos hoy",
    },
    {
      title: "En Presupuesto",
      value: "8",
      icon: Calculator,
      color: "bg-yellow-500",
      description: "Esperando aprobación",
    },
    {
      title: "En Reparación",
      value: "15",
      icon: Wrench,
      color: "bg-orange-500",
      description: "Siendo reparados",
    },
    {
      title: "Para Entrega",
      value: "6",
      icon: Package,
      color: "bg-green-500",
      description: "Listos para retirar",
    },
    {
      title: "Facturación",
      value: "4",
      icon: Receipt,
      color: "bg-purple-500",
      description: "Pendientes de facturar",
    },
  ]

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>Últimas reparaciones ingresadas al sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: "001", client: "Empresa ABC", equipment: "Motor Trifásico", status: "recepcion" },
                    { id: "002", client: "Juan Pérez", equipment: "Bomba Centrífuga", status: "presupuesto" },
                    { id: "003", client: "Industrias XYZ", equipment: "Generador", status: "reparacion" },
                    { id: "004", client: "María García", equipment: "Motor Monofásico", status: "entrega" },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">
                          #{item.id} - {item.equipment}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.client}</p>
                      </div>
                      <Badge
                        variant={
                          item.status === "recepcion"
                            ? "default"
                            : item.status === "presupuesto"
                              ? "secondary"
                              : item.status === "reparacion"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {item.status === "recepcion"
                          ? "Recepción"
                          : item.status === "presupuesto"
                            ? "Presupuesto"
                            : item.status === "reparacion"
                              ? "Reparación"
                              : "Entrega"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen Semanal</CardTitle>
                <CardDescription>Estadísticas de la semana actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Reparaciones completadas</span>
                    <span className="font-bold text-foreground">23</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nuevos ingresos</span>
                    <span className="font-bold text-foreground">18</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Presupuestos aprobados</span>
                    <span className="font-bold text-foreground">15</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Facturación total</span>
                    <span className="font-bold text-primary">$125,400</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
