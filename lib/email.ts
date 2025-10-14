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

// Debug: Mostrar configuraciones (sin contraseña)
console.log('[DEBUG] Configuración SMTP:', {
  SMTP_HOST,
  SMTP_PORT,
  EMAIL_USER,
  EMAIL_FROM,
  hasPassword: !!EMAIL_PASS
});

if (!SMTP_HOST) console.warn("[email] Falta SMTP_HOST");
if (!SMTP_PORT) console.warn("[email] Falta SMTP_PORT");
if (!EMAIL_USER) console.warn("[email] Falta EMAIL_USER");
if (!EMAIL_PASS) console.warn("[email] Falta EMAIL_PASS");
if (!EMAIL_FROM) console.warn("[email] Falta EMAIL_FROM");

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  console.log('[DEBUG] Creando transporter SMTP...');
  if (transporter) {
    console.log('[DEBUG] Usando transporter existente');
    return transporter;
  }
  
  if (!SMTP_HOST || !SMTP_PORT || !EMAIL_USER || !EMAIL_PASS) {
    const error = "Configuración SMTP incompleta (SMTP_HOST/SMTP_PORT/EMAIL_USER/EMAIL_PASS)";
    console.error('[ERROR]', error);
    throw new Error(error);
  }
  
  try {
    const options = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // SSL en 465, STARTTLS en 587
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      // Para ver más detalles de depuración
      debug: true,
      logger: true
    };
    
    console.log('[DEBUG] Configuración del transporter:', {
      ...options,
      auth: { ...options.auth, pass: '***' } // No mostrar la contraseña en logs
    });
    
    transporter = nodemailer.createTransport(options);
    
    // Verificar la conexión SMTP
    transporter.verify(function(error, success) {
      if (error) {
        console.error('[ERROR] Error al verificar la conexión SMTP:', error);
      } else {
        console.log('[DEBUG] Conexión SMTP verificada correctamente');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('[ERROR] Error al crear el transporter SMTP:', error);
    throw error;
  }
}

export async function sendEmail(params: { to: string; subject: string; html: string; replyTo?: string }) {
  console.log('[DEBUG] Iniciando envío de correo a:', params.to);
  console.log('[DEBUG] Asunto:', params.subject);
  
  if (!EMAIL_FROM) {
    const error = "EMAIL_FROM no está configurado";
    console.error('[ERROR]', error);
    throw new Error(error);
  }
  
  try {
    // Verificar que los parámetros requeridos estén presentes
    if (!params.to) {
      throw new Error('El destinatario (to) es requerido');
    }
    
    const tx = getTransporter();
    const mailOptions = {
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject || '(Sin asunto)',
      html: params.html || '',
      replyTo: params.replyTo,
    };
    
    console.log('[DEBUG] Opciones del correo:', {
      ...mailOptions,
      html: mailOptions.html ? '[HTML content]' : 'No HTML content'
    });
    
    // Enviar el correo
    const info = await tx.sendMail(mailOptions);
    
    // Verificar que la respuesta del envío sea válida
    if (!info) {
      console.error('[ERROR] No se recibió respuesta del servidor SMTP');
      throw new Error('No se pudo enviar el correo: respuesta del servidor SMTP inválida');
    }
    
    // Usar un ID de mensaje generado si no está presente
    const messageId = info.messageId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[DEBUG] Correo enviado exitosamente. Message ID:', messageId);
    
    // Devolver siempre un objeto con messageId, incluso si es generado
    return { 
      messageId,
      response: info.response || '250 Message accepted for delivery',
      envelope: info.envelope || { from: EMAIL_FROM, to: [params.to] }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al enviar el correo';
    console.error('[ERROR] Error al enviar el correo:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      to: params.to,
      subject: params.subject
    });
    
    // Lanzar un error más descriptivo
    throw new Error(`Error al enviar el correo: ${errorMessage}`);
  }
}
