"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const mockClientRepairs: any[] = []

export default function ClientLoginPage() {
  const [email, setEmail] = useState("")
  const [dni, setDni] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [clientRepairs, setClientRepairs] = useState<any[]>([])
  const [selectedRepair, setSelectedRepair] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const router = useRouter()

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate client login
    setTimeout(() => {
      const repairs = mockClientRepairs.filter((repair) => repair.client.email === email && repair.client.dni === dni)

      if (repairs.length > 0) {
        setClientRepairs(repairs)
        setIsLoggedIn(true)
      } else {
        alert("No se encontraron reparaciones con esos datos")
      }
      setIsLoading(false)
    }, 1000)
  }

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "reception":
        return "Recepción"
      case "budget":
        return "Presupuesto"
      case "repair":
        return "Reparación"
      case "delivery":
        return "Entrega"
      case "completed":
        return "Completada"
      default:
        return stage
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "reception":
        return "bg-blue-100 text-blue-800"
      case "budget":
        return "bg-yellow-100 text-yellow-800"
      case "repair":
        return "bg-orange-100 text-orange-800"
      case "delivery":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleViewRepair = (repair: any) => {
    setSelectedRepair(repair)
    setIsViewDialogOpen(true)
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => router.push("/login")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mis Reparaciones</h1>
              <p className="text-muted-foreground">Estado de sus equipos en reparación</p>
            </div>
          </div>

          {clientRepairs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No se encontraron reparaciones asociadas a sus datos.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clientRepairs.map((repair) => (
                <Card key={repair.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{repair.entryNumber}</h3>
                          <Badge className={getStageColor(repair.stage)}>{getStageLabel(repair.stage)}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-1">
                          <strong>Equipo:</strong> {repair.equipment} - {repair.brand}
                        </p>
                        <p className="text-muted-foreground mb-1">
                          <strong>Fecha de Ingreso:</strong> {repair.entryDate}
                        </p>
                        {repair.diagnosis && (
                          <p className="text-muted-foreground mb-1">
                            <strong>Diagnóstico:</strong> {repair.diagnosis}
                          </p>
                        )}
                        {repair.budgetAmount && (
                          <p className="text-muted-foreground">
                            <strong>Presupuesto:</strong> ${repair.budgetAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" onClick={() => handleViewRepair(repair)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* View Repair Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalle de Reparación - {selectedRepair?.entryNumber}</DialogTitle>
                <DialogDescription>Información completa de su reparación</DialogDescription>
              </DialogHeader>

              {selectedRepair && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Número de Ingreso:</strong>
                      <p>{selectedRepair.entryNumber}</p>
                    </div>
                    <div>
                      <strong>Fecha de Ingreso:</strong>
                      <p>{selectedRepair.entryDate}</p>
                    </div>
                    <div>
                      <strong>Equipo:</strong>
                      <p>{selectedRepair.equipment}</p>
                    </div>
                    <div>
                      <strong>Marca:</strong>
                      <p>{selectedRepair.brand}</p>
                    </div>
                    <div>
                      <strong>Número de Serie:</strong>
                      <p>{selectedRepair.serialNumber}</p>
                    </div>
                    <div>
                      <strong>Estado Actual:</strong>
                      <Badge className={getStageColor(selectedRepair.stage)}>
                        {getStageLabel(selectedRepair.stage)}
                      </Badge>
                    </div>
                  </div>

                  {selectedRepair.diagnosis && (
                    <div>
                      <strong>Diagnóstico:</strong>
                      <p>{selectedRepair.diagnosis}</p>
                    </div>
                  )}

                  {selectedRepair.budgetAmount && (
                    <div>
                      <strong>Presupuesto:</strong>
                      <p>${selectedRepair.budgetAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OT3bqWGGUTwASGyHFkHBFvPbvVlQID.png"
            alt="LESELEC INGENIERÍA"
            className="mx-auto h-20 w-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Mis Reparaciones</h1>
          <p className="text-muted-foreground">Consulte el estado de sus equipos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso Cliente</CardTitle>
            <CardDescription>Ingrese su email y DNI/CUIL para ver sus reparaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="su@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI o CUIL</Label>
                <Input
                  id="dni"
                  type="text"
                  placeholder="12345678 o 20-12345678-9"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Consultando..." : "Consultar Reparaciones"}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/login")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Login Principal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
