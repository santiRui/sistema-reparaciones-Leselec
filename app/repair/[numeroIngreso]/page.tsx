"use client"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { use } from "react";

export default function RepairDetailPage({ params }: { params: Promise<{ numeroIngreso: string }> }) {
  const { numeroIngreso } = use(params);
  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchRepair = async () => {
      const { data, error } = await supabase
        .from("reparaciones")
        .select("*, clientes(*), equipos(*), presupuestos(*), trabajos_reparacion(*)")
        .eq("numero_ingreso", numeroIngreso)
        .single();
      if (error || !data) {
        setRepair(null);
      } else {
        setRepair(data);
      }
      setLoading(false);
    };
    fetchRepair();
  }, [numeroIngreso]);

  const handleMockPayDeposit = async () => {
    if (!repair || processing) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('reparaciones')
        .update({ estado_actual: 'reparacion', fecha_actualizacion: new Date().toISOString() })
        .eq('id', repair.id);
      if (error) {
        alert('No se pudo registrar el pago de la seña.');
      } else {
        alert('Seña registrada como abonada. La reparación avanzó a Reparación.');
        const { data, error: refetchError } = await supabase
          .from('reparaciones')
          .select('*, clientes(*), equipos(*), presupuestos(*), trabajos_reparacion(*)')
          .eq('numero_ingreso', numeroIngreso)
          .single();
        if (!refetchError && data) {
          setRepair(data);
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!repair) return <div className="p-8 text-red-600">No se encontró la reparación.</div>;

  // Puedes mejorar el diseño con los mismos componentes que usas en page.tsx
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-2">
          {/* Logo SVG elegante */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" fill="#E3F2FD" stroke="#90CAF9" strokeWidth="2"/>
            <path d="M16 32L24 16L32 32" stroke="#1976D2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="28" r="2.5" fill="#1976D2"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-[#1976D2]">Detalle de Reparación</h1>
        <p className="text-[#607D8B]">N° de Ingreso: <span className="font-mono font-semibold">{repair.numero_ingreso}</span></p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          {repair.clientes?.nombre && (
            <div className="mb-2"><strong>Nombre:</strong> {repair.clientes.nombre} {repair.clientes.apellido}</div>
          )}
          {repair.clientes?.dniCuil && (
            <div className="mb-2"><strong>DNI/CUIL:</strong> {repair.clientes.dniCuil}</div>
          )}
          {repair.clientes?.email && (
            <div className="mb-2"><strong>Email:</strong> {repair.clientes.email}</div>
          )}
          {repair.clientes?.telefono && (
            <div className="mb-2"><strong>Teléfono:</strong> {repair.clientes.telefono}</div>
          )}
          {repair.clientes?.direccion && (
            <div className="mb-2"><strong>Dirección:</strong> {repair.clientes.direccion}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-[#1976D2]">Estado y Fechas</h2>
          <div className="mb-2"><strong>Estado:</strong> <span className="inline-block px-2 py-1 rounded bg-[#BBDEFB] text-[#1976D2] font-semibold">{repair.estado_actual}</span></div>
          <div className="mb-2"><strong>Fecha de Ingreso:</strong> {repair.fecha_creacion?.split('T')[0]}</div>
        </div>
      </div>
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-blue-800">Equipos Asociados</h2>
        {Array.isArray(repair.equipos) && repair.equipos.length > 0 ? (
          <ul className="space-y-2">
            {repair.equipos.map((eq: any, idx: number) => (
              <li key={eq.id || idx} className="border-b pb-2">
                <div><b>Tipo:</b> {eq.tipo_equipo}</div>
                <div><b>Marca:</b> {eq.marca}</div>
                <div><b>N° Serie:</b> {eq.numero_serie}</div>
                <div><b>Cantidad:</b> {eq.cantidad}</div>
                <div><b>Potencia:</b> {eq.potencia || '-'}</div>
                <div><b>Tensión:</b> {eq.tension || '-'}</div>
                <div><b>Revoluciones:</b> {eq.revoluciones || '-'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground">No hay equipos asociados.</div>
        )}
      </div>
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-blue-800">Presupuesto y Reparación</h2>
        {(() => {
          // Soporte para presupuestos como array o como objeto
          const presupuesto = Array.isArray(repair.presupuestos)
            ? repair.presupuestos[0]
            : repair.presupuestos;
          return presupuesto ? <>
            {presupuesto.diagnostico_falla && (
              <div><b>Diagnóstico de Falla:</b> {presupuesto.diagnostico_falla}</div>
            )}
            {presupuesto.descripcion_proceso && (
              <div><b>Descripción del Proceso:</b> {presupuesto.descripcion_proceso}</div>
            )}
            {presupuesto.repuestos_necesarios && (
              <div><b>Repuestos:</b> {presupuesto.repuestos_necesarios}</div>
            )}
            {presupuesto.importe_total && (
              <div><b>Importe Total:</b> $ {Number(presupuesto.importe_total).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2 })}</div>
            )}
            {presupuesto.seña && (
              <div><b>Seña:</b> $ {Number(presupuesto.seña).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2 })}</div>
            )}
            {presupuesto.seña && Number(presupuesto.seña) > 0 && (
              <div className="mt-6 flex flex-col md:flex-row gap-4">
                <button
                  className="bg-[#43A047] text-white px-4 py-2 rounded hover:bg-[#388E3C] transition shadow-md"
                  onClick={handleMockPayDeposit}
                  disabled={processing || repair.estado_actual !== 'presupuesto'}
                >
                  Abonar Seña
                </button>
                <button
                  className="bg-[#E57373] text-white px-4 py-2 rounded hover:bg-[#C62828] transition shadow-md"
                  disabled
                >
                  Rechazar Presupuesto
                </button>
              </div>
            )}
          </> : <div className="text-muted-foreground">Sin información de presupuesto disponible.</div>;
        })()}
        {repair.trabajos_reparacion?.encargado_reparacion && (
          <div><b>Encargado Reparación:</b> {repair.trabajos_reparacion.encargado_reparacion}</div>
        )}
        {repair.trabajos_reparacion?.armador && (
          <div><b>Armador:</b> {repair.trabajos_reparacion.armador}</div>
        )}
        {repair.trabajos_reparacion?.observaciones_reparacion && (
          <div><b>Observaciones Reparación:</b> {repair.trabajos_reparacion.observaciones_reparacion}</div>
        )}
        {repair.trabajos_reparacion?.estado_reparacion && (
          <div><b>Estado Reparación:</b> {repair.trabajos_reparacion.estado_reparacion}</div>
        )}
      </div>
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-blue-800">Datos del/los Equipo(s)</h2>
        {Array.isArray(repair.equipos) && repair.equipos.length > 0 ? (
          <ul className="space-y-2">
            {repair.equipos.map((eq: any, idx: number) => (
              <li key={eq.id || idx} className="border-b pb-2">
                <div><b>Equipo:</b> {eq.tipo_equipo} (x{eq.cantidad || 1})</div>
                <div><b>Marca:</b> {eq.marca}</div>
                <div><b>N° Serie:</b> {eq.numero_serie}</div>
                <div><b>Potencia:</b> {eq.potencia || '-'} • <b>Tensión:</b> {eq.tension || '-'} • <b>Revoluciones:</b> {eq.revoluciones || '-'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground">No hay equipos asociados.</div>
        )}
      </div>
    </div>
  );
}
