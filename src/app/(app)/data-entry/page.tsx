'use client';

import React, { useState } from "react";
import { ProductionForm } from "./production-form";
import { BatchHistory } from "../engineer-log/batch-history";
import { AppDataContext } from "@/context/app-data-context.tsx";
import { PackagingForm } from "./packaging-form";
import { CulturalPracticesLogForm } from "./cultural-practices-log-form";
import { CulturalPracticesHistory } from "./cultural-practices-history";
import { WeatherCard } from "@/components/weather-card";
import { TareCalculator } from "./tare-calculator";
import { ProductionPaymentHistory } from "../production-payment-history";
import { Scale, Package, Shovel } from "lucide-react";

export default function DataEntryPage() {
  const { currentUser } = React.useContext(AppDataContext);
  const [showCalculator, setShowCalculator] = useState(false);
  
  if (!currentUser) return null; // Guard clause

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Cabecera optimizada: Título y Clima arriba, luego subtítulo y los 3 accesos rápidos */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 mb-2">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground shrink-0">
            Entrada de Datos
          </h1>
          <WeatherCard compact />
        </div>

        <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
          Registre datos de producción, embalaje, pagos y gestione los lotes.
        </p>

        {/* 3 Iconos Principales de Navegación Rápida centrados en la pantalla */}
        <div className="flex justify-center w-full">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm">
            <button
              type="button"
              onClick={() => scrollToSection('section-production')}
              aria-label="Ir a Carga de Producción"
              title="Producción"
              className="flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/25 border-2 border-emerald-500/40 hover:border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
            >
              <Scale className="h-7 w-7 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
            </button>
            
            <button
              type="button"
              onClick={() => scrollToSection('section-packaging')}
              aria-label="Ir a Costo de Embalaje"
              title="Embalaje"
              className="flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/25 border-2 border-blue-500/40 hover:border-blue-600 text-blue-700 dark:text-blue-400 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
            >
              <Package className="h-7 w-7 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
            </button>
            
            <button
              type="button"
              onClick={() => scrollToSection('section-cultural')}
              aria-label="Ir a Labores Culturales"
              title="Labor Cultural"
              className="flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/25 border-2 border-amber-500/40 hover:border-amber-600 text-amber-700 dark:text-amber-400 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
            >
              <Shovel className="h-7 w-7 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto space-y-8">
        
        {/* Sección 1: Formulario de Producción y (Calculadora o Historial) */}
        <div id="section-production" className="scroll-mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
               <ProductionForm onToggleCalculator={() => setShowCalculator(!showCalculator)} showCalculator={showCalculator} />
            </div>
            {showCalculator ? (
                <div className="h-full">
                   <TareCalculator />
                </div>
            ) : (
                <div>
                   <ProductionPaymentHistory />
                </div>
            )}
        </div>

        {/* Historial (si la calculadora está ocupando el espacio superior) */}
        {showCalculator && (
            <div>
                <ProductionPaymentHistory />
            </div>
        )}

        {/* Gestión e Historial de Lotes */}
        <div>
            <BatchHistory />
        </div>

        {/* Sección 2: Embalaje */}
        <div id="section-packaging" className="scroll-mt-6">
          <PackagingForm />
        </div>

        {/* Sección 3: Labores Culturales */}
        <div id="section-cultural" className="scroll-mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CulturalPracticesLogForm />
            <CulturalPracticesHistory />
        </div>
      </div>
    </>
  );
}
