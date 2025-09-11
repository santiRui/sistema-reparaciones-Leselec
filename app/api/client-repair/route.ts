import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest) {
  const entryNumber = req.nextUrl.searchParams.get("entryNumber");
  if (!entryNumber) {
    return new Response(JSON.stringify({ error: "Número de ingreso requerido" }), { status: 400 });
  }

  const { data: found, error } = await supabase
    .from("reparaciones")
    .select("*")
    .eq("numero_ingreso", entryNumber)
    .single();

  if (error || !found) {
    return new Response(JSON.stringify({ error: "No se encontró reparación" }), { status: 404 });
  }

  const [{ data: equipo }, { data: cliente }] = await Promise.all([
    supabase.from("equipos").select("*").eq("reparacion_id", found.id).single(),
    supabase.from("clientes").select("*").eq("id", found.cliente_id).single(),
  ]);

  let estado = "Recepción";
  switch (found.estado_actual) {
    case "presupuesto": estado = "Presupuesto"; break;
    case "reparacion": estado = "Reparación"; break;
    case "entrega": estado = "Entrega"; break;
    case "facturacion": estado = "Facturación"; break;
  }

  return new Response(JSON.stringify({
    numeroIngreso: found.numero_ingreso,
    equipo: equipo?.tipo_equipo || "",
    marca: equipo?.marca || "",
    numeroSerie: equipo?.numero_serie || "",
    cliente: cliente ? `${cliente.nombre} ${cliente.apellido}` : "",
    dniCuil: cliente?.dni_cuil || "",
    estado,
    fechaIngreso: found.fecha_creacion.split("T")[0],
    observaciones: found.observaciones_recepcion || "",
  }), { status: 200 });
}
