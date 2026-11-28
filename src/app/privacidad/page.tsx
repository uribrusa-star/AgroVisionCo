import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-green-950 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-green-900/20 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-green-800/50">
        <Link href="/#footer">
          <Button variant="ghost" className="mb-6 -ml-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-green-50 font-headline">Política de Privacidad</h1>
        <div className="space-y-6 text-gray-600 dark:text-green-100/80 leading-relaxed text-sm sm:text-base">
          
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">1. Marco Normativo (Ley Nº 25.326)</h2>
            <p>
              AgroVista ("la Plataforma") asume un compromiso estricto con la protección de la privacidad y los datos personales, en cabal cumplimiento de la <strong>Ley de Protección de Datos Personales Nº 25.326</strong>, su Decreto Reglamentario Nº 1558/2001 y las disposiciones emitidas por la <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>, autoridad de aplicación en la República Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">2. Privacidad de los Datos Agrícolas y Financieros</h2>
            <p>
              Reconocemos que la información productiva, de costos, recetas sanitarias y rindes por lote constituye el secreto operativo y comercial de cada productor. En tal sentido, garantizamos que:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li>Los datos ingresados se almacenan bajo cifrado de alto nivel tanto en tránsito (TLS 1.3 / SSL) como en reposo.</li>
              <li>AgroVista <strong>jamás venderá, alquilará, comercializará ni transferirá</strong> sus datos productivos o comerciales a terceras empresas (incluyendo semilleras, fabricantes de agroquímicos, acopios o entidades crediticias) bajo ninguna circunstancia sin su consentimiento expreso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">3. Tratamiento de Datos de Personal y Cuadrillas (Art. 25 Ley 25.326)</h2>
            <p>
              Respecto a los datos de terceros (nombre, DNI/identificador, legajo o código QR de cosecheros, recolectores y embaladores) cargados por el usuario para la gestión de jornales y asistencia:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li>El usuario actúa como <strong>Responsable del Tratamiento</strong>, asegurando contar con base legal para la carga de los datos.</li>
              <li>AgroVista interviene como <strong>Encargado del Tratamiento</strong>, procesando dicha información únicamente para posibilitar el pesaje en surco, la emisión de credenciales y la liquidación de kilos, sin explotar dichos datos para ningún fin secundario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">4. Finalidad de la Información e Inteligencia Artificial</h2>
            <p>
              Los datos recolectados se destinan exclusivamente a:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li>Proveer los paneles de gestión, mapas satelitales, bitácora y cálculo de costos en tiempo real.</li>
              <li>Generar predicciones de cosecha y monitoreo fenológico asistido por Inteligencia Artificial de forma agregada y anonimizada, sin exponer información identificable de su explotación.</li>
              <li>Remitir alertas operativas, avisos de heladas y notificaciones indispensables para el servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">5. Cookies y Almacenamiento Local</h2>
            <p>
              AgroVista emplea almacenamiento local (<code>localStorage</code>) y cookies técnicas estrictamente necesarias para autenticar la sesión del usuario, preservar el estado seguro de la cuenta y permitir el funcionamiento fuera de línea (PWA). No se utilizan cookies invasivas de rastreo publicitario de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">6. Derechos del Titular de los Datos (Derechos ARCO)</h2>
            <p>
              Usted tiene derecho a solicitar en cualquier momento el <strong>Acceso, Rectificación, Actualización o Supresión</strong> ("derecho al olvido") de sus datos personales. Para ejercer estos derechos, puede enviar una solicitud formal por correo electrónico a: <strong>contactoagrovisionco@gmail.com</strong> indicando su nombre, usuario y el objeto de su requerimiento.
            </p>
            <div className="mt-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 text-xs text-stone-600 dark:text-stone-300 space-y-2">
              <p className="font-semibold text-stone-800 dark:text-stone-100">
                Información requerida por la Resolución AAIP Nº 14/2018:
              </p>
              <p className="italic">
                "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326."
              </p>
              <p className="italic">
                "LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales."
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">7. Infraestructura y Seguridad</h2>
            <p>
              La información es almacenada en infraestructuras de nube de estándar internacional (Google Cloud / Firebase), sujetas a rigurosos protocolos de seguridad física y lógica, copias de seguridad automáticas y defensas perimetrales contra accesos no autorizados.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-green-800/50 flex justify-between items-center">
            <Link href="/#footer">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
