'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  MapPin,
  Leaf,
  CheckCircle2,
  CloudSun,
  TrendingUp,
  Sparkles,
  Maximize2,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FeatureMockupDialog } from '@/components/home/feature-mockup-dialog';

interface FeatureItem {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ElementType;
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
    description: 'Visualización integral de tus cosechas totales, costos operativos, rendimiento promedio por lote y el día de pico productivo de tu temporada.',
    icon: BarChart3,
    desktopSrc: '/dashboard_mockup.jpeg?v=5',
    mobileSrc: '/dashboard_mobile.jpeg?v=5',
    altText: 'Panel de control de cosechas y costos de frutilla en AgroVista',
    bullets: [
      { title: 'Kilos cosechados en vivo:', text: 'Acumulado por variedad y lote actualizado al instante.' },
      { title: 'Costos desglosados:', text: 'Mano de obra, servicios e insumos en gráficos claros.' },
      { title: 'Indicadores clave:', text: 'Rendimiento promedio y día de máxima productividad.' },
    ],
  },
  {
    id: 'map',
    tabLabel: 'Mapa Interactivo',
    badge: 'GEORREFERENCIACIÓN Y SATÉLITE',
    title: 'Mapa Interactivo de Lotes',
    description: 'Delimitación satelital de tus parcelas con monitoreo visual de estados sanitarios, períodos de carencia (PHI) y alertas geolocalizadas.',
    icon: MapPin,
    desktopSrc: '/map_mockup.jpeg?v=5',
    mobileSrc: '/map_mobile.jpeg?v=5',
    altText: 'Mapa satelital de lotes de frutilla con alertas sanitarias',
    bullets: [
      { title: 'Polígonos satelitales:', text: 'Tus lotes delimitados con precisión cartográfica.' },
      { title: 'Semáforo de carencia (PHI):', text: 'Alerta visual si un lote aún tiene agroquímicos activos.' },
      { title: 'Tarjetas flotantes:', text: 'Resumen de kilos y variedad al posar sobre cada lote.' },
    ],
  },
  {
    id: 'agronomist',
    tabLabel: 'Bitácora del Agrónomo',
    badge: 'SANIDAD Y ASESORAMIENTO TÉCNICO',
    title: 'Bitácora del Agrónomo',
    description: 'Gestión técnica completa de recetas fitosanitarias, programas de nutrición, monitoreo fenológico e informes agronómicos con IA.',
    icon: Leaf,
    desktopSrc: '/bitacora-agronomo_mockup.jpeg?v=5',
    mobileSrc: '/bitacora-agronomo_mobile.jpeg?v=5',
    altText: 'Bitácora del agrónomo con recetas fitosanitarias y control de carencia',
    bullets: [
      { title: 'Recetas digitales:', text: 'Registro de dosis, plagas objetivo y días libres de carencia.' },
      { title: 'Monitoreo fenológico:', text: 'Seguimiento fotográfico de floración, cuajado y cosecha.' },
      { title: 'Informes técnicos con IA:', text: 'Resúmenes técnicos automáticos listos para exportar.' },
    ],
  },
  {
    id: 'traceability',
    tabLabel: 'Trazabilidad de Cosecha',
    badge: 'ORIGEN Y TRANSPARENCIA QR',
    title: 'Trazabilidad Agrícola Integral',
    description: 'Garantiza el origen de tu fruta desde el surco hasta el consumidor final. Cada lote genera un pasaporte digital accesible mediante código QR.',
    icon: CheckCircle2,
    desktopSrc: '/trazabilidad_mockup.jpeg?v=5',
    mobileSrc: '/trazabilidad_mobile.jpeg?v=5',
    altText: 'Registro de cosecha de frutilla y reporte de trazabilidad oficial',
    bullets: [
      { title: 'Código QR por lote:', text: 'Tus compradores escanean la caja y ven el historial real.' },
      { title: 'Inocuidad certificada:', text: 'Respaldo de buenas prácticas agrícolas (BPA).' },
      { title: 'Sin descargar aplicaciones:', text: 'Funciona en cualquier celular con cámara.' },
    ],
  },
  {
    id: 'predictions',
    tabLabel: 'Predicciones e IA',
    badge: 'CLIMA, HELADAS Y PREVENCIÓN',
    title: 'Predicciones Climáticas e Inteligencia Artificial',
    description: 'Pronóstico agroclimático en tiempo real adaptado a tu ubicación exacta, alertas tempranas de heladas y recomendaciones agronómicas preventivas.',
    icon: Sparkles,
    desktopSrc: '/predicciones_mockup.jpeg?v=5',
    mobileSrc: '/predicciones_mobile.jpeg?v=5',
    altText: 'Pronóstico agroclimático y alertas de heladas para frutilla',
    bullets: [
      { title: 'Alertas de heladas:', text: 'Avisos preventivos para activar microtúneles o riego antihelada.' },
      { title: 'Pronóstico a 7 días:', text: 'Temperatura, humedad relativa, viento y lluvia estimada.' },
      { title: 'Recomendaciones inteligentes:', text: 'Sugerencias agronómicas según las condiciones del tiempo.' },
    ],
  },
  {
    id: 'producer',
    tabLabel: 'Bitácora Financiera',
    badge: 'ADMINISTRACIÓN Y COSTOS',
    title: 'Bitácora Financiera del Productor',
    description: 'Control financiero transparente de tu explotación: ingresos por venta de fruta, costos operativos, margen neto y costo exacto por kilo producido.',
    icon: TrendingUp,
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

  const activeFeature = FEATURES[activeIndex];

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
      className="mx-auto mt-12 max-w-6xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Selector de pestañas horizontal */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-inner">
        {FEATURES.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === activeIndex;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(index)}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 overflow-hidden ${
                isActive
                  ? 'bg-white dark:bg-stone-900 text-green-700 dark:text-green-400 shadow-md ring-1 ring-green-600/20'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/60 dark:hover:bg-stone-700/50'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-stone-400'}`} />
              <span className="truncate">{item.tabLabel}</span>

              {/* Barra de progreso de auto-rotación de 1 minuto en la pestaña activa */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 h-0.5 bg-green-600 dark:bg-green-400 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Indicador de pausa sutil para el usuario */}
      <div className="flex items-center justify-end gap-2 px-2 pt-2 text-[11px] text-stone-400">
        <span>Rotación automática (1 min)</span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1"
          title={isPaused ? 'Reanudar rotación' : 'Pausar rotación'}
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          <span>{isPaused ? 'Pausado' : 'Activo'}</span>
        </button>
      </div>

      {/* Contenedor Showcase Principal con efecto Fade */}
      <div
        key={activeFeature.id}
        className="mt-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden transition-all duration-500 animate-in fade-in-50 slide-in-from-bottom-2"
      >
        <div className="p-6 sm:p-8 lg:p-10 space-y-8">
          
          {/* Header de la funcionalidad activa */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
            <div className="space-y-2 max-w-3xl">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-200 dark:border-green-800 text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span>{activeFeature.badge}</span>
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-green-50 font-headline">
                {activeFeature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-green-200/80 leading-relaxed">
                {activeFeature.description}
              </p>
            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 self-start lg:self-center bg-stone-50 dark:bg-stone-800/60 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
              <span>{activeIndex + 1} de {FEATURES.length}</span>
              <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Gran Captura Protagónica con Diálogo de Zoom */}
          <div className="relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800/50 shadow-inner">
            <FeatureMockupDialog
              title={activeFeature.title}
              previewSrc={activeFeature.desktopSrc}
              mobileSrc={activeFeature.mobileSrc}
              desktopSrc={activeFeature.desktopSrc}
              altText={activeFeature.altText}
            />
          </div>

          {/* Puntos clave / Beneficios directos para el productor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {activeFeature.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 space-y-1.5 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-colors"
              >
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{bullet.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-snug">
                  {bullet.text}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
