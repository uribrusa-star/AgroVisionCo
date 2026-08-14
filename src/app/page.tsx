"use client";

import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Leaf, BarChart3, MapPin, Play, Pause, Volume2, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppDataContext } from '@/context/app-data-context.tsx';

export default function LandingPage() {
  const { currentUser } = useContext(AppDataContext);
  const router = useRouter();
  
  // Easter egg state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [volume, setVolume] = React.useState(0.15); // 15% default volume
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Set initial volume when audio mounts
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [audioRef.current]);

  const resetTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowMenu(false);
    }, 10000);
  }, []);

  useEffect(() => {
    if (showMenu) {
      resetTimeout();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showMenu, resetTimeout]);

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-green-950">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b dark:border-green-800 bg-background/95 dark:bg-green-950/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center gap-2 relative">
          {!isPlaying ? (
            <Image 
              src="/logo.png" 
              alt="AgroVista Logo" 
              width={32} 
              height={32} 
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => {
                setIsPlaying(true);
                setShowMenu(true);
                if (audioRef.current) {
                  audioRef.current.play();
                }
              }}
              title="Reproducir música"
            />
          ) : (
            <div 
              className="relative group"
              onMouseMove={showMenu ? resetTimeout : undefined}
              onMouseEnter={showMenu ? resetTimeout : undefined}
            >
              <div 
                className="cursor-pointer transition-transform flex items-center justify-center w-8 h-8 animate-float text-green-600 dark:text-green-400"
                onClick={() => {
                  setIsPlaying(false);
                  setShowMenu(false);
                  if (audioRef.current) {
                    audioRef.current.pause();
                  }
                }}
                title="Pausar música"
              >
                <Music className="w-8 h-8 drop-shadow-sm" />
              </div>
              
              {/* Music Player Popover (Minimalist) */}
              <div 
                className={`absolute top-full left-0 mt-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 shadow-sm rounded-md p-3 flex flex-col gap-4 min-w-[140px] z-50 transition-all duration-500 ease-in-out ${
                  showMenu ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible pointer-events-none'
                }`}
              >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium tracking-wider text-stone-500 uppercase">Volumen</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3 w-3 text-stone-400" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={(e) => {
                        const newVol = parseFloat(e.target.value);
                        setVolume(newVol);
                        if (audioRef.current) {
                          audioRef.current.volume = newVol;
                        }
                        resetTimeout();
                      }}
                      className="w-full accent-stone-700 dark:accent-stone-400 h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
            </div>
          )}
          <audio 
            ref={audioRef} 
            src="/huevo-de-pascua.mp3" 
            preload="none" 
            loop
          />
          <span className="text-xl font-bold text-green-800 dark:text-green-400 font-headline">AgroVista</span>
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
          {/* Background Video with opacity */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="object-cover w-full h-full opacity-30"
            >
              <source src="/hero_background.mp4" type="video/mp4" />
            </video>
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-950 via-transparent to-green-900/50"></div>
          </div>
          
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white font-headline drop-shadow-md">
              Trazabilidad Agrícola Inteligente para la Producción de Frutillas
            </h1>
            <p className="mt-6 text-lg leading-8 text-green-50 max-w-3xl mx-auto drop-shadow-sm">
              AgroVista es la plataforma integral diseñada específicamente para optimizar el rendimiento, 
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
                Lleva el control exacto de tus cosechas, monitorea la fenología de las plantas, controla tus finanzas y toma decisiones informadas en tiempo real.
              </p>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                
                {/* 1. Panel de Control */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/dashboard_mockup_v2.png" alt="Panel de Control" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Panel de Control</DialogTitle>
                      <Image src="/dashboard_mockup_v2.png" alt="Panel de Control" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Panel de Control
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Resumen visual de cosechas totales, costos de mano de obra, rendimiento promedio por lote y el día de pico productivo de tu temporada.</p>
                  </dd>
                </div>

                {/* 2. Mapa Interactivo */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/map_mockup_v2.png" alt="Mapa Interactivo" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Mapa Interactivo de Lotes</DialogTitle>
                      <Image src="/map_mockup_v2.png" alt="Mapa Interactivo" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <MapPin className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Mapa Interactivo
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Visualización satelital de tus lotes delimitados, alertas sanitarias geolocalizadas, estados de carencia (PHI) y tarjetas flotantes de resumen en tiempo real.</p>
                  </dd>
                </div>

                {/* 3. Bitácora del Agrónomo */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/bitacora-agronomo.png" alt="Bitácora del Agrónomo" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Bitácora del Agrónomo</DialogTitle>
                      <Image src="/bitacora-agronomo.png" alt="Bitácora del Agrónomo" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <Leaf className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Bitácora del Agrónomo
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Gestión integral de recetas fitosanitarias, riegos, nutrición foliar, monitoreo fenológico e informes agronómicos técnicos generados con IA.</p>
                  </dd>
                </div>

                {/* 4. Trazabilidad */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/entrada_datos_mockup.png" alt="Trazabilidad y Cosecha" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Trazabilidad Agrícola</DialogTitle>
                      <Image src="/entrada_datos_mockup.png" alt="Trazabilidad y Cosecha" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Trazabilidad de Cosecha
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Seguimiento garantizado origen-destino con códigos QR, registro rápido de kilos recolectados por trabajador y embalaje por categoría.</p>
                  </dd>
                </div>

                {/* 5. Predicciones */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/predicciones_mockup.png" alt="Predicciones e Inteligencia" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Predicciones e Inteligencia</DialogTitle>
                      <Image src="/predicciones_mockup.png" alt="Predicciones e Inteligencia" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Predicciones Climáticas e IA
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Pronóstico agroclimático en tiempo real, alertas de heladas, prevención de plagas y recomendaciones inteligentes para proteger la producción.</p>
                  </dd>
                </div>

                {/* 6. Bitácora del Productor */}
                <div className="flex flex-col items-start">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group bg-muted/20">
                         <Image src="/bitacora_productor_mockup.png" alt="Bitácora del Productor" width={1200} height={750} quality={95} unoptimized className="object-cover object-top aspect-[16/10] w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
                      <DialogTitle className="sr-only">Bitácora del Productor</DialogTitle>
                      <Image src="/bitacora_productor_mockup.png" alt="Bitácora del Productor" width={1920} height={1080} quality={100} unoptimized className="w-full h-auto rounded-lg object-contain max-h-[90vh]" />
                    </DialogContent>
                  </Dialog>
                  <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900 dark:text-green-50">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 flex-none" />
                    Bitácora del Productor
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-green-200/80">
                    <p className="flex-auto">Administración financiera integral: ingresos por ventas, costos operativos, margen neto, ROI, costo por kilo y liquidación de mano de obra.</p>
                  </dd>
                </div>

              </dl>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-white dark:bg-green-950 px-6 lg:px-8 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-green-50 sm:text-4xl">Preguntas Frecuentes</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-green-200/80">
              Resolvemos tus dudas principales para que puedas empezar a transformar tu campo hoy mismo.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-green-900/20 rounded-3xl p-6 md:p-10 border border-gray-100 dark:border-green-800/50 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Es difícil de usar AgroVista?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                Para nada. Diseñamos AgroVista para que sea tan fácil e intuitivo como usar tus redes sociales o WhatsApp. Los botones son grandes, claros y todo está en español. No necesitas conocimientos avanzados de tecnología para sacarle todo el provecho.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold text-gray-800 dark:text-green-100">¿Necesito internet en el campo para que funcione?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600 dark:text-green-200/80">
                La aplicación está optimizada para cargar súper rápido incluso con muy mala señal (2G/3G). Si te quedas totalmente sin cobertura en medio de un lote, siempre puedes guardar tus registros en la libreta de tu celular y subirlos a AgroVista fácilmente ni bien regreses a un lugar con WiFi o mejor señal.
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
                ¡Sí! AgroVista es multi-usuario. Puedes invitar a tu ingeniero agrónomo con permisos especiales para que pueda ver la fenología y emitir diagnósticos, o crear cuentas limitadas para que tus encargados solo registren las cosechas diarias sin ver tus reportes financieros.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-green-950 border-t dark:border-green-900 mt-auto">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="/terminos" className="text-sm leading-6 text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-green-50">
              Términos y Condiciones
            </Link>
            <Link href="/privacidad" className="text-sm leading-6 text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-green-50">
              Política de Privacidad
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500 dark:text-green-200/60">
              &copy; {new Date().getFullYear()} AgroVista. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
