

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


export default function EngineerLogPage() {
  const { loading, collectors, harvests, currentUser } = useContext(AppDataContext);
  
  if (!currentUser) return null; // Guard clause

  const totalProduction = harvests.reduce((acc, h) => acc + h.kilograms, 0);
  
  const harvestedBatchIds = [...new Set(harvests.map(h => h.batchNumber))];
  const totalKgInHarvestedBatches = harvestedBatchIds.reduce((total, batchId) => {
    const batchKilos = harvests.filter(h => h.batchNumber === batchId).reduce((sum, h) => sum + h.kilograms, 0);
    return total + batchKilos;
  }, 0);
  
  const averageYieldPerBatch = harvestedBatchIds.length > 0 ? totalKgInHarvestedBatches / harvestedBatchIds.length : 0;
  
  const canManageApplications = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';


  return (
    <>
      <PageHeader
        title="Bitácora del Agrónomo"
        description="Gestión de aplicaciones, fenología y visión general de la producción."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producción Total</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24" /> : `${totalProduction.toLocaleString('es-ES')} kg`}</div>
            <p className="text-xs text-muted-foreground">Acumulado de la temporada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendimiento Promedio/Lote</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24" /> : `${averageYieldPerBatch.toFixed(1)} kg`}</div>
            <p className="text-xs text-muted-foreground">Promedio en lotes cosechados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Recolectores</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : collectors.length}</div>
            <p className="text-xs text-muted-foreground">Activos esta temporada</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Visualización y Análisis */}
        <div className="space-y-8">
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
              <Supplies />
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
    </>
  );
}
