import type { NextRequest } from "next/server";

// Simple wrapper to send emails via Resend REST API
// Required env vars:
// - RESEND_API_KEY
// - EMAIL_FROM (verified sender)
// - NEXT_PUBLIC_BASE_URL (for links in emails)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!RESEND_API_KEY) {
  console.warn("[email] RESEND_API_KEY no está configurado en el entorno.");
}
if (!EMAIL_FROM) {
  console.warn("[email] EMAIL_FROM no está configurado en el entorno.");
}

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error("La configuración de correo no está completa (RESEND_API_KEY/EMAIL_FROM)");
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Error enviando email (${resp.status}): ${txt}`);
  }
  return resp.json().catch(() => ({}));
}
