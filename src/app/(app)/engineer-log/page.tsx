

'use client';

import React, { useContext } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, HardHat, Weight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { ApplicationHistory } from './application-history';
import { PhenologyLogForm } from './phenology-log-form';
import { PhenologyHistory } from './phenology-history';
import { HealthLogForm } from './health-log-form';
import { EnvironmentalLogForm } from './environmental-log-form';
import { IrrigationLogForm } from './irrigation-log-form';
import { NotesHistory } from '../producer-log/notes-history';
import { ActivityOmissionLogForm } from './activity-omission-log-form';
import { Supplies } from './supplies';
import { ApplicationRecommendation } from './application-recommendation';
import { AgronomistReportGenerator } from './agronomist-report-generator';
import { RecommendedActionsPanel } from './recommended-actions-panel';
import { PhenologyEvolutionChart } from './phenology-evolution-chart';
import { WeatherCard } from '@/components/weather-card';

export default function EngineerLogPage() {
  const { loading, collectors, harvests, currentUser } = useContext(AppDataContext);
  
  if (!currentUser) return null; // Guard clause

  const totalProduction = harvests.reduce((acc, h) => acc + h.kilograms, 0);
  
  const harvestedBatchIds = [...new Set(harvests.flatMap(h => h.batchNumber.split(',').map(s => s.trim())))];
  const totalKgInHarvestedBatches = harvestedBatchIds.reduce((total, batchId) => {
    const batchKilos = harvests.filter(h => h.batchNumber === batchId || h.batchNumber.split(',').map(s => s.trim()).includes(batchId)).reduce((sum, h) => sum + h.kilograms, 0);
    return total + batchKilos;
  }, 0);
  
  const averageYieldPerBatch = harvestedBatchIds.length > 0 ? totalKgInHarvestedBatches / harvestedBatchIds.length : 0;
  
  const canManageApplications = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';


  return (
    <>
      <PageHeader
        title="Bitácora del Agrónomo"
        description="Gestión de aplicaciones, fenología y visión general de la producción."
      >
        <WeatherCard />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 mb-6 sm:mb-8">
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Producción Total">
              <span className="hidden sm:inline">Producción Total</span>
              <span className="sm:hidden">Prod. Total</span>
            </CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : `${totalProduction.toLocaleString('es-ES')} kg`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1">Acumulado temporada</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Rendimiento Promedio/Lote">
              <span className="hidden sm:inline">Rendimiento Promedio/Lote</span>
              <span className="sm:hidden">Rend. Prom./Lote</span>
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : `${averageYieldPerBatch.toFixed(1)} kg`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1">Promedio por lote</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Total de Recolectores">
              <span className="hidden sm:inline">Total de Recolectores</span>
              <span className="sm:hidden">Recolectores Activos</span>
            </CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 flex items-baseline justify-between sm:block">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-12" /> : collectors.length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1">Activos esta temporada</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Visualización y Análisis */}
        <div className="space-y-8">
            <PhenologyEvolutionChart />
            {canManageApplications && <RecommendedActionsPanel />}
            {canManageApplications && <ApplicationRecommendation />}
            {canManageApplications && <AgronomistReportGenerator />}
            <PhenologyHistory />
            <ApplicationHistory />
            <NotesHistory />
        </div>

        {/* Columna Derecha: Registro y Gestión */}
        <div className="space-y-8">
          {canManageApplications && (
            <>
              <HealthLogForm />
              <IrrigationLogForm />
              <PhenologyLogForm />
              <EnvironmentalLogForm />
              <ActivityOmissionLogForm />
            </>
          )}
          {!canManageApplications && (
            <Card>
                <CardHeader>
                    <CardTitle>Acceso de solo lectura</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No tiene permisos para registrar nuevas actividades.</p>
                </CardContent>
            </Card>
          )}
        </div>
      </div>

      {canManageApplications && (
        <div className="mt-8">
          <Supplies />
        </div>
      )}
    </>
  );
}
