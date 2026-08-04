
'use client';
import { PageHeader } from "@/components/page-header";
import { ProductionForm } from "./production-form";
import { BatchHistory } from "../engineer-log/batch-history";
import { BatchLogForm } from "../engineer-log/batch-log-form";
import React, { useState } from "react";
import { AppDataContext } from "@/context/app-data-context.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PackagingForm } from "./packaging-form";
import { CulturalPracticesLogForm } from "./cultural-practices-log-form";
import { CulturalPracticesHistory } from "./cultural-practices-history";
import { WeatherCard } from "@/components/weather-card";
import { TareCalculator } from "./tare-calculator";
import { ProductionPaymentHistory } from "../production-payment-history";

export default function DataEntryPage() {
  const { currentUser } = React.useContext(AppDataContext);
  const [showCalculator, setShowCalculator] = useState(false);
  
  if (!currentUser) return null; // Guard clause
  const canManageBatches = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  return (
    <>
      <PageHeader
        title="Entrada de Datos"
        description="Registre datos de producción, embalaje, pagos y gestione los lotes."
      >
        <WeatherCard />
      </PageHeader>
      <div className="w-full max-w-7xl mx-auto space-y-8">
        
        {/* Fila 1: Formulario de Producción y Calculadora (1 y 2) */}
        <div className={`grid grid-cols-1 ${showCalculator ? 'lg:grid-cols-2' : ''} gap-8 items-start`}>
            <div>
               <ProductionForm onToggleCalculator={() => setShowCalculator(!showCalculator)} showCalculator={showCalculator} />
            </div>
            {showCalculator && (
                <div className="h-full">
                   <TareCalculator />
                </div>
            )}
        </div>

        {/* Fila 2: Historial (3) */}
        <div>
            <ProductionPaymentHistory />
        </div>

        {/* Demás Secciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {canManageBatches ? <BatchLogForm /> : <Card><CardHeader><CardTitle>Acceso Denegado</CardTitle><CardContent><p>No tiene permisos para pre-cargar lotes.</p></CardContent></CardHeader></Card>}
            <BatchHistory />
        </div>
        <div>
          <PackagingForm />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CulturalPracticesLogForm />
            <CulturalPracticesHistory />
        </div>
      </div>
    </>
  );
}

    