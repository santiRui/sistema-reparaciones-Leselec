import { NextRequest, NextResponse } from 'next/server'

// Idealmente pon este valor en una variable de entorno (por ejemplo, process.env.WHATSAPP_VERIFY_TOKEN)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'leselec-whatsapp-token-123'

// Verificación del webhook (Meta hace un GET con hub.mode, hub.verify_token, hub.challenge)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    // Meta espera que devolvamos el challenge en texto plano
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Token de verificación inválido' }, { status: 403 })
}

// Recepción de mensajes y eventos de WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Por ahora solo logueamos todo lo que llega, para debug inicial
    console.log('Webhook WhatsApp recibido:', JSON.stringify(body, null, 2))

    // Meta requiere un 200 OK para considerar entregado el webhook
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Error procesando webhook de WhatsApp:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
