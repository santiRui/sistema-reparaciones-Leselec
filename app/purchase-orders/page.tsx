"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Search, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"

interface OrdenCompra {
  id: number
  numero_oc: string
  direccion: string | null
  telefono: string | null
  proveedor_empresa: string | null
  proveedor_telefono: string | null
  proveedor_direccion: string | null
  proveedor_ciudad: string | null
  entrega_empresa: string | null
  entrega_telefono: string | null
  entrega_direccion: string | null
  entrega_ciudad: string | null
  subtotal: number | null
  tasa_impuesto: number | null
  impuesto: number | null
  envio_gestion: number | null
  otro: number | null
  total: number | null
  created_at: string
}

interface OrdenItem {
  id: number
  orden_id: number
  cantidad: number | null
  peso: number | null
  descripcion: string | null
  precio_unitario: number | null
  valor_total: number | null
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrdenCompra[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated !== "true") {
      router.push("/login")
      return
    }
    loadOrders()
  }, [router])

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast({ title: 'Error cargando órdenes', description: error.message, variant: 'destructive' })
      return
    }
    setOrders((data || []) as any)
  }

  const handleDelete = async (order: OrdenCompra) => {
    if (!window.confirm(`¿Eliminar la orden ${order.numero_oc}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase
      .from('ordenes_compra')
      .delete()
      .eq('id', order.id)
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Orden eliminada', description: `${order.numero_oc} fue eliminada.` })
    loadOrders()
  }

  const filtered = useMemo(() => {
    return orders.filter(o => (o.numero_oc || '').toLowerCase().includes(search.toLowerCase()))
  }, [orders, search])

  const n = (val?: number | null) => typeof val === 'number' ? val.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : ''

  const handlePrint = async (order: OrdenCompra) => {
    // Cargar ítems
    const { data: items } = await supabase
      .from('orden_items')
      .select('*')
      .eq('orden_id', order.id)
      .order('id', { ascending: true })

    // Generar mismo HTML de impresión que en /purchase-order, ajustado a order
    const itemsRows = (items || []).map((it: any) => `
      <tr>
        <td class="cell center">${it.cantidad ?? ''}</td>
        <td class="cell center">${it.peso ?? ''}</td>
        <td class="cell">${(it.descripcion || '').replace(/</g, '&lt;')}</td>
        <td class="cell right">${typeof it.precio_unitario === 'number' ? `$ ${n(it.precio_unitario)}` : ''}</td>
        <td class="cell right">${typeof it.valor_total === 'number' ? `$ ${n(it.valor_total)}` : ''}</td>
      </tr>
    `).join('')

    const html = `
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Orden de Compra ${order.numero_oc}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #6b1820; }
            .title { text-align: center; font-weight: 700; letter-spacing: 2px; color: #e9818d; font-size: 22px; margin-bottom: 12px; }
            .label { color: #e9818d; font-weight: 700; font-size: 12px; }
            .line { border-bottom: 2px solid #f4b9bf; height: 18px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
            .box { border: 2px solid #f4b9bf; padding: 8px; border-radius: 6px; }
            .box .row { display: grid; grid-template-columns: 120px 1fr; align-items: center; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #fde5e8; color: #6b1820; font-size: 12px; }
            .cell, th { border: 2px solid #f4b9bf; padding: 8px; font-size: 12px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .totals { margin-top: 12px; display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
            .note { background: #fde5e8; min-height: 90px; }
            .footer { margin-top: 18px; font-size: 12px; color: #6b1820; }
          </style>
        </head>
        <body>
          <div class="title">ORDEN DE COMPRA</div>

          <div style="display:grid; grid-template-columns: 90px 1fr; gap: 8px; margin-bottom: 8px;">
            <div class="label">Dirección:</div>
            <div class="line">${order.direccion || ''}</div>
            <div class="label">Teléfono:</div>
            <div class="line">${order.telefono || ''}</div>
            <div class="label">Número de OC:</div>
            <div class="line">${order.numero_oc || ''}</div>
          </div>

          <div class="grid-2">
            <div class="box">
              <div class="label" style="margin-bottom:6px;">PROVEEDOR</div>
              <div class="row"><div class="label">Empresa:</div><div class="line">${order.proveedor_empresa || ''}</div></div>
              <div class="row"><div class="label">Teléfono:</div><div class="line">${order.proveedor_telefono || ''}</div></div>
              <div class="row"><div class="label">Dirección:</div><div class="line">${order.proveedor_direccion || ''}</div></div>
              <div class="row"><div class="label">Ciudad:</div><div class="line">${order.proveedor_ciudad || ''}</div></div>
            </div>
            <div class="box">
              <div class="label" style="margin-bottom:6px;">DIRECCIÓN DE ENTREGA</div>
              <div class="row"><div class="label">Empresa:</div><div class="line">${order.entrega_empresa || ''}</div></div>
              <div class="row"><div class="label">Teléfono:</div><div class="line">${order.entrega_telefono || ''}</div></div>
              <div class="row"><div class="label">Dirección:</div><div class="line">${order.entrega_direccion || ''}</div></div>
              <div class="row"><div class="label">Ciudad:</div><div class="line">${order.entrega_ciudad || ''}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:90px">Cantidad</th>
                <th style="width:90px">Peso</th>
                <th>Descripción</th>
                <th style="width:130px">Precio unitario</th>
                <th style="width:130px">Valor total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="box note"></div>
            <div class="box">
              <div class="row"><div class="label">Subtotal:</div><div class="line" style="text-align:right">${typeof order.subtotal === 'number' ? `$ ${n(order.subtotal)}` : ''}</div></div>
              <div class="row"><div class="label">Tasa de impuesto:</div><div class="line" style="text-align:right">${typeof order.tasa_impuesto === 'number' ? `${order.tasa_impuesto}%` : ''}</div></div>
              <div class="row"><div class="label">Impuesto:</div><div class="line" style="text-align:right">${typeof order.impuesto === 'number' ? `$ ${n(order.impuesto)}` : ''}</div></div>
              <div class="row"><div class="label">Envío y gestión:</div><div class="line" style="text-align:right">${typeof order.envio_gestion === 'number' ? `$ ${n(order.envio_gestion)}` : ''}</div></div>
              <div class="row"><div class="label">Otro:</div><div class="line" style="text-align:right">${typeof order.otro === 'number' ? `$ ${n(order.otro)}` : ''}</div></div>
              <div class="row"><div class="label">Total:</div><div class="line" style="text-align:right; font-weight:700;">${typeof order.total === 'number' ? `$ ${n(order.total)}` : ''}</div></div>
            </div>
          </div>
        </body>
      </html>
    `

    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      w.print()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Órdenes de compra</h1>
              <p className="text-muted-foreground">Lista, busca por número de OC e imprime.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Buscar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por número de OC..." value={search} onChange={(e)=>setSearch(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de OC</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{o.numero_oc}</TableCell>
                      <TableCell>{o.proveedor_empresa || '-'}</TableCell>
                      <TableCell>{o.entrega_empresa || '-'}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handlePrint(o)} className="gap-2">
                            <Printer className="h-4 w-4" /> Imprimir
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => handleDelete(o)}>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin resultados</TableCell>
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
