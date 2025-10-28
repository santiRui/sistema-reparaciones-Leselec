"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

export default function AdminUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'encargado'|'ventas'|'taller'>('ventas')
  const [activo, setActivo] = useState(true)
  const [claveTemporal, setClaveTemporal] = useState('')
  const [enviarReset, setEnviarReset] = useState(true)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated')
    if (auth !== 'true') { router.push('/login'); return }
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setRole(u.role || '')
      if (u.role !== 'encargado') { router.push('/dashboard'); return }
    } catch { router.push('/login') }
    load()
  }, [router])

  const load = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'No se pudo cargar usuarios')
      setUsers(j.users || [])
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Error inesperado', variant: 'destructive' })
    }
  }

  const handleCreate = async () => {
    if (loading) return
    setLoading(true)
    try {
      // Obtener token de sesión para autorización en API
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ correo, nombre_completo: nombre, rol, activo, claveTemporal: enviarReset ? undefined : (claveTemporal || undefined), enviarReset }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error creando usuario')
      toast({ title: 'Usuario creado', description: correo })
      setCorreo(''); setNombre(''); setRol('ventas'); setActivo(true); setClaveTemporal(''); setEnviarReset(true)
      load()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Error inesperado', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleReset = async (email: string) => {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ correo: email }),
    })
    const j = await res.json()
    if (!res.ok) { toast({ title: 'Error', description: j.error || 'No se pudo enviar el reset', variant: 'destructive' }); return }
    toast({ title: 'Reset enviado', description: email })
  }

  if (role !== 'encargado') return null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Administrar Usuarios</h1>
            <p className="text-muted-foreground">Crear usuarios y enviar restablecimiento de contraseña</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nuevo usuario</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Correo</label>
                <Input value={correo} onChange={e=>setCorreo(e.target.value)} placeholder="usuario@empresa.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Nombre completo</label>
                <Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre Apellido" />
              </div>
              <div>
                <label className="text-sm font-medium">Rol</label>
                <Select value={rol} onValueChange={(v:any)=>setRol(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccione rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encargado">Encargado</SelectItem>
                    <SelectItem value="ventas">Ventas</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={activo ? 'true' : 'false'} onValueChange={(v:any)=>setActivo(v==='true')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <input id="enviarReset" type="checkbox" checked={enviarReset} onChange={e=>setEnviarReset(e.target.checked)} />
                  <label htmlFor="enviarReset" className="text-sm">Enviar email de restablecimiento (recomendado)</label>
                </div>
              </div>

              {!enviarReset && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Clave temporal</label>
                  <Input value={claveTemporal} onChange={e=>setClaveTemporal(e.target.value)} placeholder="Ej: Temp-1234" />
                </div>
              )}

              <div className="md:col-span-2">
                <Button onClick={handleCreate} disabled={loading} className="w-full">{loading ? 'Creando…' : 'Crear usuario'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.correo}>
                      <TableCell>{u.correo}</TableCell>
                      <TableCell>{u.nombre_completo}</TableCell>
                      <TableCell className="capitalize">{u.rol}</TableCell>
                      <TableCell>{u.activo ? 'Activo' : 'Inactivo'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={()=>handleReset(u.correo)}>Enviar reset</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin usuarios</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
