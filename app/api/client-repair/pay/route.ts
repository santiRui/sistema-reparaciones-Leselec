import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const reparacionId = Number(body?.reparacionId)
    const rejected = Boolean(body?.rejected)
    if (!reparacionId || Number.isNaN(reparacionId)) {
      return NextResponse.json({ error: 'reparacionId inválido' }, { status: 400 })
    }

    // Tomar el último presupuesto
    const { data: lastPres, error: presErr } = await supabase
      .from('presupuestos')
      .select('id, "seña"')
      .eq('reparacion_id', reparacionId)
      .order('id', { ascending: false })
      .limit(1)
      .single()
    if (presErr && presErr.code !== 'PGRST116') {
      return NextResponse.json({ error: presErr.message || String(presErr) }, { status: 500 })
    }

    if (lastPres?.id) {
      const { error: updDiagErr } = await supabase
        .from('presupuestos')
        .update({ diagnostico_abonado: true } as any)
        .eq('id', lastPres.id)
      if (updDiagErr) return NextResponse.json({ error: updDiagErr.message }, { status: 500 })

      const tieneSenia = Number((lastPres as any)['seña'] || 0) > 0
      if (tieneSenia) {
        // Marcar seña abonada intentando ambas variantes de columna
        const tryTilde = await supabase
          .from('presupuestos')
          .update({ ['seña_abonada']: true } as any)
          .eq('id', lastPres.id)
        if (tryTilde.error) {
          const tryNoTilde = await supabase
            .from('presupuestos')
            .update({ senia_abonada: true } as any)
            .eq('id', lastPres.id)
          // Si falla, no detenemos el flujo
        }
      }
    }

    if (rejected) {
      // A entrega por rechazo
      await supabase
        .from('entregas')
        .upsert([{ reparacion_id: reparacionId, estado_entrega: 'pendiente', motivo: 'rechazo_presupuesto' } as any], { onConflict: 'reparacion_id' } as any)
      const { error: updRepErr } = await supabase
        .from('reparaciones')
        .update({ estado_actual: 'entrega', fecha_actualizacion: new Date().toISOString() })
        .eq('id', reparacionId)
      if (updRepErr) return NextResponse.json({ error: updRepErr.message }, { status: 500 })
    } else {
      // Flujo normal a reparacion
      const { error: updRepErr } = await supabase
        .from('reparaciones')
        .update({ estado_actual: 'reparacion', fecha_actualizacion: new Date().toISOString() })
        .eq('id', reparacionId)
      if (updRepErr) return NextResponse.json({ error: updRepErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}
