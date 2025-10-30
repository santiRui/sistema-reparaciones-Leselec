import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const entryNumber = req.nextUrl.searchParams.get("entryNumber");
  if (!entryNumber) {
    return new Response(JSON.stringify({ error: "Número de ingreso requerido" }), { status: 400 });
  }

  // Normalizar: aceptar R-YYYY-XXX (3 dígitos) y R-YYYY-XXXX (4 dígitos)
  const raw = entryNumber.toUpperCase().trim();
  const match = raw.match(/^R-(\d{4})-(\d{1,4})$/);
  const variants = new Set<string>([raw]);
  if (match) {
    const year = match[1];
    const seq = parseInt(match[2], 10);
    if (!Number.isNaN(seq)) {
      variants.add(`R-${year}-${seq}`);
      variants.add(`R-${year}-${seq.toString().padStart(3, '0')}`);
      variants.add(`R-${year}-${seq.toString().padStart(4, '0')}`);
    }
  }

  // Buscar por cualquiera de las variantes posibles
  const { data: list, error } = await supabase
    .from("reparaciones")
    .select("*")
    .in("numero_ingreso", Array.from(variants))
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 });
  }

  const found = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (!found) {
    // Fallback: búsqueda por patrones (maneja espacios o variantes inesperadas)
    const likePatterns: string[] = [];
    likePatterns.push(`%${raw}%`);
    if (match) {
      const year = match[1];
      const seq = parseInt(match[2], 10);
      if (!Number.isNaN(seq)) {
        likePatterns.push(`R-${year}-%${seq}`);
        likePatterns.push(`R-${year}-%${seq.toString().padStart(3, '0')}`);
        likePatterns.push(`R-${year}-%${seq.toString().padStart(4, '0')}`);
      }
    }

    const orFilters = likePatterns.map(p => `numero_ingreso.ilike.${p}`).join(',');
    const { data: likeList, error: likeErr } = await supabase
      .from('reparaciones')
      .select('*')
      .or(orFilters)
      .order('id', { ascending: false })
      .limit(1);
    if (likeErr) {
      return new Response(JSON.stringify({ error: likeErr.message || String(likeErr) }), { status: 500 });
    }
    const likeFound = Array.isArray(likeList) && likeList.length > 0 ? likeList[0] : null;
    if (!likeFound) {
      return new Response(JSON.stringify({ error: "No se encontró reparación", tried: Array.from(variants), likeTried: likePatterns }), { status: 404 });
    }
    // Reasignar found con el hallado por patrón
    (found as any) = likeFound as any;
  }

  const [equiposRes, clienteRes, presupuestosRes, trabajosRes, entregasRes] = await Promise.all([
    supabase.from('equipos').select('*').eq('reparacion_id', found.id),
    supabase.from('clientes').select('*').eq('id', found.cliente_id).single(),
    supabase.from('presupuestos').select('*').eq('reparacion_id', found.id),
    supabase.from('trabajos_reparacion').select('*').eq('reparacion_id', found.id).single(),
    supabase.from('entregas').select('*').eq('reparacion_id', found.id),
  ]);

  // Armar objeto con misma forma que usaba el cliente
  const payload: any = {
    ...found,
    clientes: clienteRes.data || null,
    equipos: equiposRes.data || [],
    presupuestos: presupuestosRes.data || [],
    trabajos_reparacion: trabajosRes.data || null,
    entregas: entregasRes.data || [],
  };

  return new Response(JSON.stringify(payload), { status: 200 });
}
