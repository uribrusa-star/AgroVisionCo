import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | AgroVista",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-green-950 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-green-900/20 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-green-800/50">
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-green-50">Términos y Condiciones de Uso</h1>
        <div className="space-y-6 text-gray-600 dark:text-green-100/80 leading-relaxed">
          
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar AgroVista ("la Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá acceder a la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">2. Naturaleza del Servicio</h2>
            <p>
              AgroVista es una herramienta de asistencia tecnológica diseñada para facilitar la gestión de registros agrícolas, costos y rendimientos. La Plataforma **no reemplaza** el consejo profesional, agronómico o contable especializado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">3. Exención de Responsabilidad</h2>
            <p>
              AgroVista no se hace responsable por decisiones operativas, financieras o agronómicas tomadas en base a la información procesada por la plataforma. Especialmente, nos desligamos de toda responsabilidad en los siguientes casos:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Pérdidas económicas derivadas de datos de cosecha, logística o pagos ingresados incorrectamente por el usuario o sus empleados.</li>
              <li>Daños en cultivos ocasionados por el seguimiento inexacto de los protocolos de tratamiento sugeridos por la Inteligencia Artificial.</li>
              <li>Pérdida temporal de datos o inaccesibilidad del servicio debida a caídas del servidor, interrupciones de su proveedor de internet o falta de conectividad en el campo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">4. Disponibilidad del Sistema</h2>
            <p>
              Aunque nos esforzamos por mantener AgroVista en línea el 99% del tiempo, no garantizamos que el servicio será ininterrumpido, seguro o libre de errores. El usuario comprende que los servicios alojados en la nube pueden estar sujetos a tiempos de inactividad por mantenimiento o problemas técnicos ajenos a nuestro control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">5. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. El uso continuado de la plataforma después de publicar los cambios constituirá su aceptación de los mismos.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
