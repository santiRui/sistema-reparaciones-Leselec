"use client"
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RepairDetailPage({ params }: { params: Promise<{ numeroIngreso: string }> }) {
  const { numeroIngreso } = use(params);
  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRepair = async () => {
      const { data, error } = await supabase
        .from("reparaciones")
        .select("*, clientes(*), equipos(*), presupuestos(*), trabajos_reparacion(*), entregas(*)")
        .eq("numero_ingreso", numeroIngreso)
        .single();
      if (error || !data) {
        setRepair(null);
      } else {
        setRepair(data);
        const presupuestos = Array.isArray(data.presupuestos)
          ? [...data.presupuestos].sort((a: any, b: any) => (b?.id || 0) - (a?.id || 0))
          : (data.presupuestos ? [data.presupuestos] : []);
        const last = presupuestos && presupuestos.length > 0 ? presupuestos[0] : null;
        const entrega = Array.isArray(data.entregas) ? data.entregas[0] : data.entregas;
        if ((last && last.rechazado === true) || (entrega && entrega.motivo === 'rechazo_presupuesto')) {
          setRejected(true);
        }
      }
      setLoading(false);
    };
    fetchRepair();
  }, [numeroIngreso]);

  const handleMockPayDeposit = async () => {
    if (!repair || processing) return;
    setProcessing(true);
    try {
      // Si fue rechazado, el botón naranja abona diagnóstico y pasa a entrega
      if (rejected) {
        // Crear/asegurar registro en entregas en estado pendiente
        await supabase
          .from('entregas')
          .upsert([
            {
              reparacion_id: repair.id,
              estado_entrega: 'pendiente',
              motivo: 'rechazo_presupuesto',
            } as any,
          ], { onConflict: 'reparacion_id' } as any);

        // Marcar diagnóstico abonado en el presupuesto
        const { data: lastPresPay } = await supabase
          .from('presupuestos')
          .select('id')
          .eq('reparacion_id', repair.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        if (lastPresPay?.id) {
          const { error: updErr } = await supabase
            .from('presupuestos')
            .update({ diagnostico_abonado: true } as any)
            .eq('id', lastPresPay.id);
          if (updErr) {
            console.error('Supabase update presupuestos (rechazado->diagnostico_abonado) error:', updErr);
            toast({ variant: 'destructive', title: 'No se pudo marcar diagnóstico abonado', description: String(updErr?.message || updErr) });
            return;
          }
        }

        const { error } = await supabase
          .from('reparaciones')
          .update({ estado_actual: 'entrega', fecha_actualizacion: new Date().toISOString() })
          .eq('id', repair.id);
        if (error) {
          toast({ variant: 'destructive', title: 'No se pudo mover a entrega', description: 'Intenta nuevamente.' });
        } else {
          toast({ title: 'Diagnóstico abonado', description: 'La reparación pasó a Entrega por presupuesto rechazado.' });
          const { data, error: refetchError } = await supabase
            .from('reparaciones')
            .select('*, clientes(*), equipos(*), presupuestos(*), trabajos_reparacion(*)')
            .eq('numero_ingreso', numeroIngreso)
            .single();
          if (!refetchError && data) {
            setRepair(data);
          }
        }
        return;
      }

      // Flujo normal: abono de seña+diagnóstico y paso a reparación
      const { data: lastPresNorm }: any = await supabase
        .from('presupuestos')
        .select('id, se\u00f1a')
        .eq('reparacion_id', repair.id)
        .order('id', { ascending: false })
        .limit(1)
        .single();
      if (lastPresNorm?.id) {
        const setSeña = Number((lastPresNorm as any)['seña'] || 0) > 0;
        const { error: updDiagErr } = await supabase
          .from('presupuestos')
          .update({ diagnostico_abonado: true } as any)
          .eq('id', lastPresNorm.id);
        if (updDiagErr) {
          console.error('Supabase update presupuestos (diagnostico_abonado) error:', updDiagErr);
          toast({ variant: 'destructive', title: 'No se pudo registrar el abono en presupuesto', description: String(updDiagErr?.message || updDiagErr) });
          return;
        }
        if (setSeña) {
          // Intento 1: columna con tilde
          const tryTilde = await supabase
            .from('presupuestos')
            .update({ ['seña_abonada']: true } as any)
            .eq('id', lastPresNorm.id);
          if (tryTilde.error) {
            console.warn('Columna seña_abonada no encontrada, probando senia_abonada:', tryTilde.error);
            // Intento 2: columna sin tilde
            const tryNoTilde = await supabase
              .from('presupuestos')
              .update({ senia_abonada: true } as any)
              .eq('id', lastPresNorm.id);
            if (tryNoTilde.error) {
              console.warn('No se pudo marcar seña abonada en ninguna variante:', tryNoTilde.error);
              // No detenemos el flujo; diagnóstico quedó abonado y se avanza de etapa igual
            }
          }
        }
      }

      const { error } = await supabase
        .from('reparaciones')
        .update({ estado_actual: 'reparacion', fecha_actualizacion: new Date().toISOString() })
        .eq('id', repair.id);
      if (error) {
        toast({
          variant: "destructive",
          title: "No se pudo registrar el pago",
          description: "Ocurrió un error registrando el abono. Intenta nuevamente.",
        });
      } else {
        toast({
          title: "Pago registrado",
          description: "Se registró el abono. La reparación avanzó a 'Reparación'.",
        });
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
          // Tomar siempre el presupuesto más reciente por id
          const presupuesto = Array.isArray(repair.presupuestos)
            ? [...repair.presupuestos].sort((a: any, b: any) => (b?.id || 0) - (a?.id || 0))[0]
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
            {(presupuesto as any)['seña'] && (
              <div>
                <b>Seña:</b> $ {Number((presupuesto as any)['seña']).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2 })}
                {(() => {
                  const rawSenia: any = (presupuesto as any)?.senia_abonada ?? (presupuesto as any)?.['seña_abonada'];
                  const seniaAb = rawSenia === true || rawSenia === 'true' || rawSenia === 't' || rawSenia === 1 || rawSenia === '1' || repair.estado_actual !== 'presupuesto';
                  return (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border font-medium"
                      style={{
                        color: seniaAb ? '#166534' : '#374151',
                        borderColor: seniaAb ? '#16a34a' : '#d1d5db',
                        background: seniaAb ? '#dcfce7' : '#f9fafb'
                      }}>
                      {seniaAb ? 'Abonado' : 'Pendiente'}
                    </span>
                  );
                })()}
              </div>
            )}
            {typeof presupuesto.diagnostico === 'number' && (
              <div>
                <b>Diagnóstico:</b> $ {Number(presupuesto.diagnostico).toLocaleString('es-AR', { style: 'decimal', minimumFractionDigits: 2 })}
                {(() => {
                  const rawDiag: any = (presupuesto as any)?.diagnostico_abonado;
                  const diagAb = rawDiag === true || rawDiag === 'true' || rawDiag === 't' || rawDiag === 1 || rawDiag === '1' || repair.estado_actual !== 'presupuesto';
                  const fueRechazado = Boolean((presupuesto as any)?.rechazado);
                  return (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border font-medium"
                    style={{
                      color: fueRechazado ? '#9a3412' : (diagAb ? '#166534' : '#374151'),
                      borderColor: fueRechazado ? '#f97316' : (diagAb ? '#16a34a' : '#d1d5db'),
                      background: fueRechazado ? '#ffedd5' : (diagAb ? '#dcfce7' : '#f9fafb')
                    }}>
                    {fueRechazado ? 'Rechazado' : (diagAb ? 'Abonado' : 'Pendiente')}
                  </span>
                  );
                })()}
              </div>
            )}
            {(Number((presupuesto as any)['seña'] || 0) > 0 || Number(presupuesto.diagnostico || 0) > 0) && (() => {
              const rawDiag: any = (presupuesto as any)?.diagnostico_abonado;
              const diagAb = rawDiag === true || rawDiag === 'true' || rawDiag === 't' || rawDiag === 1 || rawDiag === '1';
              const rawSenia: any = (presupuesto as any)?.senia_abonada ?? (presupuesto as any)?.['seña_abonada'];
              const seniaAb = rawSenia === true || rawSenia === 'true' || rawSenia === 't' || rawSenia === 1 || rawSenia === '1';
              const haySeña = Number((presupuesto as any)['seña'] || 0) > 0;
              const fueRechazado = rejected || Boolean((presupuesto as any)?.rechazado);

              // Cuando ya está abonado, mostrar leyenda y ocultar botones
              if (diagAb && (!haySeña || (haySeña && seniaAb))) {
                return (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                       style={{ color: fueRechazado ? '#9a3412' : '#166534', borderColor: fueRechazado ? '#fdba74' : '#86efac', background: fueRechazado ? '#fff7ed' : '#ecfdf5' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.146-.088l4.09-5.5z" clipRule="evenodd" />
                    </svg>
                    <span>{fueRechazado ? 'Presupuesto rechazado — Diagnóstico abonado' : (haySeña ? 'Seña y diagnóstico abonados' : 'Diagnóstico abonado')}</span>
                  </div>
                );
              }

              // Si ya no está en etapa de presupuesto pero el diagnóstico está abonado, ocultar botones y mostrar leyenda
              if (repair.estado_actual !== 'presupuesto') {
                return (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                       style={{ color: fueRechazado ? '#9a3412' : '#166534', borderColor: fueRechazado ? '#fdba74' : '#86efac', background: fueRechazado ? '#fff7ed' : '#ecfdf5' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.146-.088l4.09-5.5z" clipRule="evenodd" />
                    </svg>
                    <span>{fueRechazado ? 'Presupuesto rechazado — Diagnóstico abonado' : (haySeña && seniaAb ? 'Seña y diagnóstico abonados' : 'Diagnóstico abonado')}</span>
                  </div>
                );
              }

              // Si no está abonado todavía, mostrar botones según flujo
              return (
                <div className="mt-6 flex flex-col md:flex-row gap-4">
                  {!fueRechazado ? (
                    <>
                      <button
                        className="bg-[#43A047] text-white px-4 py-2 rounded hover:bg-[#388E3C] transition shadow-md"
                        onClick={handleMockPayDeposit}
                        disabled={processing || repair.estado_actual !== 'presupuesto'}
                      >
                        {haySeña ? 'Abonar Seña + Diagnóstico' : 'Abonar Diagnóstico y continuar'}
                      </button>
                      <button
                        className="bg-[#E57373] text-white px-4 py-2 rounded hover:bg-[#C62828] transition shadow-md"
                        onClick={() => setOpenRejectDialog(true)}
                        disabled={processing}
                      >
                        Rechazar Presupuesto
                      </button>
                    </>
                  ) : (
                    <button
                      className="bg-[#F59E0B] text-white px-4 py-2 rounded hover:bg-[#D97706] transition shadow-md"
                      onClick={handleMockPayDeposit}
                      disabled={processing}
                    >
                      Abonar Diagnóstico
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Diálogo de confirmación de rechazo */}
            <AlertDialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Rechazar presupuesto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Si rechaza el presupuesto su reparación será desestimada y deberá abonar de igual manera el importe por diagnóstico.
                    <br />
                    <br />
                    Por cualquier duda o consulta llamar al número <b>3875018530</b> o escribir al correo <b>info.leselec@gmail.com</b>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      // Persistir rechazo en el último presupuesto
                      const { data: lastPres } = await supabase
                        .from('presupuestos')
                        .select('id')
                        .eq('reparacion_id', repair.id)
                        .order('id', { ascending: false })
                        .limit(1)
                        .single();
                      if (lastPres?.id) {
                        await supabase
                          .from('presupuestos')
                          .update({ rechazado: true } as any)
                          .eq('id', lastPres.id);
                      }
                      // Mover a entrega inmediatamente con motivo
                      await supabase
                        .from('entregas')
                        .upsert([
                          { reparacion_id: repair.id, estado_entrega: 'pendiente', motivo: 'rechazo_presupuesto' } as any
                        ], { onConflict: 'reparacion_id' } as any);
                      await supabase
                        .from('reparaciones')
                        .update({ estado_actual: 'entrega', fecha_actualizacion: new Date().toISOString() })
                        .eq('id', repair.id);
                      setRejected(true);
                      setOpenRejectDialog(false);
                      toast({ title: 'Presupuesto rechazado', description: 'La reparación pasó a Entrega. Debe abonar el diagnóstico para retirar.' });
                    }}
                  >
                    Rechazar de todas formas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
