import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, reparacionId, numeroIngreso } = body as {
      type: "recepcion" | "presupuesto" | "lista_entrega";
      reparacionId?: string | number;
      numeroIngreso?: string;
    };

    if (!type) {
      return new Response(JSON.stringify({ error: "Falta 'type'" }), { status: 400 });
    }

    // Buscar reparación por id o por numero de ingreso
    let reparacion: any | null = null;
    if (reparacionId) {
      const { data, error } = await supabase.from("reparaciones").select("*").eq("id", reparacionId).single();
      if (error) throw error;
      reparacion = data;
    } else if (numeroIngreso) {
      const { data, error } = await supabase.from("reparaciones").select("*").eq("numero_ingreso", numeroIngreso).single();
      if (error) throw error;
      reparacion = data;
    } else {
      return new Response(JSON.stringify({ error: "Se requiere 'reparacionId' o 'numeroIngreso'" }), { status: 400 });
    }

    if (!reparacion) {
      return new Response(JSON.stringify({ error: "Reparación no encontrada" }), { status: 404 });
    }

    // Datos asociados
    const [{ data: equipos }, { data: cliente }, { data: presupuesto }, { data: trabajo }] = await Promise.all([
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const numero = reparacion.numero_ingreso;

    const to = (cliente?.email || "").trim();
    if (!to) {
      return new Response(JSON.stringify({ error: "Cliente sin email" }), { status: 400 });
    }

    const recepcionista = reparacion.recepcionista || "";

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
      const misReparacionesUrl = baseUrl ? `${baseUrl}/client-login` : "";
      const consultaDirectaUrl = baseUrl ? `${baseUrl}/repair/${encodeURIComponent(numero)}` : "";
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
        ${consultaDirectaUrl ? `<p class="muted">Acceso directo: <a href="${consultaDirectaUrl}">${consultaDirectaUrl}</a></p>` : ""}
      `;
      await sendEmail({ to, subject: `Recepción N° ${numero} registrada`, html });
    }

    if (type === "presupuesto") {
      const misReparacionesUrl = baseUrl ? `${baseUrl}/client-login` : "";
      const consultaDirectaUrl = baseUrl ? `${baseUrl}/repair/${encodeURIComponent(numero)}` : "";
      const html = `
        ${styles}
        <h2>Presupuesto disponible</h2>
        <p>Hola ${cliente?.nombre || ""} ${cliente?.apellido || ""}, ya está disponible el presupuesto de tu reparación.</p>
        <div class="card">
          <div><strong>N° de Ingreso:</strong> ${numero}</div>
          <div><strong>Diagnóstico de la falla:</strong> ${presupuesto?.diagnostico_falla || "-"}</div>
          <div><strong>Proceso de reparación:</strong> ${presupuesto?.descripcion_proceso || "-"}</div>
          <div><strong>Repuestos necesarios:</strong> ${presupuesto?.repuestos_necesarios || "-"}</div>
          <div><strong>Importe:</strong> ${typeof presupuesto?.importe_total === "number" ? presupuesto!.importe_total.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-"}</div>
          <div><strong>Seña:</strong> ${typeof (presupuesto as any)?.seña === "number" ? (presupuesto as any).seña.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-"}</div>
        </div>
        <p>Deberás abonar la <strong>seña</strong> de forma presencial o desde la web en la sección <strong>Mis Reparaciones</strong> ingresando con el número de ingreso. Una vez abonada, iniciaremos el proceso de reparación.</p>
        <p>Ante cualquier consulta, comunícate con <strong>LESELEC</strong>.</p>
        ${misReparacionesUrl ? `<p><a class="btn" href="${misReparacionesUrl}" target="_blank">Ir a Mis Reparaciones</a></p>` : ""}
        ${consultaDirectaUrl ? `<p class="muted">Acceso directo: <a href="${consultaDirectaUrl}">${consultaDirectaUrl}</a></p>` : ""}
      `;
      await sendEmail({ to, subject: `Presupuesto disponible - Ingreso ${numero}` , html });
    }

    if (type === "lista_entrega") {
      const html = `
        ${styles}
        <h2>Reparación finalizada: lista para entregar</h2>
        <p>Hola ${cliente?.nombre || ""} ${cliente?.apellido || ""}, tu reparación ya está <strong>finalizada</strong> y lista para retirar en nuestra sucursal.</p>
        <div class="card">
          <div><strong>N° de Ingreso:</strong> ${numero}</div>
          <div><strong>Fecha de Ingreso:</strong> ${reparacion.fecha_creacion?.split("T")[0] || "-"}</div>
        </div>
        <div class="card">
          <h3>Resumen</h3>
          <p><strong>Recepción:</strong> Observaciones: ${reparacion.observaciones_recepcion || "-"}</p>
          <p><strong>Presupuesto:</strong> Diagnóstico: ${presupuesto?.diagnostico_falla || "-"} • Importe: ${typeof presupuesto?.importe_total === "number" ? presupuesto!.importe_total.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-"} • Seña: ${typeof (presupuesto as any)?.seña === "number" ? (presupuesto as any).seña.toLocaleString("es-AR", {minimumFractionDigits:2}) : "-"}</p>
          <p><strong>Reparación:</strong> Estado: ${(trabajo as any)?.estado_reparacion || "completada"} • Encargado: ${(trabajo as any)?.encargado_reparacion || "-"}</p>
        </div>
        <p>Te esperamos para coordinar la entrega en nuestra sucursal.</p>
      `;
      await sendEmail({ to, subject: `Lista para retirar - Ingreso ${numero}` , html });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error("/api/notifications error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Error" }), { status: 500 });
  }
}
