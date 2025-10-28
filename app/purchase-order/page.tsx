"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Printer, FileText, Save } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"

interface ItemRow {
  cantidad: string
  peso: string
  descripcion: string
  precioUnitario: string
}

export default function PurchaseOrderPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)
  const { toast } = useToast()

  // Datos encabezado
  const [direccion, setDireccion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [numeroOC, setNumeroOC] = useState("")

  // Proveedor y entrega
  const [provEmpresa, setProvEmpresa] = useState("")
  const [provTelefono, setProvTelefono] = useState("")
  const [provDireccion, setProvDireccion] = useState("")
  const [provCiudad, setProvCiudad] = useState("")

  const [entEmpresa, setEntEmpresa] = useState("")
  const [entTelefono, setEntTelefono] = useState("")
  const [entDireccion, setEntDireccion] = useState("")
  const [entCiudad, setEntCiudad] = useState("")
  const [entCompaniaFlete, setEntCompaniaFlete] = useState("")

  // Ítems
  const [items, setItems] = useState<ItemRow[]>([
    { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
    { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
    { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
  ])

  // Totales
  const [tasaImpuesto, setTasaImpuesto] = useState("")
  const [envioGestion, setEnvioGestion] = useState("")
  const [otro, setOtro] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (auth !== "true") {
      setIsAuthenticated(false)
      router.push("/login")
      return
    }
    // Generar número de OC autoincremental (no persiste hasta imprimir)
    try {
      const last = parseInt(localStorage.getItem("po_last_number") || "0")
      const next = isNaN(last) ? 1 : last + 1
      const year = new Date().getFullYear()
      if (!numeroOC) setNumeroOC(`OC-${year}-${String(next).padStart(4, "0")}`)
    } catch {}
  }, [router])

  const subTotal = useMemo(() => {
    const sum = items.reduce((acc, it) => {
      const cant = parseFloat(it.cantidad.replace(",", ".")) || 0
      const precio = parseFloat(it.precioUnitario.replace(",", ".")) || 0
      return acc + cant * precio
    }, 0)
    return sum
  }, [items])

  const impuesto = useMemo(() => {
    const tasa = parseFloat(tasaImpuesto.replace(",", ".")) || 0
    return subTotal * (tasa / 100)
  }, [subTotal, tasaImpuesto])

  const total = useMemo(() => {
    const envio = parseFloat(envioGestion.replace(",", ".")) || 0
    const otroNum = parseFloat(otro.replace(",", ".")) || 0
    return subTotal + impuesto + envio + otroNum
  }, [subTotal, impuesto, envioGestion, otro])

  const addRow = () => setItems([...items, { cantidad: "", peso: "", descripcion: "", precioUnitario: "" }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: keyof ItemRow, value: string) => {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: value }
    setItems(next)
  }

  const n = (val: number) => val.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const parseNum = (v: string) => {
    const x = parseFloat((v || "").replace(",", "."))
    return isNaN(x) ? null : x
  }

  const nextNumeroOC = () => {
    try {
      const last = parseInt(localStorage.getItem("po_last_number") || "0")
      const next = isNaN(last) ? 1 : last + 1
      const year = new Date().getFullYear()
      return `OC-${year}-${String(next).padStart(4, "0")}`
    } catch {
      const year = new Date().getFullYear()
      return `OC-${year}-0001`
    }
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const anyItemFilled = items.some(it => (it.cantidad+it.peso+it.descripcion+it.precioUnitario).trim() !== "")
      const showSubtotal = anyItemFilled && subTotal > 0
      const hasTasa = (tasaImpuesto || "").trim() !== ""
      const hasEnvio = (envioGestion || "").trim() !== ""
      const hasOtro = (otro || "").trim() !== ""
      const totalShow = hasTasa || hasEnvio || hasOtro

      const { data: oc, error: ocErr } = await supabase
        .from('ordenes_compra')
        .insert([
          {
            numero_oc: (numeroOC || null),
            direccion,
            telefono,
            proveedor_empresa: provEmpresa,
            proveedor_telefono: provTelefono,
            proveedor_direccion: provDireccion,
            proveedor_ciudad: provCiudad,
            entrega_empresa: entEmpresa,
            entrega_telefono: entTelefono,
            entrega_direccion: entDireccion,
            entrega_ciudad: entCiudad,
            entrega_compania_flete: entCompaniaFlete || null,
            subtotal: showSubtotal ? subTotal : null,
            tasa_impuesto: hasTasa ? parseNum(tasaImpuesto) : null,
            impuesto: hasTasa && showSubtotal ? subTotal * ((parseNum(tasaImpuesto) || 0) / 100) : null,
            envio_gestion: hasEnvio ? parseNum(envioGestion) : null,
            otro: hasOtro ? parseNum(otro) : null,
            total: totalShow ? (subTotal + (hasTasa ? subTotal*((parseNum(tasaImpuesto)||0)/100) : 0) + (parseNum(envioGestion)||0) + (parseNum(otro)||0)) : null,
          }
        ])
        .select()
        .single()

      if (ocErr) throw ocErr

      const ordenId = oc.id
      if (oc.numero_oc && (!numeroOC || numeroOC !== oc.numero_oc)) {
        setNumeroOC(oc.numero_oc)
        try {
          const match = (oc.numero_oc || "").match(/(\d+)$/)
          if (match) {
            const used = parseInt(match[1])
            const current = parseInt(localStorage.getItem("po_last_number") || "0")
            if (!isNaN(used) && (isNaN(current) || used > current)) {
              localStorage.setItem("po_last_number", String(used))
            }
          }
        } catch {}
      }

      const itemsToInsert = items
        .filter(it => (it.cantidad+it.peso+it.descripcion+it.precioUnitario).trim() !== "")
        .map(it => {
          const cant = parseNum(it.cantidad) || 0
          const precio = parseNum(it.precioUnitario) || 0
          const valor = cant * precio
          return {
            orden_id: ordenId,
            cantidad: parseNum(it.cantidad),
            peso: parseNum(it.peso),
            descripcion: it.descripcion || null,
            precio_unitario: parseNum(it.precioUnitario),
            valor_total: valor > 0 ? valor : null,
          }
        })

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('orden_items').insert(itemsToInsert)
        if (itemsErr) throw itemsErr
      }

      toast({ title: 'Orden guardada', description: `OC ${oc.numero_oc || numeroOC || ''} guardada correctamente.` })

      // Limpiar formulario y preparar siguiente OC
      setDireccion("")
      setTelefono("")
      setProvEmpresa("")
      setProvTelefono("")
      setProvDireccion("")
      setProvCiudad("")
      setEntEmpresa("")
      setEntTelefono("")
      setEntDireccion("")
      setEntCiudad("")
      setEntCompaniaFlete("")
      setItems([
        { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
        { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
        { cantidad: "", peso: "", descripcion: "", precioUnitario: "" },
      ])
      setTasaImpuesto("")
      setEnvioGestion("")
      setOtro("")
      setNumeroOC(nextNumeroOC())
    } catch (e: any) {
      toast({ title: 'Error al guardar', description: e?.message || 'Error inesperado', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    const anyItemFilled = items.some(it => (it.cantidad+it.peso+it.descripcion+it.precioUnitario).trim() !== "")
    const showSubtotal = anyItemFilled && subTotal > 0
    const hasTasa = (tasaImpuesto || "").trim() !== ""
    const hasEnvio = (envioGestion || "").trim() !== ""
    const hasOtro = (otro || "").trim() !== ""
    const showImpuesto = hasTasa && showSubtotal
    const showTotal = hasTasa || hasEnvio || hasOtro

    const itemsRows = items
      .map(
        (it) => `
          <tr>
            <td class="cell center">${it.cantidad || ""}</td>
            <td class="cell center">${it.peso || ""}</td>
            <td class="cell">${(it.descripcion || "").replace(/</g, "&lt;")}</td>
            <td class="cell right">${it.precioUnitario ? `$ ${n(parseFloat((it.precioUnitario||'0').replace(',', '.'))||0)}` : ""}</td>
            <td class="cell right">${(() => {
              const cant = parseFloat((it.cantidad||'0').replace(',', '.'))||0
              const pr = parseFloat((it.precioUnitario||'0').replace(',', '.'))||0
              const val = cant*pr
              return val>0 ? `$ ${n(val)}` : ""
            })()}</td>
          </tr>`
      )
      .join("")

    const html = `
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Orden de Compra ${numeroOC || ""}</title>
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
            <div class="line">${direccion || ""}</div>
            <div class="label">Teléfono:</div>
            <div class="line">${telefono || ""}</div>
            <div class="label">Número de OC:</div>
            <div class="line">${numeroOC || ""}</div>
          </div>

          <div class="grid-2">
            <div class="box">
              <div class="label" style="margin-bottom:6px;">PROVEEDOR</div>
              <div class="row"><div class="label">Empresa:</div><div class="line">${provEmpresa || ""}</div></div>
              <div class="row"><div class="label">Teléfono:</div><div class="line">${provTelefono || ""}</div></div>
              <div class="row"><div class="label">Dirección:</div><div class="line">${provDireccion || ""}</div></div>
              <div class="row"><div class="label">Ciudad:</div><div class="line">${provCiudad || ""}</div></div>
            </div>
            <div class="box">
              <div class="label" style="margin-bottom:6px;">DIRECCIÓN DE ENTREGA</div>
              <div class="row"><div class="label">Empresa:</div><div class="line">${entEmpresa || ""}</div></div>
              <div class="row"><div class="label">Compañía de flete:</div><div class="line">${entCompaniaFlete || ""}</div></div>
              <div class="row"><div class="label">Teléfono:</div><div class="line">${entTelefono || ""}</div></div>
              <div class="row"><div class="label">Dirección:</div><div class="line">${entDireccion || ""}</div></div>
              <div class="row"><div class="label">Ciudad:</div><div class="line">${entCiudad || ""}</div></div>
            </div>
          </div>

          <!-- Se omite explícitamente la fila de encabezados de la segunda imagen -->

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
              ${Array.from({length: Math.max(0, 6 - items.length)}).map(() => `
                <tr>
                  <td class="cell">&nbsp;</td>
                  <td class="cell">&nbsp;</td>
                  <td class="cell">&nbsp;</td>
                  <td class="cell">&nbsp;</td>
                  <td class="cell">&nbsp;</td>
                </tr>`).join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="box note"></div>
            <div class="box">
              <div class="row"><div class="label">Subtotal:</div><div class="line" style="text-align:right">${showSubtotal ? `$ ${n(subTotal)}` : ""}</div></div>
              <div class="row"><div class="label">Tasa de impuesto:</div><div class="line" style="text-align:right">${hasTasa ? `${tasaImpuesto}%` : ""}</div></div>
              <div class="row"><div class="label">Impuesto:</div><div class="line" style="text-align:right">${showImpuesto ? `$ ${n(impuesto)}` : ""}</div></div>
              <div class="row"><div class="label">Envío y gestión:</div><div class="line" style="text-align:right">${hasEnvio ? `$ ${n(parseFloat(envioGestion.replace(',', '.'))||0)}` : ""}</div></div>
              <div class="row"><div class="label">Otro:</div><div class="line" style="text-align:right">${hasOtro ? `$ ${n(parseFloat(otro.replace(',', '.'))||0)}` : ""}</div></div>
              <div class="row"><div class="label">Total:</div><div class="line" style="text-align:right; font-weight:700;">${showTotal ? `$ ${n(total)}` : ""}</div></div>
            </div>
          </div>

          <div class="footer">
            <div>Autorizado por: ____________________________</div>
            <div>Fecha: ____ / ____ / ______</div>
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

    // Persistir el último número utilizado si coincide con el patrón
    try {
      const match = (numeroOC || "").match(/(\d+)$/)
      if (match) {
        const used = parseInt(match[1])
        const current = parseInt(localStorage.getItem("po_last_number") || "0")
        if (!isNaN(used) && (isNaN(current) || used > current)) {
          localStorage.setItem("po_last_number", String(used))
        }
      }
    } catch {}
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                Crear orden de compra
              </h1>
              <p className="text-muted-foreground">Complete el formulario y use Imprimir para generar el documento.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos generales</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número de OC</Label>
                  <Input value={numeroOC} onChange={(e) => setNumeroOC(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proveedor</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input value={provEmpresa} onChange={(e) => setProvEmpresa(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={provTelefono} onChange={(e) => setProvTelefono(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección</Label>
                    <Input value={provDireccion} onChange={(e) => setProvDireccion(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Ciudad</Label>
                    <Input value={provCiudad} onChange={(e) => setProvCiudad(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dirección de entrega</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input value={entEmpresa} onChange={(e) => setEntEmpresa(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Compañía de flete/envío</Label>
                    <Input value={entCompaniaFlete} onChange={(e) => setEntCompaniaFlete(e.target.value)} placeholder="Nombre de la empresa de transporte" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={entTelefono} onChange={(e) => setEntTelefono(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección</Label>
                    <Input value={entDireccion} onChange={(e) => setEntDireccion(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Ciudad</Label>
                    <Input value={entCiudad} onChange={(e) => setEntCiudad(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalle de ítems</CardTitle>
                <CardDescription>Esta tabla se imprime con el mismo diseño. La fila de encabezados de la segunda imagen fue eliminada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((row, idx) => (
                  <div key={idx} className="grid md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Cantidad</Label>
                      <Input value={row.cantidad} onChange={(e)=>updateRow(idx, 'cantidad', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Peso</Label>
                      <Input value={row.peso} onChange={(e)=>updateRow(idx, 'peso', e.target.value)} />
                    </div>
                    <div className="md:col-span-5 space-y-2">
                      <Label>Descripción</Label>
                      <Input value={row.descripcion} onChange={(e)=>updateRow(idx, 'descripcion', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Precio unitario</Label>
                      <Input value={row.precioUnitario} onChange={(e)=>updateRow(idx, 'precioUnitario', e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex gap-2">
                      <Button type="button" variant="outline" className="text-destructive" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addRow} className="gap-2">
                  <Plus className="h-4 w-4" /> Agregar fila
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Totales</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  {(() => {
                    const anyItemFilled = items.some(it => (it.cantidad+it.peso+it.descripcion+it.precioUnitario).trim() !== "")
                    const show = anyItemFilled && subTotal > 0
                    return <Input value={show ? `$ ${subTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ""} readOnly />
                  })()}
                </div>
                <div className="space-y-2">
                  <Label>Tasa de impuesto (%)</Label>
                  <Input value={tasaImpuesto} onChange={(e)=>setTasaImpuesto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Envío y gestión</Label>
                  <Input value={envioGestion} onChange={(e)=>setEnvioGestion(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Otro</Label>
                  <Input value={otro} onChange={(e)=>setOtro(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <Label>Total</Label>
                  {(() => {
                    const anyItemFilled = items.some(it => (it.cantidad+it.peso+it.descripcion+it.precioUnitario).trim() !== "")
                    const hasTasa = (tasaImpuesto || "").trim() !== ""
                    const hasEnvio = (envioGestion || "").trim() !== ""
                    const hasOtro = (otro || "").trim() !== ""
                    const show = hasTasa || hasEnvio || hasOtro
                    return <Input value={show ? `$ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ""} readOnly />
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
