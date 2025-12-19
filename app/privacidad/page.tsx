"use client";

import React from "react";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <header className="text-center space-y-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OT3bqWGGUTwASGyHFkHBFvPbvVlQID.png"
            alt="LESELEC INGENIERÍA"
            className="mx-auto h-16 w-auto mb-2"
          />
          <h1 className="text-3xl font-bold">Política de Privacidad</h1>
          <p className="text-muted-foreground text-sm">
            Sistema de gestión de reparaciones de Leselec – Protección, integridad y confidencialidad de los datos.
          </p>
        </header>

        <section className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-4 text-sm leading-relaxed">
          <p>
            En Leselec valoramos profundamente la privacidad y la seguridad de la información de nuestros clientes.
            Esta página describe de forma clara y sencilla cómo tratamos los datos personales dentro del sistema de
            reparaciones en línea.
          </p>

          <h2 className="text-lg font-semibold mt-4">1. Datos que recopilamos</h2>
          <p>En el contexto de la gestión de reparaciones podemos almacenar, entre otros:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Datos de identificación: nombre, apellido, DNI/CUIL.</li>
            <li>Datos de contacto: correo electrónico, número de teléfono y, en algunos casos, WhatsApp.</li>
            <li>Datos relacionados con la reparación: número de ingreso, equipo, marca, número de serie, estado y observaciones.</li>
            <li>Historial de estados de la reparación y comunicaciones asociadas (correos y notificaciones).</li>
          </ul>

          <h2 className="text-lg font-semibold mt-4">2. Finalidad del tratamiento</h2>
          <p>Utilizamos estos datos exclusivamente para:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Registrar, administrar y hacer seguimiento de las reparaciones solicitadas.</li>
            <li>Notificar al cliente sobre el estado de su reparación (recepción, presupuesto, lista de entrega, etc.).</li>
            <li>Cumplir con obligaciones legales, contables y administrativas.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-4">3. Integridad y seguridad de la información</h2>
          <p>
            Implementamos medidas técnicas y organizativas razonables para proteger la integridad y confidencialidad de
            los datos, entre ellas:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Transmisión de la información mediante conexiones cifradas (HTTPS) cuando corresponde.</li>
            <li>Control de acceso restringido al sistema, limitado al personal autorizado de Leselec.</li>
            <li>Uso de proveedores de infraestructura y correo que cumplen estándares de seguridad reconocidos.</li>
            <li>Registros y trazabilidad de operaciones críticas sobre los datos de reparaciones.</li>
          </ul>

          <p>
            Aunque ningún sistema es infalible, trabajamos constantemente para mejorar nuestras prácticas de seguridad y
            minimizar los riesgos de acceso no autorizado, pérdida, alteración o divulgación indebida de la información.
          </p>

          <h2 className="text-lg font-semibold mt-4">4. Conservación de los datos</h2>
          <p>
            Los datos se conservan durante el tiempo necesario para gestionar la reparación, cumplir con obligaciones
            legales y atender posibles reclamos posteriores. Transcurridos esos plazos, procuramos anonimizar o
            eliminar la información que ya no sea necesaria.
          </p>

          <h2 className="text-lg font-semibold mt-4">5. Derechos de los titulares de los datos</h2>
          <p>
            De acuerdo con la normativa vigente en materia de protección de datos, los titulares pueden solicitar el
            acceso, rectificación, actualización o supresión de su información personal, en la medida en que sea
            legalmente posible.
          </p>
          <p>
            Para ejercer estos derechos o realizar consultas sobre privacidad, podés comunicarte con nosotros a través
            del correo electrónico de contacto indicado en nuestros canales oficiales.
          </p>

          <h2 className="text-lg font-semibold mt-4">6. Actualizaciones de esta política</h2>
          <p>
            Esta política de privacidad puede actualizarse en el futuro para reflejar cambios en el sistema de
            reparaciones, en la normativa aplicable o en nuestras prácticas internas. La versión vigente estará siempre
            disponible en esta misma dirección: <span className="font-mono">/privacidad</span>.
          </p>

          <p className="text-muted-foreground text-xs mt-4">
            Última actualización: {new Date().toLocaleDateString("es-AR")}
          </p>
        </section>
      </div>
    </main>
  );
}
