import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  MapPin,
  Leaf,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Calendar,
  Sprout,
  CheckCircle,
  ExternalLink,
  Award,
} from 'lucide-react';
import { ContactModal } from '@/components/contact-modal';
import { WebAnalyticsTracker } from '@/components/web-analytics-tracker';
import { HeroMusicPlayer } from '@/components/home/hero-music-player';
import { FeatureMockupDialog } from '@/components/home/feature-mockup-dialog';
import { FaqSection } from '@/components/home/faq-section';
import { HomeJsonLd } from '@/components/home/json-ld';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-stone-900">
      <WebAnalyticsTracker />
      <HomeJsonLd />

      {/* Header */}
      <header className="px-6 lg:px-8 h-20 flex items-center justify-between border-b border-gray-100 dark:border-green-900/40 bg-white/80 dark:bg-green-950/80 backdrop-blur-md sticky top-0 z-50">
        <HeroMusicPlayer />

        <nav>
          <Link href="/login">
            <Button
              variant="outline"
              className="text-green-700 dark:text-green-400 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/50"
            >
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
              preload="metadata"
              poster="/dashboard_mockup_v2.jpeg"
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
              AgroVista es la plataforma integral nacida en <strong>Coronda</strong>, diseñada específicamente para optimizar el rendimiento, 
              controlar la sanidad y maximizar las ganancias de tus lotes de frutillas. Con inteligencia artificial, 
              reportes agronómicos y mapas interactivos en tiempo real.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <ContactModal
                buttonText="Probar Demo Gratis 🚀"
                buttonSize="lg"
                buttonClassName="bg-green-500 hover:bg-green-400 text-green-950 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all font-bold"
              />
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
                  <FeatureMockupDialog
                    title="Panel de Control"
                    previewSrc="/dashboard_mockup_v2.jpeg"
                    mobileSrc="/dashboard_mobile.jpeg"
                    desktopSrc="/dashboard_mockup_v2.jpeg"
                    altText="Panel de control de cosechas y costos de frutilla en AgroVista"
                  />
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
                  <FeatureMockupDialog
                    title="Mapa Interactivo de Lotes"
                    previewSrc="/map_mockup_v2.jpeg"
                    mobileSrc="/map_mobile.jpeg"
                    desktopSrc="/map_mockup_v2.jpeg"
                    altText="Mapa satelital de lotes de frutilla con alertas sanitarias"
                  />
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
                  <FeatureMockupDialog
                    title="Bitácora del Agrónomo"
                    previewSrc="/bitacora-agronomo_v2.jpeg"
                    mobileSrc="/bitacora-agronomo_mobile.jpeg"
                    desktopSrc="/bitacora-agronomo_v2.jpeg"
                    altText="Bitácora del agrónomo con recetas fitosanitarias y control de carencia"
                  />
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
                  <FeatureMockupDialog
                    title="Trazabilidad Agrícola"
                    previewSrc="/entrada_datos_mockup_v2.jpeg"
                    mobileSrc="/entrada_datos_mobile.jpeg"
                    desktopSrc="/entrada_datos_mockup_v2.jpeg"
                    altText="Registro de cosecha de frutilla con código QR por lote"
                  />
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
                  <FeatureMockupDialog
                    title="Predicciones e Inteligencia"
                    previewSrc="/predicciones_mockup_v2.jpeg"
                    mobileSrc="/predicciones_mobile.jpeg"
                    desktopSrc="/predicciones_mockup_v2.jpeg"
                    altText="Pronóstico agroclimático y alertas de heladas para frutilla"
                  />
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
                  <FeatureMockupDialog
                    title="Bitácora del Productor"
                    previewSrc="/bitacora_productor_mockup_v2.jpeg"
                    mobileSrc="/bitacora_productor_mobile.jpeg"
                    desktopSrc="/bitacora_productor_mockup_v2.jpeg"
                    altText="Costos, ingresos y costo por kilo de frutilla en AgroVista"
                  />
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

        {/* Public Traceability Passport Showcase Section */}
        <section className="py-16 sm:py-24 bg-emerald-950 text-white relative overflow-hidden px-4 sm:px-6">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-7xl relative z-10">
            <div className="mx-auto max-w-3xl text-center space-y-3 sm:space-y-4">
              <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30 px-3 py-1 font-semibold text-xs rounded-full inline-flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                <span>Valor Agregado para tu Cosecha</span>
              </Badge>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-headline leading-tight px-2">
                Trazabilidad Digital para tu producción
              </h2>
              
              <p className="text-sm sm:text-base md:text-lg text-emerald-100/90 leading-relaxed max-w-2xl mx-auto px-2">
                AgroVista genera códigos QR únicos para cada lote cosechado. Tus compradores, verdulerías y supermercados escanean la bandeja y acceden al historial digital mostrando el origen de tu frutilla.
              </p>
            </div>

            {/* Interactive Mockup / Live Preview Card */}
            <div className="mt-10 sm:mt-14 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl border border-emerald-500/20 space-y-5">
                
                {/* Header Badge & Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                      <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base sm:text-lg md:text-xl text-stone-900 dark:text-stone-100 truncate">Quinta Las Fresas</span>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 text-[10px] font-bold shrink-0">
                          100% Inocuo BPA
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 break-words">Lote 1: Camino Real • Código: TR-2026-LOT1-89B</p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-700 text-white font-bold text-xs px-3 py-1 shrink-0 self-start sm:self-auto">
                    <Award className="h-3.5 w-3.5 mr-1" /> Certificado de Calidad
                  </Badge>
                </div>

                {/* Timeline Grid Demo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 py-1">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Etapa 1: Floración</span>
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">12 de Mayo</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 leading-snug">Monitoreo fenológico registrado con fotometría y control biológico de plagas (MIP).</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Etapa 2: Carencia PHI</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Período Cumplido</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 leading-snug">Cero residuos químicos. Aplicación fitosanitaria respetando los días libres de carencia.</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Etapa 3: Cosecha</span>
                      <Sprout className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Fruto Fresco Cosechado</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 leading-snug">Empacado en origen con trazabilidad completa directo al consumidor final.</p>
                  </div>
                </div>

                {/* Footer CTA Demo Link */}
                <div className="pt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Tus clientes ven la historia de tu fruta sin descargar ninguna aplicación.</span>
                  </div>

                  <Link href="/trace/DEMO-2026" target="_blank" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs gap-1.5 rounded-xl h-10 px-4">
                      <span>Ver ejemplo de Historial</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* Línea divisoria gris */}
        <div className="max-w-5xl mx-auto px-6">
          <hr className="border-t border-gray-200 dark:border-green-900/60" />
        </div>

        {/* FAQ Section */}
        <FaqSection />
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
              &copy; {new Date().getFullYear()} AgroVista. Desarrollado en Coronda, Santa Fe, Argentina. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
