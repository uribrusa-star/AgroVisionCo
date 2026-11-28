import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  alternates: { canonical: '/terminos' },
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-green-950 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-green-900/20 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-green-800/50">
        <Link href="/#footer">
          <Button variant="ghost" className="mb-6 -ml-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-green-50 font-headline">Términos y Condiciones de Uso</h1>
        <div className="space-y-6 text-gray-600 dark:text-green-100/80 leading-relaxed text-sm sm:text-base">
          
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">1. Aceptación y Titularidad</h2>
            <p>
              Al acceder, registrarse o utilizar AgroVista ("la Plataforma"), usted declara ser mayor de edad con capacidad legal para contratar y acepta de forma plena estos Términos y Condiciones. AgroVista es una solución digital orientada al sector agrícola, desarrollada y gestionada con centro operativo en la localidad de Coronda, Provincia de Santa Fe, República Argentina, con canal oficial de contacto y soporte legal en <strong>contactoagrovisionco@gmail.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">2. Naturaleza del Servicio</h2>
            <p>
              AgroVista es una herramienta de asistencia operativa y tecnológica para la gestión de labores agrícolas, control de cuadrillas, costos de producción, fenología y trazabilidad. La Plataforma <strong>no reemplaza el criterio ni el asesoramiento profesional</strong> de ingenieros agrónomos matriculados, asesores fitosanitarios habilitados, contadores públicos o peritos comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">3. Tratamiento de Datos de Terceros y Cuadrillas (Art. 25 Ley 25.326)</h2>
            <p>
              Cuando el usuario (productor o encargado) registra datos laborales de terceros en la Plataforma —incluyendo cuadrillas de cosecheros, recolectores, embaladores y operarios— para el pesaje en surco, emisión de carnets con código QR o control de asistencia:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li>El <strong>Usuario / Productor</strong> reviste el carácter de <strong>Responsable del Tratamiento</strong> de dichos datos en los términos de la Ley 25.326, garantizando que cuenta con la debida legitimación, relación laboral o consentimiento informado para registrar dicha información en el sistema.</li>
              <li><strong>AgroVista</strong> actúa estrictamente en calidad de <strong>Encargado del Tratamiento</strong> (Art. 25 Ley 25.326), comprometiéndose a procesar la información exclusivamente por cuenta y orden del usuario para las funcionalidades del software, bajo estrictas medidas de seguridad y confidencialidad, y sin destinar los datos a ningún fin propio ni cederlos a terceros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">4. Exención de Responsabilidad</h2>
            <p>
              AgroVista no será responsable por daños directos, indirectos o lucro cesante derivados de la operatoria del usuario. En particular, nos desligamos de responsabilidad en los siguientes supuestos:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li>Inexactitudes o pérdidas económicas originadas por datos de pesaje, bultos, liquidaciones o rendimientos cargados erróneamente por el usuario o su personal.</li>
              <li>Afectaciones en cultivos originadas por la aplicación errónea de productos fitosanitarios o por interpretar las sugerencias automatizadas como prescripciones agronómicas vinculantes.</li>
              <li>Interrupciones temporales ocasionadas por fallas en la red de telefonía móvil, microcortes de conectividad rural, o caídas imprevistas de los proveedores de infraestructura en la nube.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">5. Suscripciones y Pasarelas de Pago</h2>
            <p>
              El acceso a planes pagos se gestiona mediante suscripciones periódicas. 
            </p>
            <p className="mt-2 text-xs sm:text-sm">
              <strong>Seguridad en los Pagos:</strong> Las transacciones monetarias se canalizan íntegramente a través de pasarelas de pago externas debidamente reguladas y certificadas (como <strong>Mercado Pago</strong> bajo estándares internacionales PCI-DSS). AgroVista <strong>nunca almacena, no tiene acceso ni procesa números de tarjetas de crédito o débito ni códigos de seguridad CVV</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">6. Derecho de Revocación y Cancelación (Leyes 24.240 y Resoluciones 424/2020 y 316/2018)</h2>
            <p>
              En cumplimiento con la normativa argentina de Defensa del Consumidor:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Plazo de Arrepentimiento:</strong> El usuario tiene derecho a revocar la contratación dentro de los <strong>diez (10) días corridos</strong> contados a partir de la fecha de suscripción inicial, sin costo ni penalidad alguna, solicitando el reintegro total escribiendo a <strong>contactoagrovisionco@gmail.com</strong>.</li>
              <li><strong>Baja del Servicio:</strong> El usuario podrá solicitar la baja de su plan de suscripción periódica en cualquier momento para evitar renovaciones futuras, mediante comunicación fehaciente al canal oficial de soporte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">7. Modelos de Inteligencia Artificial (Res. AAIP 244/2023)</h2>
            <p>
              Las proyecciones de cosecha, estimaciones fenológicas y alertas climáticas emitidas por herramientas de Inteligencia Artificial constituyen modelos estadísticos orientativos de carácter probabilístico. AgroVista no emplea información privada ni datos sensibles de las explotaciones para el entrenamiento de modelos de acceso público sin el consentimiento expreso del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">8. Disponibilidad y Modo Offline</h2>
            <p>
              AgroVista implementa tecnología PWA (Progressive Web App) y caché local para permitir la continuidad operativa frente a desconexiones transitorias en el lote. No obstante, no se garantiza la infalibilidad absoluta de los servicios ante cortes prolongados de energía o desastres climáticos que afecten las redes de comunicación.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">9. Propiedad Intelectual</h2>
            <p>
              El código fuente, arquitectura de software, marcas, logotipos, diseño de interfaz y algoritmos de AgroVista son propiedad intelectual exclusiva de sus creadores y están tutelados por la Ley 11.723 de Propiedad Intelectual de la República Argentina. Queda prohibida su reproducción, copia, distribución o ingeniería inversa sin autorización previa por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">10. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Ante cualquier controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Santa Fe, Provincia de Santa Fe, renunciando a cualquier otro fuero que pudiera corresponderles.
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
