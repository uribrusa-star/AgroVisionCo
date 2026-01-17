
'use client';

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { YieldPredictionPanel } from './yield-prediction-panel';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PredictionHistory } from './prediction-history';
import { PlantDiagnosisCard } from '../engineer-log/plant-diagnosis-card';
import { DiagnosisHistory } from '../engineer-log/diagnosis-history';

export default function PredictionsPage() {
  return (
    <>
      <PageHeader
        title="Predicciones y Diagnósticos con IA"
        description="Utilice la IA para proyectar el rendimiento de sus lotes y para diagnosticar problemas de sanidad."
      />

      <Alert className="mb-8 border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-500">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Funcionalidad Experimental</AlertTitle>
        <AlertDescription>
          Los análisis se basan en los datos disponibles y modelos de IA. Tómelos como una guía y no como una garantía de resultados.
        </AlertDescription>
      </Alert>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <YieldPredictionPanel />
          <PredictionHistory />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PlantDiagnosisCard />
          <DiagnosisHistory />
        </div>
      </div>
    </>
  );
}
