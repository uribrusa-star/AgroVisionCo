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
  Users,
  UserCheck,
  Package,
  Clock,
} from 'lucide-react';
import { ContactModal } from '@/components/contact-modal';
import { WebAnalyticsTracker } from '@/components/web-analytics-tracker';
import { HeroMusicPlayer } from '@/components/home/hero-music-player';
import { FeatureMockupDialog } from '@/components/home/feature-mockup-dialog';
import { CoreFeaturesShowcase } from '@/components/home/core-features-showcase';
import { FaqSection } from '@/components/home/faq-section';
import { HomeJsonLd } from '@/components/home/json-ld';
import { AuthRedirect } from '@/components/home/auth-redirect';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-stone-900">
      <AuthRedirect />
      <WebAnalyticsTracker />
      <HomeJsonLd />

      {/* Header B2B AgTech Sobrio */}
      <header className="px-6 lg:px-8 h-20 flex items-center justify-between border-b border-[#E5E7EB] bg-[#FAF9F6] sticky top-0 z-50">
        <HeroMusicPlayer />

        <nav>
          <Link href="/login">
            <Button
              variant="outline"
              className="text-[#0D2618] border-[#0D2618]/40 hover:border-[#0D2618] hover:bg-stone-100 rounded-[8px] font-medium text-sm transition-all"
            >
              Iniciar Sesión
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section AgTech B2B Sobrio */}
      <main className="flex-1">
        <section className="relative px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0D2618] min-h-[calc(100vh-80px)] flex flex-col justify-between">
          {/* Background Video with opacity */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="object-cover w-full h-full opacity-35"
            >
              <source src="/hero_background.mp4" type="video/mp4" />
            </video>
            {/* Gradient overlay: verde bosque profundo (#0D2618) en la parte inferior a transparente/oscuro suave arriba */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D2618] via-[#0D2618]/70 to-[#0D2618]/30"></div>
          </div>

          {/* Espacio superior para balancear el centrado vertical */}
          <div className="h-4 sm:h-8"></div>

          {/* Contenido principal centrado */}
          <div className="relative z-10 mx-auto max-w-4xl text-center px-2 sm:px-6 flex flex-col items-center my-auto py-6 sm:py-8">
            {/* Etiqueta superior en texto limpio en mayúsculas con espaciado */}
            <span className="tracking-[0.2em] uppercase text-xs sm:text-sm font-semibold text-emerald-300/90 mb-4 sm:mb-5">
              TRAZABILIDAD AGRÍCOLA
            </span>

            {/* Título principal (H1) en blanco, sans-serif bold, interlineado ajustado */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white font-headline drop-shadow-md leading-[1.18] sm:leading-[1.15] max-w-3xl">
              Trazabilidad Agrícola para Producción de Frutillas
            </h1>

            {/* Párrafo descriptivo corto de dos líneas en blanco suave */}
            <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg leading-relaxed text-white/85 max-w-2xl mx-auto drop-shadow-sm font-normal">
              Optimizá el rendimiento, controlá la sanidad y maximizá la rentabilidad de tus lotes con mapas satelitales, IA y trazabilidad en PDF.
            </p>

            {/* Botón principal sólido en verde esmeralda sobrio (#1E8449) */}
            <div className="mt-8 sm:mt-10 flex items-center justify-center">
              <ContactModal
                buttonText="Probar Demo Gratis"
                buttonSize="lg"
                buttonClassName="bg-[#1E8449] hover:bg-[#196F3D] text-white px-8 py-5 sm:py-6 text-base sm:text-lg rounded-full shadow-md hover:shadow-lg transition-all font-semibold"
              />
            </div>
          </div>

          {/* Fila horizontal ubicada en el límite inferior del video */}
          <div className="relative z-10 w-full max-w-2xl mx-auto pb-5 sm:pb-7 pt-4 border-t border-white/10 flex items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs md:text-sm text-emerald-100/75 font-medium tracking-wide">
            <span>Monitoreo por lote</span>
            <span className="text-white/25">|</span>
            <span>Reportes con QR</span>
            <span className="text-white/25">|</span>
            <span>Uso offline</span>
          </div>
        </section>

        {/* Features Section */}
        <section id="funciones" className="py-24 bg-[#FAF9F6] border-b border-stone-200/80 sm:py-32 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="tracking-[0.18em] uppercase text-xs font-semibold text-[#196F3D] block mb-3">
                TECNOLOGÍA APLICADA
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[#18201C] sm:text-4xl font-headline">
                Todo lo que necesitas para tu campo
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-600">
                Lleva el control exacto de tus cosechas, monitorea la fenología de las plantas, controla tus finanzas y toma decisiones informadas en tiempo real.
              </p>
            </div>

            {/* Interactive Showcase of Core Features */}
            <CoreFeaturesShowcase />
          </div>
        </section>

        {/* Workforce & Roles Management Section */}
        <section className="py-24 bg-white border-b border-stone-200/80 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="tracking-[0.18em] uppercase text-xs font-semibold text-[#196F3D] block mb-3">
                GESTIÓN OPERATIVA
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[#18201C] sm:text-4xl font-headline">
                Control de Personal, Roles y Credenciales QR
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-600">
                Digitaliza el trabajo en el lote y en el galpón. Cada miembro del equipo cuenta con herramientas a medida y credenciales QR para agilizar la operación y garantizar la transparencia.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-6xl space-y-20 lg:space-y-28">

              {/* 1. Recolectores (Texto Izquierda / Imagen Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="tracking-[0.16em] uppercase text-xs font-semibold text-[#196F3D] block">
                    PASO 1 • COSECHA EN SURCO
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18201C] font-headline">
                    Cuadrillas de Recolectores
                  </h3>
                  <p className="text-base leading-7 text-stone-600">
                    Digitaliza la recolección en el campo sin planillas de papel. Cada cosechero cuenta con su credencial física o digital para registrar kilos al instante.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-sm sm:text-base text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Carnets QR individuales:</strong> Emisión e impresión rápida para cada cosechero.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Pesaje ágil en el surco:</strong> Escaneo rápido y carga de kilos por lote.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Liquidación transparente:</strong> Historial individual de rendimiento y pago exacto.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7">
                  <FeatureMockupDialog
                    title="Gestión de Recolectores y Credenciales QR"
                    previewSrc="/recolectores_mockup.jpeg?v=5"
                    mobileSrc="/recolectores_mobile.jpeg?v=5"
                    desktopSrc="/recolectores_mockup.jpeg?v=5"
                    altText="Gestión de cuadrillas de recolectores con credenciales QR en AgroVista"
                  />
                </div>
              </div>

              {/* 2. Asistencia (Imagen Izquierda / Texto Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                <div className="lg:col-span-7 order-2 lg:order-1">
                  <FeatureMockupDialog
                    title="Control de Asistencia y Presentismo QR"
                    previewSrc="/asistencia_mockup.jpeg?v=5"
                    mobileSrc="/asistencia_mobile.jpeg?v=5"
                    desktopSrc="/asistencia_mockup.jpeg?v=5"
                    altText="Control de asistencia y presentismo con código QR en AgroVista"
                  />
                </div>

                <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
                  <span className="tracking-[0.16em] uppercase text-xs font-semibold text-[#196F3D] block">
                    PASO 2 • CONTROL DE INGRESO
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18201C] font-headline">
                    Control de Asistencia QR
                  </h3>
                  <p className="text-base leading-7 text-stone-600">
                    Controla quién está en el campo en tiempo real. El encargado escanea el código QR en la tranquera o galpón al inicio y fin de la jornada.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-sm sm:text-base text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Presentismo en vivo:</strong> Conoce al instante cuántos trabajadores están activos hoy.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Horas trabajadas exactas:</strong> Registro automático de entradas, salidas y turnos.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Planillas para RRHH:</strong> Exporta reportes listos a Excel y PDF con un solo clic.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 3. Embaladores (Texto Izquierda / Imagen Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="tracking-[0.16em] uppercase text-xs font-semibold text-[#196F3D] block">
                    PASO 3 • GALPÓN Y EMPAQUE
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18201C] font-headline">
                    Cuadrillas de Embaladores
                  </h3>
                  <p className="text-base leading-7 text-stone-600">
                    Seguimiento detallado de bandejas y cajas preparadas en el galpón. Identificación por puesto de empaque para asegurar estándares de calidad.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-sm sm:text-base text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Puestos con código QR:</strong> Asignación rápida de bultos por cada embalador.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Control de calidad:</strong> Trazabilidad por calibre, categoría y lote de origen.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Liquidación por productividad:</strong> Pago automatizado según bultos o jornales fijados.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7">
                  <FeatureMockupDialog
                    title="Gestión de Embaladores y Control de Empaque"
                    previewSrc="/embaladores_mockup.jpeg?v=5"
                    mobileSrc="/embaladores_mobile.jpeg?v=5"
                    desktopSrc="/embaladores_mockup.jpeg?v=5"
                    altText="Gestión de embaladores y credenciales QR de empaque en AgroVista"
                  />
                </div>
              </div>

              {/* 4. Ingeniero y Encargados (Imagen Izquierda / Texto Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                <div className="lg:col-span-7 order-2 lg:order-1">
                  <FeatureMockupDialog
                    title="Ingeniero Agrónomo y Encargados de Campo"
                    previewSrc="/usuarios_mockup.jpeg?v=5"
                    mobileSrc="/usuarios_mobile.jpeg?v=5"
                    desktopSrc="/usuarios_mockup.jpeg?v=5"
                    altText="Roles de ingeniero agrónomo y encargado de campo en AgroVista"
                  />
                </div>

                <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
                  <span className="tracking-[0.16em] uppercase text-xs font-semibold text-[#196F3D] block">
                    GESTIÓN Y ROLES TÉCNICOS
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18201C] font-headline">
                    Ingeniero y Encargados
                  </h3>
                  <p className="text-base leading-7 text-stone-600">
                    Organiza el equipo con permisos específicos según su función técnica. Cada perfil accede únicamente a las herramientas y datos que necesita.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-sm sm:text-base text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Ingeniero Agrónomo:</strong> Recetas fitosanitarias, monitoreo fenológico y carencia PHI.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Encargado de Campo:</strong> Coordinación de labores culturales diarias y cuadrillas en lote.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-[#196F3D] shrink-0 mt-0.5" />
                      <span><strong>Roles y Seguridad:</strong> Accesos diferenciados y protegidos con credenciales seguras.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Public Traceability Passport Showcase Section - AgTech B2B Sobrio */}
        <section className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-stone-200/80 text-[#18201C] relative px-4 sm:px-6">
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="mx-auto max-w-3xl text-center space-y-3 sm:space-y-4">
              <Badge className="bg-emerald-50 text-[#196F3D] hover:bg-emerald-100/70 border-emerald-200/80 px-3 py-1 font-semibold text-xs rounded-full inline-flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-[#196F3D]" />
                <span>Valor Agregado para tu Cosecha</span>
              </Badge>
              
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18201C] font-headline leading-tight px-2">
                Trazabilidad Digital para tu producción
              </h2>
              
              <p className="text-sm sm:text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto px-2">
                AgroVista genera códigos QR únicos para cada lote cosechado. Tus compradores, verdulerías y supermercados escanean la bandeja y acceden al historial digital mostrando el origen de tu frutilla.
              </p>
            </div>

            {/* Interactive Mockup / Live Preview Card */}
            <div className="mt-10 sm:mt-14 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs border border-stone-200/90 space-y-5 text-[#18201C]">
                
                {/* Header Badge & Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-stone-200/80">
                  <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-full bg-white border border-stone-200 p-0.5 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
                      <Image 
                        src="/logoBPA-sinfondo.png" 
                        alt="Sello BPA AgroVista" 
                        width={46} 
                        height={46} 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base sm:text-lg md:text-xl text-[#0D2618] truncate">Quinta Las Fresas</span>
                        <Badge className="bg-emerald-50 text-[#196F3D] border-emerald-200/80 text-[10px] font-bold shrink-0">
                          100% Inocuo BPA
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 font-mono break-words">Lote 1: Camino Real • Código: TR-2026-LOT1-89B</p>
                    </div>
                  </div>

                  <Badge className="bg-[#0F2A1D] text-emerald-300 border border-emerald-800 font-semibold text-xs px-3 py-1 shrink-0 self-start sm:self-auto">
                    <Award className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Certificado de Calidad
                  </Badge>
                </div>

                {/* Timeline Grid Demo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 py-1">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-[#196F3D]">Etapa 1: Floración</span>
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    </div>
                    <p className="text-xs font-bold text-[#18201C]">12 de Mayo</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">Monitoreo fenológico registrado con fotometría y control biológico de plagas (MIP).</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-[#196F3D]">Etapa 2: Carencia PHI</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-[#18201C]">Período Cumplido</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">Cero residuos químicos. Aplicación fitosanitaria respetando los días libres de carencia.</p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-[#196F3D]">Etapa 3: Cosecha</span>
                      <Sprout className="h-3.5 w-3.5 shrink-0 text-[#196F3D]" />
                    </div>
                    <p className="text-xs font-bold text-[#18201C]">Fruto Fresco Cosechado</p>
                    <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">Empacado en origen con trazabilidad completa directo al consumidor final.</p>
                  </div>
                </div>

                {/* Footer CTA Demo Link */}
                <div className="pt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-200/80">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-[#196F3D] shrink-0" />
                    <span>Tus clientes ven la historia de tu fruta sin descargar ninguna aplicación.</span>
                  </div>

                  <Link href="/trace/DEMO-2026" target="_blank" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto border-[#196F3D] text-[#196F3D] hover:bg-emerald-50/70 font-bold text-xs gap-1.5 rounded-xl h-10 px-4 transition-colors">
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
      <footer id="footer" className="bg-gray-50 dark:bg-green-950 border-t dark:border-green-900 mt-auto scroll-mt-10">
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
              <a
                href="https://www.instagram.com/agrovistaco"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de AgroVista"
                className="inline-flex items-center align-middle ml-2 text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-green-50 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
