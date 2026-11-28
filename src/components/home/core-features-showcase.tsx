'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  MapPin,
  Leaf,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Pause,
  Play,
  Maximize2,
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
    description: 'Visualización integral de cosechas totales, costos de mano de obra, rendimiento por lote y el pico productivo de tu temporada.',
    icon: BarChart3,
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
    icon: MapPin,
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
    icon: Leaf,
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
    icon: CheckCircle2,
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
    icon: Sparkles,
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
      className="mx-auto mt-10 max-w-7xl w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Selector de pestañas horizontal - Garantizado en 1 sola línea en PC */}
      <div className="w-full p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-inner">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(index)}
                className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 overflow-hidden text-center whitespace-nowrap ${
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
      </div>

      {/* Control discreto de pausa y rotación */}
      <div className="flex items-center justify-between px-3 pt-2 text-[11px] text-stone-500 dark:text-stone-400">
        <span className="hidden sm:inline">Posa el cursor para pausar y leer con tranquilidad</span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="ml-auto hover:text-green-700 dark:hover:text-green-400 transition-colors flex items-center gap-1.5 font-medium"
          title={isPaused ? 'Reanudar rotación automática' : 'Pausar rotación automática'}
        >
          {isPaused ? <Play className="h-3 w-3 text-green-600" /> : <Pause className="h-3 w-3 text-stone-400" />}
          <span>{isPaused ? 'Reanudar auto-avance (1 min)' : 'Pausar auto-avance'}</span>
        </button>
      </div>

      {/* Tarjeta Showcase Panorámica: Todo visible en pantalla sin scroll vertical */}
      <div
        key={activeFeature.id}
        className="mt-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xl overflow-hidden transition-all duration-500 animate-in fade-in-50"
      >
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* Columna Izquierda (4 columnas): Título, Descripción y los 3 Beneficios en un vistazo */}
            <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-200 dark:border-green-800 text-[10px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span>{activeFeature.badge}</span>
                  </Badge>
                  <span className="text-xs text-stone-400 font-semibold">
                    {activeIndex + 1} de {FEATURES.length}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-green-50 font-headline">
                  {activeFeature.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 dark:text-green-200/80 leading-relaxed">
                  {activeFeature.description}
                </p>
              </div>

              {/* 3 Beneficios directos agrupados en la misma columna */}
              <div className="space-y-2 pt-0.5">
                {activeFeature.bullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800/80 space-y-0.5 hover:border-green-300 dark:hover:border-green-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                      <span>{bullet.title}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 leading-snug pl-5">
                      {bullet.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-1 text-[11px] text-stone-500 flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span>Haz clic en la captura de la derecha para verla en pantalla completa.</span>
              </div>
            </div>

            {/* Columna Derecha (8 columnas): Gran captura en alta definición */}
            <div className="lg:col-span-8 order-1 lg:order-2 flex items-center justify-center">
              <div className="w-full">
                <FeatureMockupDialog
                  title={activeFeature.title}
                  previewSrc={activeFeature.desktopSrc}
                  mobileSrc={activeFeature.mobileSrc}
                  desktopSrc={activeFeature.desktopSrc}
                  altText={activeFeature.altText}
                  className="mb-0 shadow-lg"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
