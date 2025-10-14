import nodemailer from "nodemailer";

// Envío de correos vía SMTP (Gmail u otro proveedor)
// Variables de entorno requeridas:
// - SMTP_HOST (ej: smtp.gmail.com)
// - SMTP_PORT (ej: 465 para SSL o 587 para STARTTLS)
// - EMAIL_USER (usuario/correo SMTP)
// - EMAIL_PASS (password o app password)
// - EMAIL_FROM (remitente visible: "Nombre <correo@dominio>")

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!SMTP_HOST) console.warn("[email] Falta SMTP_HOST");
if (!SMTP_PORT) console.warn("[email] Falta SMTP_PORT");
if (!EMAIL_USER) console.warn("[email] Falta EMAIL_USER");
if (!EMAIL_PASS) console.warn("[email] Falta EMAIL_PASS");
if (!EMAIL_FROM) console.warn("[email] Falta EMAIL_FROM");

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Configuración SMTP incompleta (SMTP_HOST/SMTP_PORT/EMAIL_USER/EMAIL_PASS)");
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // SSL en 465, STARTTLS en 587
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  return transporter;
}

export async function sendEmail(params: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!EMAIL_FROM) {
    throw new Error("EMAIL_FROM no está configurado");
  }
  const tx = getTransporter();
  const info = await tx.sendMail({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });
  return { messageId: info.messageId };
}
