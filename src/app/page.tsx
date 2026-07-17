"use client";

import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Leaf, BarChart3, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppDataContext } from '@/context/app-data-context.tsx';

export default function LandingPage() {
  const { currentUser } = useContext(AppDataContext);
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-green-950">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b dark:border-green-800 bg-background/95 dark:bg-green-950/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="AgroVision Logo" width={32} height={32} />
          <span className="text-xl font-bold text-green-800 dark:text-green-400 font-headline">AgroVision</span>
        </div>
        <nav>
          <Link href="/login">
            <Button variant="outline" className="text-green-700 dark:text-green-400 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/50">
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
              sizes="100vw"
              className="object-cover opacity-20"
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
        <section className="py-24 bg-white dark:bg-green-950 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-green-50 sm:text-4xl font-headline">
                Todo lo que necesitas para tu campo
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-green-200/80">
                Lleva el control exacto de tus cosechas, monitorea la fenología de las plantas y toma decisiones informadas basadas en datos reales.
              </p>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full cursor-pointer group">
                         <Image src="/bitacora-agronomo.png" alt="Bitácora" width={800} height={500} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover aspect-[2/1] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Bitácora Agronómica</DialogTitle>
                      <Image src="/bitacora-agronomo.png" alt="Bitácora" width={1920} height={1080} sizes="100vw" className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <Leaf className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Bitácora Agronómica
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Registra riegos, fertilizaciones, aplicaciones sanitarias y estados fenológicos en una interfaz fácil e intuitiva.</p>
                  </dd>
                </div>
                
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full cursor-pointer group">
                         <Image src="/informes-ia.png" alt="Informes con IA" width={800} height={500} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover aspect-[2/1] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Informes con IA</DialogTitle>
                      <Image src="/informes-ia.png" alt="Informes con IA" width={1920} height={1080} sizes="100vw" className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Informes con IA
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Genera reportes técnicos PDF en segundos. Nuestro consultor impulsado por Google Gemini analiza tus datos y te da recomendaciones clave.</p>
                  </dd>
                </div>

                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200 w-full cursor-pointer group">
                         <Image src="/map_mockup.png" alt="Mapas" width={800} height={500} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover aspect-[2/1] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Mapas Interactivos</DialogTitle>
                      <Image src="/map_mockup.png" alt="Mapas" width={1920} height={1080} sizes="100vw" className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <MapPin className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Mapas Interactivos
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Visualiza el rendimiento de tus lotes en un mapa satelital. Descubre zonas de alta producción o posibles áreas de riesgo al instante.</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-white dark:bg-green-950 px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-green-50 sm:text-4xl">Preguntas Frecuentes</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-green-200/80">
              Resolvemos tus dudas principales para que puedas empezar a transformar tu campo hoy mismo.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Es difícil de usar AgroVision?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                Para nada. Diseñamos AgroVision para que sea tan fácil e intuitivo como usar tus redes sociales o WhatsApp. Los botones son grandes, claros y todo está en español. No necesitas conocimientos avanzados de tecnología para sacarle todo el provecho.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Necesito internet en el campo para que funcione?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                La aplicación está optimizada para cargar súper rápido incluso con muy mala señal (2G/3G). Si te quedas totalmente sin cobertura en medio de un lote, siempre puedes guardar tus registros en la libreta de tu celular y subirlos a AgroVision fácilmente ni bien regreses a un lugar con WiFi o mejor señal.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Mis datos de producción y mapas son privados?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                Totalmente. La privacidad de tu establecimiento es nuestra prioridad absoluta. Toda tu información agrícola, mapas de rendimiento y datos financieros están encriptados y solo tú (y a quienes decidas invitar a tu espacio de trabajo) tienen acceso a ellos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Puedo crear cuentas para mis empleados o mi ingeniero?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                ¡Sí! AgroVision es multi-usuario. Puedes invitar a tu ingeniero agrónomo con permisos especiales para que pueda ver la fenología y emitir diagnósticos, o crear cuentas limitadas para que tus encargados solo registren las cosechas diarias sin ver tus reportes financieros.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-green-950 border-t dark:border-green-900 mt-auto">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500 dark:text-green-200/60">
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
