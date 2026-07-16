import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Leaf, BarChart3, MapPin } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="AgroVision Logo" width={32} height={32} />
          <span className="text-xl font-bold text-green-800 font-headline">AgroVision</span>
        </div>
        <nav>
          <Link href="/login">
            <Button variant="outline" className="text-green-700 border-green-600 hover:bg-green-50">
              Iniciar Sesión
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 lg:px-8 py-32 md:py-48 overflow-hidden bg-green-950">
          {/* Background Image with opacity */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/dashboard_mockup.png"
              alt="AgroVision Background"
              fill
              className="object-cover opacity-20"
              unoptimized={true}
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-950 via-transparent to-green-900/50"></div>
          </div>
          
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white font-headline drop-shadow-md">
              Trazabilidad Agrícola Inteligente para la Producción de Frutillas
            </h1>
            <p className="mt-6 text-lg leading-8 text-green-50 max-w-3xl mx-auto drop-shadow-sm">
              AgroVision es la plataforma integral diseñada específicamente para optimizar el rendimiento, 
              controlar la sanidad y maximizar las ganancias de tus lotes de frutillas. Con inteligencia artificial, 
              reportes agronómicos y mapas interactivos en tiempo real.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/login">
                <Button size="lg" className="bg-green-500 hover:bg-green-400 text-green-950 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all font-bold">
                  Comenzar Ahora
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-headline">
                Todo lo que necesitas para tu campo
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Lleva el control exacto de tus cosechas, monitorea la fenología de las plantas y toma decisiones informadas basadas en datos reales.
              </p>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col items-start">
                  <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full">
                     <Image src="/dashboard_mockup.png" alt="Bitácora" width={800} height={500} unoptimized={true} className="object-cover h-56 w-full hover:scale-105 transition-transform duration-500" />
                  </div>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                    <Leaf className="h-6 w-6 text-green-600 flex-none" />
                    Bitácora Agronómica
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Registra riegos, fertilizaciones, aplicaciones sanitarias y estados fenológicos en una interfaz fácil e intuitiva.</p>
                  </dd>
                </div>
                
                <div className="flex flex-col items-start">
                  <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full bg-green-50 flex items-center justify-center">
                     <Image src="/logo.png" alt="Informes PDF" width={120} height={120} className="opacity-80 object-contain h-56 py-4 hover:scale-110 transition-transform duration-500" />
                  </div>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                    <BarChart3 className="h-6 w-6 text-green-600 flex-none" />
                    Informes con IA
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Genera reportes técnicos PDF en segundos. Nuestro consultor impulsado por Google Gemini analiza tus datos y te da recomendaciones clave.</p>
                  </dd>
                </div>

                <div className="flex flex-col items-start">
                  <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full">
                     <Image src="/map_mockup.png" alt="Mapas" width={800} height={500} unoptimized={true} className="object-cover h-56 w-full hover:scale-105 transition-transform duration-500" />
                  </div>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                    <MapPin className="h-6 w-6 text-green-600 flex-none" />
                    Mapas Interactivos
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">Visualiza el rendimiento de tus lotes en un mapa satelital. Descubre zonas de alta producción o posibles áreas de riesgo al instante.</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 mt-auto">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} AgroVision. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5493424276932?text=Hola%20buenas%2C%20me%20comunico%20para%20consultar%20sobre%20el%20sistema%20AgroVision."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-xl hover:bg-[#1ebe57] hover:scale-110 transition-all z-50 flex items-center justify-center group"
        aria-label="Contactar por WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </a>
    </div>
  );
}
