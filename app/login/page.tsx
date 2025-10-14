"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Buscar usuario en la tabla personal por correo
    const { data, error } = await supabase
      .from('personal')
      .select('*')
      .eq('correo', username)
      .single()

    if (error || !data) {
      toast({
        title: 'Error de autenticación',
        description: 'Usuario o contraseña incorrectos',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    // Validar contraseña en texto plano
    if (password !== data.contrasena) {
      toast({
        title: 'Error de autenticación',
        description: 'Usuario o contraseña incorrectos',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    // Guardar sesión y redirigir
    toast({
      title: '¡Bienvenido!',
      description: `Hola ${data.nombre_completo} (${data.rol})`,
      variant: 'default',
    })
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('user', JSON.stringify({ username: data.correo, role: data.rol, nombre: data.nombre_completo }))
    setIsLoading(false)
    setTimeout(() => router.push('/dashboard'), 800)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="text-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OT3bqWGGUTwASGyHFkHBFvPbvVlQID.png"
            alt="LESELEC INGENIERÍA"
            className="mx-auto h-20 w-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Sistema de Reparaciones</h1>
          <p className="text-muted-foreground">Ingrese sus credenciales para continuar</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>Acceda al sistema de control de reparaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/client-login")}>
                Mis Reparaciones
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">Consulte el estado de sus reparaciones</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
