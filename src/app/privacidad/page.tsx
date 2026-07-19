import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | AgroVista",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-green-950 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-green-900/20 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-green-800/50">
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-green-50">Política de Privacidad</h1>
        <div className="space-y-6 text-gray-600 dark:text-green-100/80 leading-relaxed">
          
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">1. Marco Legal (Ley 25.326)</h2>
            <p>
              En cumplimiento con la Ley de Protección de Datos Personales (Ley 25.326) de la República Argentina, AgroVista garantiza la absoluta confidencialidad, privacidad y seguridad de la información ingresada por nuestros usuarios en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">2. Privacidad de sus Datos Agrícolas</h2>
            <p>
              Sabemos que la información de sus lotes, rendimientos, finanzas, y datos de sus empleados es el núcleo de su negocio. Le aseguramos formalmente que:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Todos sus datos de cosecha, logística, aplicaciones sanitarias y balances financieros están fuertemente encriptados.</li>
              <li>AgroVista **jamás venderá, alquilará ni compartirá** sus datos productivos o comerciales con terceros (otras empresas, proveedores de insumos, o entidades estatales) bajo ninguna circunstancia sin su consentimiento explícito.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">3. Uso de la Información</h2>
            <p>
              Los datos recopilados por AgroVista se utilizan única y exclusivamente para:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Brindarle a usted el servicio de gestión, tableros de control y mapas interactivos.</li>
              <li>Procesar las sugerencias locales mediante Inteligencia Artificial de forma anonimizada.</li>
              <li>Enviar notificaciones operativas relevantes para su negocio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">4. Derechos del Usuario</h2>
            <p>
              Como titular de los datos personales, usted tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses. Asimismo, tiene derecho a solicitar la rectificación, actualización o completa eliminación (derecho al olvido) de todos sus registros alojados en AgroVista enviándonos una solicitud a nuestro correo oficial de soporte: <strong>contactoagrovisionco@gmail.com</strong>.
            </p>
            <p className="mt-2 text-sm italic">
              "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales."
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-green-100">5. Seguridad de los Servidores</h2>
            <p>
              La información es almacenada en infraestructuras de nube de primer nivel (Google Cloud) con estrictas medidas de seguridad físicas y lógicas para evitar accesos no autorizados, alteraciones o pérdida de sus datos productivos.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
