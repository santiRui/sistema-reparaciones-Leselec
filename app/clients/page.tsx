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
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Users } from "lucide-react"

interface Client {
  id: string
  nombre: string
  apellido: string
  dniCuil: string
  tipoCliente: "empresa" | "particular"
  telefono: string
  email: string
  direccion: string
  fechaRegistro: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dniCuil: "",
    tipoCliente: "particular" as "empresa" | "particular",
    telefono: "",
    email: "",
    direccion: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }

    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('fecha_registro', { ascending: false })
      if (error) {
        toast({
          title: 'Error al cargar clientes',
          description: error.message,
          variant: 'destructive',
        })
        return
      }
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
          fechaRegistro: c.fecha_registro,
        }))
      )
    }
    fetchClients()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let result
    if (editingClient) {
      // Update
      result = await supabase.from('clientes').update({
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni_cuil: formData.dniCuil,
        tipo_cliente: formData.tipoCliente,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
      }).eq('id', editingClient.id)
    } else {
      // Insert
      result = await supabase.from('clientes').insert({
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni_cuil: formData.dniCuil,
        tipo_cliente: formData.tipoCliente,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        fecha_registro: new Date().toISOString().split("T")[0],
      })
    }
    if (result.error) {
      toast({
        title: 'Error al guardar cliente',
        description: result.error.message,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: editingClient ? 'Cliente actualizado' : 'Cliente agregado',
      description: editingClient ? 'Los datos del cliente fueron actualizados correctamente.' : 'El cliente fue agregado correctamente.',
      variant: 'default',
    })
    // Recargar lista desde la base de datos
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('fecha_registro', { ascending: false })
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
          fechaRegistro: c.fecha_registro,
        }))
      )
    }
    // Reset form
    setFormData({
      nombre: "",
      apellido: "",
      dniCuil: "",
      tipoCliente: "particular",
      telefono: "",
      email: "",
      direccion: "",
    })
    setEditingClient(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      nombre: client.nombre,
      apellido: client.apellido,
      dniCuil: client.dniCuil,
      tipoCliente: client.tipoCliente,
      telefono: client.telefono,
      email: client.email,
      direccion: client.direccion,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (clientId: string) => {
    if (confirm("¿Está seguro que desea eliminar este cliente?")) {
      const { error } = await supabase.from('clientes').delete().eq('id', clientId)
      if (error) {
        toast({
          title: 'Error al eliminar cliente',
          description: error.message,
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Cliente eliminado',
        description: 'El cliente fue eliminado correctamente.',
        variant: 'default',
      })
      // Recargar lista
      const { data, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .order('fecha_registro', { ascending: false })
      if (!fetchError) {
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
            fechaRegistro: c.fecha_registro,
          }))
        )
      }
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.dniCuil.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Gestión de Clientes
              </h1>
              <p className="text-muted-foreground">Administre la información de sus clientes</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                  <DialogDescription>
                    {editingClient ? "Modifique los datos del cliente" : "Ingrese los datos del nuevo cliente"}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido / Razón Social *</Label>
                      <Input
                        id="apellido"
                        value={formData.apellido}
                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dniCuil">DNI / CUIL *</Label>
                      <Input
                        id="dniCuil"
                        value={formData.dniCuil}
                        onChange={(e) => setFormData({ ...formData, dniCuil: e.target.value })}
                        placeholder="20-12345678-9"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoCliente">Tipo de Cliente *</Label>
                      <Select
                        value={formData.tipoCliente}
                        onValueChange={(value: "empresa" | "particular") =>
                          setFormData({ ...formData, tipoCliente: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="particular">Particular</SelectItem>
                          <SelectItem value="empresa">Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="011-4567-8901"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección *</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingClient(null)
                        setFormData({
                          nombre: "",
                          apellido: "",
                          dniCuil: "",
                          tipoCliente: "particular",
                          telefono: "",
                          email: "",
                          direccion: "",
                        })
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">{editingClient ? "Actualizar" : "Guardar"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar clientes por nombre, DNI/CUIL o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""} encontrado
                {filteredClients.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>DNI/CUIL</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {client.nombre} {client.apellido}
                            </div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{client.dniCuil}</TableCell>
                        <TableCell>
                          <Badge variant={client.tipoCliente === "empresa" ? "default" : "secondary"}>
                            {client.tipoCliente === "empresa" ? "Empresa" : "Particular"}
                          </Badge>
                        </TableCell>
                        <TableCell>{client.telefono}</TableCell>
                        <TableCell className="max-w-xs truncate">{client.direccion}</TableCell>
                        <TableCell>{new Date(client.fechaRegistro).toLocaleDateString("es-AR")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredClients.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? "Intente con otros términos de búsqueda" : "Comience agregando su primer cliente"}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Cliente
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
