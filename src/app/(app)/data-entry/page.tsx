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
import { Scale, Package, Shovel, QrCode, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { UserCredentialDialog } from "@/components/user-credential-dialog";
import { AttendanceScannerDialog } from "@/components/attendance-scanner-dialog";

export default function DataEntryPage() {
  const { currentUser, attendanceLogs } = React.useContext(AppDataContext);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  if (!currentUser) return null; // Guard clause

  const currentAttendance = (attendanceLogs || []).find(l => 
    l.status === 'in_progress' && 
    ((currentUser.id && l.personnelId === currentUser.id) ||
     (currentUser.dni && l.dni && l.dni === currentUser.dni) ||
     (l.personnelName && currentUser.name && l.personnelName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
  );

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

      {/* Banner de Asistencia y Credencial para el Encargado */}
      <div className="mb-6 p-3.5 sm:p-4 rounded-2xl border bg-card/80 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            currentAttendance 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
          }`}>
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Control de Asistencia del Encargado</span>
              {currentAttendance ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  Presente en finca
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Fuera de finca
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentAttendance 
                ? `Ingreso hoy a las ${format(new Date(currentAttendance.checkIn), 'HH:mm')} hs. Muestre su QR al salir o escanee al personal.`
                : 'Muestre su credencial al entrar o use el escáner de tranquera para registrar al personal.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsCredentialModalOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <QrCode className="h-3.5 w-3.5" />
            Mi Credencial QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsScannerOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Escanear Tranquera
          </Button>
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

      <UserCredentialDialog
        isOpen={isCredentialModalOpen}
        onOpenChange={setIsCredentialModalOpen}
        user={currentUser}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      <AttendanceScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  );
}
