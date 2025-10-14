"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

const mockClientRepairs: any[] = []

export default function ClientLoginPage() {
  const [entryNumber, setEntryNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [repair, setRepair] = useState<any>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setRepair(null)

    // Buscar reparación por número de ingreso
    const result = await fetch(`/api/client-repair?entryNumber=${encodeURIComponent(entryNumber)}`).then(r => r.json())
    setIsLoading(false)
    if (result.error) {
      setError("No se encontró una reparación con ese número de ingreso.")
      return
    }
    // Redirigir a la página de detalles si existe
    router.push(`/repair/${entryNumber}`)
    // Si quieres evitar mostrar datos debajo, no setees el estado repair
    // setRepair(result)

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
          <h1 className="text-2xl font-bold text-foreground">Consultar Reparación</h1>
          <p className="text-muted-foreground">Ingrese el número de ingreso para ver el estado de su equipo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Consulta por Número de Ingreso</CardTitle>
            <CardDescription>Ejemplo: R-2025-001</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entryNumber">Número de Ingreso</Label>
                <Input
                  id="entryNumber"
                  type="text"
                  placeholder="R-2025-001"
                  value={entryNumber}
                  onChange={e => setEntryNumber(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Buscando..." : "Consultar"}
              </Button>
            </form>
            {error && <p className="text-red-600 text-center mt-2">{error}</p>}

            {repair && (
              <div className="mt-6 border-t pt-4">
                <h2 className="text-lg font-bold mb-2">Detalle de Reparación</h2>
                <div className="space-y-1">
                  <div><b>Número de Ingreso:</b> {repair.numeroIngreso}</div>
                  <div><b>Cliente:</b> {repair.cliente}</div>
                  <div><b>DNI/CUIL:</b> {repair.dniCuil}</div>
                  <div><b>Equipo:</b> {repair.equipo}</div>
                  <div><b>Marca:</b> {repair.marca}</div>
                  <div><b>N° Serie:</b> {repair.numeroSerie}</div>
                  <div><b>Fecha de Ingreso:</b> {repair.fechaIngreso}</div>
                  <div><b>Estado:</b> <Badge>{repair.estado}</Badge></div>
                  <div><b>Observaciones:</b> {repair.observaciones}</div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/login")}> al Login Principal</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
