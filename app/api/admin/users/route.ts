import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

async function getRequesterRole(token?: string) {
  if (!token) return null
  // Verificar token y obtener user
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) return null
  const userId = userData.user.id
  // Consultar rol en personal usando el anon key + bearer
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: persona } = await supabase.from('personal').select('rol, activo').eq('user_id', userId).single()
  if (!persona?.activo) return null
  return persona.rol as string
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined
    const role = await getRequesterRole(token)
    if (role !== 'encargado') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('personal')
      .select('correo, nombre_completo, rol, activo')
      .order('nombre_completo', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ users: data || [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined
    const role = await getRequesterRole(token)
    if (role !== 'encargado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { correo, nombre_completo, rol, activo = true, claveTemporal, enviarReset } = body as {
      correo: string
      nombre_completo: string
      rol: 'encargado' | 'ventas' | 'taller'
      activo?: boolean
      claveTemporal?: string
      enviarReset?: boolean
    }

    if (!correo || !nombre_completo || !rol) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Crear o localizar usuario Auth
    const list = await supabaseAdmin.auth.admin.listUsers()
    const found = list.data.users.find(u => u.email?.toLowerCase() === correo.toLowerCase())
    let userId = found?.id
    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password: claveTemporal || undefined,
        email_confirm: true,
      })
      if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 })
      userId = created.data.user?.id
      if (!userId) return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 400 })
      if (enviarReset) {
        await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: correo })
      }
    }

    // Upsert en personal
    const upsert = await supabaseAdmin.from('personal').upsert({
      user_id: userId,
      correo,
      nombre_completo,
      rol,
      activo: !!activo,
    }, { onConflict: 'correo' }).select().single()
    if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 400 })

    return NextResponse.json({ ok: true, usuario: upsert.data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  // Acción: reset password link
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined
    const role = await getRequesterRole(token)
    if (role !== 'encargado') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const { correo } = body as { correo: string }
    if (!correo) return NextResponse.json({ error: 'Correo requerido' }, { status: 400 })

    const res = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: correo })
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined
    const role = await getRequesterRole(token)
    if (role !== 'encargado') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const correo = (body?.correo || '').toString().trim().toLowerCase()
    if (!correo) return NextResponse.json({ error: 'Correo requerido' }, { status: 400 })

    // Obtener requester para prevenir auto-eliminación
    const requester = token ? await supabaseAdmin.auth.getUser(token) : null
    const requesterEmail = requester?.data?.user?.email?.toLowerCase()
    if (requesterEmail && requesterEmail === correo) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    // Verificar si el objetivo es encargado activo y si es el último
    const targetRes = await supabaseAdmin
      .from('personal')
      .select('rol, activo')
      .eq('correo', correo)
      .single()
    if (targetRes.error && targetRes.error.code !== 'PGRST116') {
      return NextResponse.json({ error: targetRes.error.message }, { status: 400 })
    }
    const target = targetRes.data
    if (!target) {
      // Si no existe en tabla personal, intentar borrar en Auth por si quedó colgado
      const list = await supabaseAdmin.auth.admin.listUsers()
      const found = list.data.users.find(u => u.email?.toLowerCase() === correo)
      if (found?.id) await supabaseAdmin.auth.admin.deleteUser(found.id)
      return NextResponse.json({ ok: true })
    }

    if (target.rol === 'encargado' && target.activo) {
      const { data: encargados, error: encErr } = await supabaseAdmin
        .from('personal')
        .select('correo')
        .eq('rol', 'encargado')
        .eq('activo', true)
      if (encErr) return NextResponse.json({ error: encErr.message }, { status: 400 })
      if ((encargados || []).length <= 1) {
        return NextResponse.json({ error: 'No se puede eliminar el último usuario Encargado activo' }, { status: 400 })
      }
    }

    // 1) Borrar de tabla personal
    const delDb = await supabaseAdmin.from('personal').delete().eq('correo', correo)
    if (delDb.error) return NextResponse.json({ error: delDb.error.message }, { status: 400 })

    // 2) Borrar del Auth si existe
    const list = await supabaseAdmin.auth.admin.listUsers()
    const found = list.data.users.find(u => u.email?.toLowerCase() === correo)
    if (found?.id) {
      const delAuth = await supabaseAdmin.auth.admin.deleteUser(found.id)
      if (delAuth.error) {
        // Si falla el borrado en Auth, devolver 207 Multi-Status-like
        return NextResponse.json({ ok: false, warning: 'El usuario se eliminó de la base, pero no de Auth. Intente nuevamente.' }, { status: 207 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}
