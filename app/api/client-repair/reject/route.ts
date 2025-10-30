import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const reparacionId = Number(body?.reparacionId)
    if (!reparacionId || Number.isNaN(reparacionId)) {
      return NextResponse.json({ error: 'reparacionId inválido' }, { status: 400 })
    }

    // Marcar rechazado en el último presupuesto
    const { data: lastPres, error: presErr } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('reparacion_id', reparacionId)
      .order('id', { ascending: false })
      .limit(1)
      .single()
    if (presErr && presErr.code !== 'PGRST116') {
      return NextResponse.json({ error: presErr.message || String(presErr) }, { status: 500 })
    }

    if (lastPres?.id) {
      const { error: updErr } = await supabase
        .from('presupuestos')
        .update({ rechazado: true } as any)
        .eq('id', lastPres.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Crear/asegurar entrega pendiente con motivo rechazo
    await supabase
      .from('entregas')
      .upsert([{ reparacion_id: reparacionId, estado_entrega: 'pendiente', motivo: 'rechazo_presupuesto' } as any], { onConflict: 'reparacion_id' } as any)

    // Mover la reparación a entrega
    const { error: updRepErr } = await supabase
      .from('reparaciones')
      .update({ estado_actual: 'entrega', fecha_actualizacion: new Date().toISOString() })
      .eq('id', reparacionId)
    if (updRepErr) return NextResponse.json({ error: updRepErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}
