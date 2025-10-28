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
