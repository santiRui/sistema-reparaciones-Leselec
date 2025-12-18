import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { sendWhatsapp } from "@/lib/whatsapp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  console.log('[DEBUG] Iniciando solicitud POST a /api/notifications');
  try {
    const body = await req.json();
    console.log('[DEBUG] Cuerpo de la solicitud:', JSON.stringify(body, null, 2));
    
    const { type, reparacionId, numeroIngreso } = body as {
      type: "recepcion" | "presupuesto" | "lista_entrega";
      reparacionId?: string | number;
      numeroIngreso?: string;
    };
    
    console.log('[DEBUG] Parámetros recibidos:', { type, reparacionId, numeroIngreso });

    if (!type) {
      return new Response(JSON.stringify({ error: "Falta 'type'" }), { status: 400 });
    }

    // Buscar reparación por id o por numero de ingreso
    let reparacion: any | null = null;
    try {
      if (reparacionId) {
        console.log(`[DEBUG] Buscando reparación por ID: ${reparacionId}`);
        const { data, error } = await supabase.from("reparaciones").select("*").eq("id", reparacionId).single();
        if (error) {
          console.error('[ERROR] Error al buscar reparación por ID:', error);
          throw error;
        }
        reparacion = data;
      } else if (numeroIngreso) {
        console.log(`[DEBUG] Buscando reparación por número de ingreso: ${numeroIngreso}`);
        const { data, error } = await supabase.from("reparaciones").select("*").eq("numero_ingreso", numeroIngreso).single();
        if (error) {
          console.error('[ERROR] Error al buscar reparación por número de ingreso:', error);
          throw error;
        }
        reparacion = data;
      } else {
        const errorMsg = "Se requiere 'reparacionId' o 'numeroIngreso'";
        console.error('[ERROR]', errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('[ERROR] Error al buscar la reparación:', error);
      return new Response(JSON.stringify({ 
        error: 'Error al buscar la reparación',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!reparacion) {
      const errorMsg = `Reparación no encontrada (ID: ${reparacionId}, Número: ${numeroIngreso})`;
      console.error('[ERROR]', errorMsg);
      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: 'No se encontró la reparación con los parámetros proporcionados'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[DEBUG] Reparación encontrada:', JSON.stringify(reparacion, null, 2));

    // Datos asociados
    console.log('[DEBUG] Obteniendo datos asociados a la reparación...');
    let equipos, cliente, presupuesto, trabajo;
    
    try {
      const [equiposResult, clienteResult, presupuestoResult, trabajoResult] = await Promise.all([
        supabase.from("equipos").select("*").eq("reparacion_id", reparacion.id),
        supabase.from("clientes").select("*").eq("id", reparacion.cliente_id).single(),
        supabase
          .from("presupuestos")
          .select("*")
          .eq("reparacion_id", reparacion.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("trabajos_reparacion").select("*").eq("reparacion_id", reparacion.id).maybeSingle(),
      ]);
      
      equipos = equiposResult.data;
      cliente = clienteResult.data;
      presupuesto = presupuestoResult.data;
      trabajo = trabajoResult.data;
      
      console.log('[DEBUG] Datos obtenidos:', {
        equiposCount: equipos?.length || 0,
        cliente: cliente ? 'Encontrado' : 'No encontrado',
        presupuesto: presupuesto ? 'Encontrado' : 'No encontrado',
        trabajo: trabajo ? 'Encontrado' : 'No encontrado'
      });
      
      if (equiposResult.error) console.error('[ERROR] Error al obtener equipos:', equiposResult.error);
      if (clienteResult.error) console.error('[ERROR] Error al obtener cliente:', clienteResult.error);
      if (presupuestoResult.error) console.error('[ERROR] Error al obtener presupuesto:', presupuestoResult.error);
      if (trabajoResult.error) console.error('[ERROR] Error al obtener trabajo:', trabajoResult.error);
      
    } catch (error) {
      console.error('[ERROR] Error al obtener datos asociados:', error);
      return new Response(JSON.stringify({ 
        error: 'Error al obtener datos de la reparación',
        details: error instanceof Error ? error.message : 'Error desconocido al obtener datos asociados'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const numero = reparacion.numero_ingreso;
    
    console.log('[DEBUG] Configuración de URL base:', { baseUrl, VERCEL_URL: process.env.VERCEL_URL, NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL });

    const to = (cliente?.email || "").trim();
    const whatsappNumber = (cliente?.telefono || "").toString().trim();
    if (!to) {
      const errorMsg = `Cliente sin email (ID: ${reparacion.cliente_id})`;
      console.error('[ERROR]', errorMsg);
      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: 'No se puede enviar la notificación sin una dirección de correo electrónico'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[DEBUG] Enviando notificación a:', to, 'Tipo:', type, 'WhatsApp:', whatsappNumber || 'N/D');

    let recepcionista = reparacion.recepcionista || "";
    if (!recepcionista && reparacion.creado_por) {
      try {
        const { data: personalData, error: personalError } = await supabase
          .from("personal")
          .select("nombre_completo")
          .eq("id", reparacion.creado_por)
          .single();
        if (!personalError && personalData?.nombre_completo) {
          recepcionista = personalData.nombre_completo;
        }
      } catch (e) {
        console.warn('[WARN] No se pudo obtener nombre del recepcionista desde personal:', e);
      }
    }

    const equiposHtml = Array.isArray(equipos)
      ? equipos
          .map(
            (eq: any) => `
            <div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #eee;">
              <div><strong>Equipo:</strong> ${eq.tipo_equipo} (x${eq.cantidad || 1})</div>
              <div><strong>Marca:</strong> ${eq.marca}</div>
              <div><strong>N° Serie:</strong> ${eq.numero_serie}</div>
              <div><strong>Potencia:</strong> ${eq.potencia || "-"}</div>
              <div><strong>Tensión:</strong> ${eq.tension || "-"}</div>
              <div><strong>Revoluciones:</strong> ${eq.revoluciones || "-"}</div>
            </div>`
          )
          .join("")
      : "";

    const styles = `
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111}
        .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:10px 0}
        .btn{display:inline-block;background:#0056A6;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none}
        .muted{color:#6b7280;font-size:12px}
        h2{color:#0056A6}
      </style>
    `;

    if (type === "recepcion") {
      const misReparacionesUrl = "https://sistema-reparaciones-leselec-gules.vercel.app/client-login";
      const fechaIngreso = reparacion.fecha_creacion?.split("T")[0] || "-";
      const equiposTexto = Array.isArray(equipos)
        ? equipos
            .map((eq: any) => `${eq.tipo_equipo || "Equipo"} x${eq.cantidad || 1}`)
            .join(", ")
        : "";

      const whatsappTextLines = [
        `Recepción registrada`,
        `N° de Ingreso: ${numero}`,
        `Fecha: ${fechaIngreso}`,
        equiposTexto ? `Equipos: ${equiposTexto}` : "",
        "",
        "Puedes seguir tu reparación en Mis Reparaciones:",
        misReparacionesUrl,
      ].filter(Boolean);

      const html = `
        ${styles}
        <h2>Recepción registrada</h2>
        <p>Hola ${cliente?.nombre || ""} ${cliente?.apellido || ""}, registramos tu reparación.</p>
        <div class="card">
          <div><strong>N° de Ingreso:</strong> ${numero}</div>
          <div><strong>Fecha de Ingreso:</strong> ${reparacion.fecha_creacion?.split("T")[0] || "-"}</div>
          <div><strong>Recepcionista:</strong> ${recepcionista || "-"}</div>
        </div>
        <div class="card">
          <div><strong>Equipos:</strong></div>
          ${equiposHtml || "<div>-</div>"}
        </div>
        <p>Puedes ingresar a <strong>Mis Reparaciones</strong> con tu número de ingreso y ver el estado en tiempo real:</p>
        ${misReparacionesUrl ? `<p><a class="btn" href="${misReparacionesUrl}" target="_blank">Ir a Mis Reparaciones</a></p>` : ""}
      `;
      await sendEmail({ to, subject: `Recepción N° ${numero} registrada`, html });

      if (whatsappNumber) {
        try {
          await sendWhatsapp({
            to: whatsappNumber,
            text: whatsappTextLines.join("\n"),
          });
        } catch (e) {
          console.warn('[WARN] No se pudo enviar WhatsApp de recepción:', e);
        }
      }
    }

    if (type === "presupuesto") {
      try {
        const misReparacionesUrl = "https://sistema-reparaciones-leselec-gules.vercel.app/client-login";
        const trackingUrl = misReparacionesUrl;
        
        console.log('[DEBUG] Generando HTML para notificación de presupuesto...');
        
        const importeTotal = typeof presupuesto?.importe_total === "number" ? 
          presupuesto.importe_total.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-";
        const senia = typeof (presupuesto as any)?.seña === "number" ? 
          (presupuesto as any).seña.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-";
        const diagnosticoMonto = typeof (presupuesto as any)?.diagnostico === "number" ?
          (presupuesto as any).diagnostico.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-";
        
        const html = `
          ${styles}
          <h2>Presupuesto disponible</h2>
          <p>Hola ${cliente?.nombre || ""} ${cliente?.apellido || ""}, ya está disponible el presupuesto de tu reparación.</p>
          <div class="card">
            <div><strong>N° de Ingreso:</strong> ${numero}</div>
          </div>
          <div class="card">
            <div><strong>Equipos:</strong></div>
            ${equiposHtml || "<div>-</div>"}
          </div>
          <div class="card">
            <div><strong>Diagnóstico de la falla:</strong> ${presupuesto?.diagnostico_falla || "-"}</div>
            <div><strong>Proceso de reparación:</strong> ${presupuesto?.descripcion_proceso || "-"}</div>
            <div><strong>Repuestos necesarios:</strong> ${presupuesto?.repuestos_necesarios || "-"}</div>
            <div><strong>Importe:</strong> ${importeTotal}</div>
            <div><strong>Seña:</strong> ${senia}</div>
            <div><strong>Diagnóstico:</strong> ${diagnosticoMonto}</div>
          </div>
          <p>Puedes abonar la <strong>seña</strong> y el <strong>diagnóstico</strong> directamente desde la <strong>página de seguimiento</strong> o acercarte presencialmente a abonarlos para avanzar con la reparación.</p>
          ${trackingUrl ? `<p><a class=\"btn\" href=\"${trackingUrl}\" target=\"_blank\">Ir a la página de seguimiento</a></p>` : ""}
          <p>Ante cualquier duda o consulta, puedes responder a este correo o comunicarte al <strong>3875018530</strong>.</p>
          ${misReparacionesUrl ? `<p class="muted">También puedes ingresar a <strong>Mis Reparaciones</strong> con tu número de ingreso.</p>` : ""}
        `;
        
        console.log('[DEBUG] Enviando correo de presupuesto...');
        await sendEmail({ 
          to, 
          subject: `Presupuesto disponible - Ingreso ${numero}`, 
          html,
          replyTo: process.env.EMAIL_USER
        });
        console.log('[DEBUG] Correo de presupuesto enviado exitosamente');

        if (whatsappNumber) {
          const equiposTexto = Array.isArray(equipos)
            ? equipos
                .map((eq: any) => `${eq.tipo_equipo || "Equipo"} x${eq.cantidad || 1}`)
                .join(", ")
            : "";

          const whatsappTextLines = [
            `Presupuesto disponible`,
            `Ingreso: ${numero}`,
            equiposTexto ? `Equipos: ${equiposTexto}` : "",
            `Importe: ${importeTotal}`,
            `Seña: ${senia}`,
            `Diagnóstico: ${diagnosticoMonto}`,
            "",
            "Puedes ver y abonar la seña/diagnóstico en:",
            trackingUrl,
          ].filter(Boolean);

          try {
            await sendWhatsapp({
              to: whatsappNumber,
              text: whatsappTextLines.join("\n"),
            });
          } catch (e) {
            console.warn('[WARN] No se pudo enviar WhatsApp de presupuesto:', e);
          }
        }
        
      } catch (error) {
        console.error('[ERROR] Error al enviar correo de presupuesto:', error);
        throw new Error(`Error al enviar correo de presupuesto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    if (type === "lista_entrega") {
      try {
        console.log('[DEBUG] Generando HTML para notificación de lista de entrega...');
        
        const importeTotal = typeof presupuesto?.importe_total === "number" ? 
          presupuesto.importe_total.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-";
        const senia = typeof (presupuesto as any)?.seña === "number" ? 
          (presupuesto as any).seña.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-";
        
        const html = `
          ${styles}
          <h2>Reparación finalizada: lista para retirar</h2>
          <p>Hola ${cliente?.nombre || ""} ${cliente?.apellido || ""}, tu reparación ya está <strong>finalizada</strong> y lista para retirar.</p>
          <div class="card">
            <div><strong>N° de Ingreso:</strong> ${numero}</div>
            <div><strong>Fecha de Ingreso:</strong> ${reparacion.fecha_creacion?.split("T")[0] || "-"}</div>
          </div>
          <div class="card">
            <h3>Equipos</h3>
            ${equiposHtml || "<div>-</div>"}
          </div>
          <div class="card">
            <h3>Resumen</h3>
            <p><strong>Presupuesto:</strong> Diagnóstico: ${presupuesto?.diagnostico_falla || "-"} • Importe: ${importeTotal} • Seña: ${senia}</p>
            <p><strong>Reparación:</strong> Estado: ${(trabajo as any)?.estado_reparacion || "completada"} • Encargado: ${(trabajo as any)?.encargado_reparacion || "-"}</p>
          </div>
          <p><strong>Retiro en:</strong> Zabala 117</p>
          <p><strong>Horarios:</strong><br/>
          Lunes a viernes de 09:00 hs a 13:00 hs<br/>
          15:00 hs a 18:30 hs<br/>
          o sábados de 09:30 hs a 12:30 hs.</p>
        `;
        
        console.log('[DEBUG] Enviando correo de lista de entrega...');
        await sendEmail({ 
          to, 
          subject: `Lista para retirar - Ingreso ${numero}`, 
          html,
          replyTo: process.env.EMAIL_USER
        });
        console.log('[DEBUG] Correo de lista de entrega enviado exitosamente');

        if (whatsappNumber) {
          const equiposTexto = Array.isArray(equipos)
            ? equipos
                .map((eq: any) => `${eq.tipo_equipo || "Equipo"} x${eq.cantidad || 1}`)
                .join(", ")
            : "";

          const whatsappTextLines = [
            `Reparación finalizada - lista para retirar`,
            `Ingreso: ${numero}`,
            equiposTexto ? `Equipos: ${equiposTexto}` : "",
            `Importe: ${importeTotal}`,
            `Seña: ${senia}`,
            "",
            "Retiro en: Zabala 117",
            "Horarios:",
            "Lunes a viernes 09:00-13:00 y 15:00-18:30",
            "Sábados 09:30-12:30",
          ].filter(Boolean);

          try {
            await sendWhatsapp({
              to: whatsappNumber,
              text: whatsappTextLines.join("\n"),
            });
          } catch (e) {
            console.warn('[WARN] No se pudo enviar WhatsApp de lista de entrega:', e);
          }
        }
        
      } catch (error) {
        console.error('[ERROR] Error al enviar correo de lista de entrega:', error);
        throw new Error(`Error al enviar correo de lista de entrega: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    console.log('[DEBUG] Notificación procesada exitosamente');
    return new Response(JSON.stringify({ 
      ok: true,
      message: 'Notificación enviada correctamente'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err: any) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const errorMessage = err?.message || 'Error desconocido al procesar la notificación';
    
    console.error(`[ERROR ${errorId}] /api/notifications error:`, err);
    
    return new Response(JSON.stringify({ 
      error: 'Error al procesar la notificación',
      message: errorMessage,
      errorId,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
