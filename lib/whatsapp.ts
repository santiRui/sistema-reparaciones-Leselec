import fetch from "node-fetch";

// Envío de mensajes vía WhatsApp Cloud API
// Variables de entorno requeridas:
// - WHATSAPP_TOKEN (token de acceso de la app de Meta)
// - WHATSAPP_PHONE_ID (ID del número de teléfono de WhatsApp Business)

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

if (!WHATSAPP_TOKEN) console.warn("[whatsapp] Falta WHATSAPP_TOKEN");
if (!WHATSAPP_PHONE_ID) console.warn("[whatsapp] Falta WHATSAPP_PHONE_ID");

export async function sendWhatsapp(params: { to: string; text: string }) {
  console.log("[DEBUG] Iniciando envío de WhatsApp a:", params.to);

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error("[ERROR] Configuración de WhatsApp Cloud API incompleta");
    return;
  }

  const to = (params.to || "").replace(/\D/g, ""); // dejar solo dígitos
  if (!to) {
    console.warn("[WARN] Número de WhatsApp vacío o inválido, se omite envío");
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: params.text,
    },
  } as const;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[ERROR] Error al enviar WhatsApp", {
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      return;
    }

    console.log("[DEBUG] WhatsApp enviado correctamente:", data);
  } catch (error) {
    console.error("[ERROR] Excepción al enviar WhatsApp:", error);
  }
}
