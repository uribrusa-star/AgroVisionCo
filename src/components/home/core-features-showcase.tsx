'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Pause,
  Play,
} from 'lucide-react';
import { FeatureMockupDialog } from '@/components/home/feature-mockup-dialog';

interface FeatureItem {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  description: string;
  desktopSrc: string;
  mobileSrc: string;
  altText: string;
  bullets: Array<{ title: string; text: string }>;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'dashboard',
    tabLabel: 'Panel de Control',
    badge: 'MÉTRICAS EN TIEMPO REAL',
    title: 'Panel de Control General',
    description: 'Visualización integral de cosechas totales, costos de mano de obra, rendimiento por lote y el pico productivo de tu temporada.',
    desktopSrc: '/dashboard_mockup.jpeg?v=5',
    mobileSrc: '/dashboard_mobile.jpeg?v=5',
    altText: 'Panel de control de cosechas y costos de frutilla en AgroVista',
    bullets: [
      { title: 'Kilos cosechados en vivo:', text: 'Acumulado por variedad y lote actualizado al instante.' },
      { title: 'Costos operativos claros:', text: 'Mano de obra, servicios e insumos en gráficos visuales.' },
      { title: 'Rendimiento promedio:', text: 'Métricas precisas por lote para tomar decisiones a tiempo.' },
    ],
  },
  {
    id: 'map',
    tabLabel: 'Mapa Interactivo',
    badge: 'GEORREFERENCIACIÓN Y SATÉLITE',
    title: 'Mapa Interactivo de Lotes',
    description: 'Delimitación satelital de tus parcelas con monitoreo visual de estados sanitarios, períodos de carencia (PHI) y alertas geolocalizadas.',
    desktopSrc: '/map_mockup.jpeg?v=5',
    mobileSrc: '/map_mobile.jpeg?v=5',
    altText: 'Mapa satelital de lotes de frutilla con alertas sanitarias',
    bullets: [
      { title: 'Polígonos satelitales:', text: 'Tus lotes delimitados con máxima precisión cartográfica.' },
      { title: 'Semáforo de carencia (PHI):', text: 'Alerta visual si un lote aún tiene agroquímicos activos.' },
      { title: 'Tarjetas flotantes en lote:', text: 'Resumen de kilos y variedad al posar sobre cada parcela.' },
    ],
  },
  {
    id: 'agronomist',
    tabLabel: 'Bitácora Agrónomo',
    badge: 'SANIDAD Y ASESORAMIENTO TÉCNICO',
    title: 'Bitácora del Agrónomo',
    description: 'Gestión técnica completa de recetas fitosanitarias, programas de nutrición foliar, monitoreo fenológico e informes agronómicos con IA.',
    desktopSrc: '/bitacora-agronomo_mockup.jpeg?v=5',
    mobileSrc: '/bitacora-agronomo_mobile.jpeg?v=5',
    altText: 'Bitácora del agrónomo con recetas fitosanitarias y control de carencia',
    bullets: [
      { title: 'Recetas digitales seguras:', text: 'Dosis exactas, plagas objetivo y días libres de carencia.' },
      { title: 'Monitoreo fenológico:', text: 'Seguimiento fotográfico de floración, cuajado y cosecha.' },
      { title: 'Informes técnicos con IA:', text: 'Resúmenes técnicos automáticos listos para exportar.' },
    ],
  },
  {
    id: 'traceability',
    tabLabel: 'Trazabilidad QR',
    badge: 'ORIGEN Y TRANSPARENCIA QR',
    title: 'Trazabilidad Agrícola Integral',
    description: 'Garantiza el origen de tu fruta desde el surco hasta el consumidor final. Cada lote genera un pasaporte digital accesible mediante código QR.',
    desktopSrc: '/trazabilidad_mockup.jpeg?v=5',
    mobileSrc: '/trazabilidad_mobile.jpeg?v=5',
    altText: 'Registro de cosecha de frutilla y reporte de trazabilidad oficial',
    bullets: [
      { title: 'Código QR por lote:', text: 'Tus compradores escanean la caja y ven el historial real.' },
      { title: 'Inocuidad certificada BPA:', text: 'Respaldo documental de buenas prácticas agrícolas.' },
      { title: 'Sin descargar aplicaciones:', text: 'Funciona en cualquier celular con cámara web.' },
    ],
  },
  {
    id: 'predictions',
    tabLabel: 'Predicciones IA',
    badge: 'CLIMA, HELADAS Y PREVENCIÓN',
    title: 'Predicciones Climáticas e Inteligencia Artificial',
    description: 'Pronóstico agroclimático en tiempo real adaptado a tu ubicación exacta, alertas tempranas de heladas y modelos agronómicos predictivos.',
    desktopSrc: '/predicciones_mockup.jpeg?v=5',
    mobileSrc: '/predicciones_mobile.jpeg?v=5',
    altText: 'Pronóstico agroclimático y alertas de heladas para frutilla',
    bullets: [
      { title: 'Alertas de heladas tempranas:', text: 'Avisos preventivos para activar microtúneles o riego.' },
      { title: 'Pronóstico a 7 días:', text: 'Temperatura, humedad relativa, viento y lluvia estimada.' },
      { title: 'Recomendaciones agronómicas:', text: 'Sugerencias inteligentes según las condiciones del clima.' },
    ],
  },
  {
    id: 'producer',
    tabLabel: 'Bitácora Productor',
    badge: 'ADMINISTRACIÓN Y COSTOS',
    title: 'Bitácora Financiera del Productor',
    description: 'Control financiero transparente de tu explotación: ingresos por venta de fruta, costos operativos, margen neto y costo exacto por kilo producido.',
    desktopSrc: '/bitacora-productor_mockup.jpeg?v=5',
    mobileSrc: '/bitacora-productor_mobile.jpeg?v=5',
    altText: 'Costos, ingresos y costo por kilo de frutilla en AgroVista',
    bullets: [
      { title: 'Costo real por kilo:', text: 'Conoce con precisión cuánto te cuesta producir cada kilo.' },
      { title: 'Margen y rentabilidad:', text: 'Balance en tiempo real entre ingresos y costos operativos.' },
      { title: 'Liquidación de mano de obra:', text: 'Consolidado exacto de pagos a cosecheros y cuadrillas.' },
    ],
  },
];

const ROTATION_INTERVAL = 60000; // 1 minuto (60 segundos)

export function CoreFeaturesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const activeFeature = FEATURES[activeIndex];

  // Auto-scroll the active tab into view horizontally inside ITS OWN CONTAINER ONLY
  // Strictly scrolls tabsContainerRef without affecting window or page scroll position
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const container = tabsContainerRef.current;
    const activeTab = tabRefs.current[activeIndex];
    if (container && activeTab) {
      const containerWidth = container.clientWidth;
      const tabOffsetLeft = activeTab.offsetLeft;
      const tabWidth = activeTab.clientWidth;
      const targetScrollLeft = tabOffsetLeft - (containerWidth / 2) + (tabWidth / 2);

      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  // Auto-advance timer every 1 minute with smooth progress indicator
  useEffect(() => {
    if (isPaused) return;

    const tickMs = 100;
    const progressStep = (tickMs / ROTATION_INTERVAL) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((current) => (current + 1) % FEATURES.length);
          return 0;
        }
        return prev + progressStep;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isPaused, activeIndex]);

  const handleSelectTab = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  return (
    <div
      className="mx-auto mt-10 max-w-7xl w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Selector de pestañas sobrio: texto limpio, sin íconos decorativos */}
      <div className="relative w-full p-1 rounded-xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700/80">
        <div
          ref={tabsContainerRef}
          className="flex lg:grid lg:grid-cols-6 gap-1 overflow-x-auto py-0.5 px-0.5 scroll-smooth snap-x snap-mandatory lg:snap-none [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FEATURES.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                onClick={() => handleSelectTab(index)}
                className={`relative shrink-0 lg:shrink flex items-center justify-center px-4 py-2.5 rounded-lg text-xs sm:text-sm transition-all duration-200 overflow-hidden text-center whitespace-nowrap snap-center ${
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-[#196F3D] dark:text-emerald-400 font-semibold shadow-xs border-b-2 border-[#196F3D]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-[#18201C] dark:hover:text-stone-100 font-medium'
                }`}
              >
                <span>{item.tabLabel}</span>

                {/* Barra sutil de progreso de avance automático en pestaña activa */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-[#196F3D] dark:bg-emerald-400 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de control sobria: pausa discreta y contador 01 / 06 */}
      <div className="flex items-center justify-between px-2 pt-2.5 pb-1">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#18201C] dark:hover:text-stone-200 transition-colors font-medium cursor-pointer"
          title={isPaused ? 'Reanudar avance automático' : 'Pausar avance automático'}
        >
          {isPaused ? <Play className="h-3 w-3 text-[#196F3D]" /> : <Pause className="h-3 w-3 text-stone-400" />}
          <span>{isPaused ? 'Reanudar avance' : 'Pausar avance'}</span>
        </button>

        <span className="text-xs text-stone-400 font-mono tracking-wider">
          {String(activeIndex + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}
        </span>
      </div>

      {/* Tarjeta Showcase B2B Panorámica */}
      <div
        key={activeFeature.id}
        className="mt-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-sm overflow-hidden transition-all duration-300"
      >
        <div className="p-5 sm:p-6 lg:p-7">
          {/* Encabezado visible únicamente en Móvil */}
          <div className="block lg:hidden space-y-2 mb-5">
            <span className="tracking-[0.18em] uppercase text-[11px] font-semibold text-[#196F3D] dark:text-emerald-400 block">
              {activeFeature.badge}
            </span>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18201C] dark:text-stone-100 font-headline">
              {activeFeature.title}
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {activeFeature.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* Columna Izquierda: Título en PC y 3 bloques limpios de beneficios */}
            <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
              {/* En PC se muestra aquí el título y descripción */}
              <div className="hidden lg:block space-y-2">
                <span className="tracking-[0.18em] uppercase text-[11px] font-semibold text-[#196F3D] dark:text-emerald-400 block">
                  {activeFeature.badge}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18201C] dark:text-stone-100 font-headline">
                  {activeFeature.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {activeFeature.description}
                </p>
              </div>

              {/* 3 Bloques limpios con bordes finos y acentos contenidos */}
              <div className="space-y-2.5 pt-1">
                {activeFeature.bullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#18201C] dark:text-stone-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#196F3D] dark:bg-emerald-400 shrink-0" />
                      <span>{bullet.title}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 leading-snug pl-3.5">
                      {bullet.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Derecha: Captura de pantalla en marco sobrio sin semáforos */}
            <div className="lg:col-span-8 order-1 lg:order-2 flex items-center justify-center">
              <div className="w-full">
                <FeatureMockupDialog
                  title={activeFeature.title}
                  previewSrc={activeFeature.desktopSrc}
                  mobileSrc={activeFeature.mobileSrc}
                  desktopSrc={activeFeature.desktopSrc}
                  altText={activeFeature.altText}
                  className="mb-0"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
