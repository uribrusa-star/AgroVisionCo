
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { BarChart as BarChartIcon, CalendarDays, DollarSign, Trophy, Weight, Tractor } from "lucide-react";
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Harvest, CollectorPaymentLog, PackagingLog, CulturalPracticeLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyHarvestChart } from '@/app/(app)/monthly-harvest-chart';
import { CostDistributionChart } from './cost-distribution-chart';
import { ProductionPaymentHistory } from '../production-payment-history';
import { PackagingHistory } from '../data-entry/packaging-history';
import { BatchYieldChart } from '../engineer-log/batch-yield-chart';
import { PushNotificationBanner } from '@/components/push-notification-banner';
import { HarvestsOverTimeChart } from './harvests-over-time-chart';
import { WeatherCard } from '@/components/weather-card';


export default function DashboardPage() {
  const { loading, harvests, collectors, collectorPaymentLogs, packagingLogs, culturalPracticeLogs } = React.useContext(AppDataContext);

  const calculateDashboardStats = (harvests: Harvest[], paymentLogs: CollectorPaymentLog[], packagingLogs: PackagingLog[], culturalPracticeLogs: CulturalPracticeLog[]) => {
    if (!harvests || harvests.length === 0) {
      return {
        totalHarvest: 0,
        averageYield: 0,
        peakDay: null,
        totalLaborCost: 0,
      };
    }

    const totalHarvest = harvests.reduce((acc, h) => acc + h.kilograms, 0);
    const totalHarvestLaborCost = (paymentLogs || []).reduce((acc, p) => acc + p.payment, 0);
    const totalPackagingLaborCost = (packagingLogs || []).reduce((acc, p) => acc + p.payment, 0);
    const totalCulturalPracticeCost = (culturalPracticeLogs || []).reduce((acc, p) => acc + p.payment, 0);
    const totalLaborCost = totalHarvestLaborCost + totalPackagingLaborCost + totalCulturalPracticeCost;
    
    const harvestsByBatch = harvests.reduce((acc, h) => {
        const batches = h.batchNumber.split(',').map(s => s.trim());
        batches.forEach(b => {
            if (!acc[b]) {
                acc[b] = 0;
            }
            acc[b] += h.kilograms;
        });
        return acc;
    }, {} as {[key: string]: number});

    const numberOfBatches = Object.keys(harvestsByBatch).length;
    const averageYield = numberOfBatches > 0 ? totalHarvest / numberOfBatches : 0;

    const dailyHarvests: { [key: string]: number } = harvests.reduce((acc, h) => {
      const date = new Date(h.date).toLocaleDateString('es-ES');
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += h.kilograms;
      return acc;
    }, {} as { [key: string]: number });

    const peakDay = Object.keys(dailyHarvests).length > 0
        ? Object.keys(dailyHarvests).reduce((a, b) => dailyHarvests[a] > dailyHarvests[b] ? a : b)
        : null;


    return {
      totalHarvest,
      averageYield,
      peakDay,
      totalLaborCost,
    };
  };
  

  const dashboardStats = calculateDashboardStats(harvests, collectorPaymentLogs, packagingLogs, culturalPracticeLogs);
  const sortedHarvests = [...(harvests || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const collectorsWithDynamicStats = (collectors || []).map(collector => {
    const collectorHarvests = (harvests || []).filter(h => h.collector.id === collector.id);
    const collectorLogs = (collectorPaymentLogs || []).filter(l => l.collectorId === collector.id);
    
    const calculatedTotalHarvested = collectorHarvests.length > 0
      ? collectorHarvests.reduce((sum, h) => sum + h.kilograms, 0)
      : collector.totalHarvested;
      
    const calculatedHoursWorked = collectorLogs.length > 0
      ? collectorLogs.reduce((sum, l) => sum + l.hours, 0)
      : collector.hoursWorked;
      
    const calculatedProductivity = calculatedHoursWorked > 0
      ? calculatedTotalHarvested / calculatedHoursWorked
      : (collector.productivity || 0);

    return {
      ...collector,
      productivity: calculatedProductivity,
      totalHarvested: calculatedTotalHarvested,
      hoursWorked: calculatedHoursWorked
    };
  });

  const sortedCollectors = collectorsWithDynamicStats.sort((a,b) => b.productivity - a.productivity);

  return (
    <>
      <PageHeader title="Panel de Control" description="Estadísticas clave y actividad reciente.">
        <WeatherCard />
      </PageHeader>
      <PushNotificationBanner />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 mb-6 sm:mb-8">
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Cosecha Total</CardTitle>
            <Weight className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : `${dashboardStats.totalHarvest.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1" title="Acumulado de la temporada">
              Acumulado temporada
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Costo Mano de Obra">
              <span className="hidden sm:inline">Costo de Mano de Obra</span>
              <span className="sm:hidden">Costo Mano Obra</span>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : `$${dashboardStats.totalLaborCost.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1" title="Cosecha + Embalaje + Labores">
              Cosecha + Embalaje...
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Rendimiento Promedio">
              <span className="hidden sm:inline">Rendimiento Promedio</span>
              <span className="sm:hidden">Rend. Promedio</span>
            </CardTitle>
            <BarChartIcon className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : `${dashboardStats.averageYield.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg/lote`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1" title="Promedio por lote cosechado">
              Promedio por lote
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate" title="Día Pico de Cosecha">
              <span className="hidden sm:inline">Día Pico de Cosecha</span>
              <span className="sm:hidden">Día Pico</span>
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" /> : (dashboardStats.peakDay || 'N/A')}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1" title="El día más productivo">
              El día más productivo
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2 xl:col-span-2">
          <MonthlyHarvestChart harvests={harvests} />
        </div>
        <div className="md:col-span-1">
          <CostDistributionChart />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <HarvestsOverTimeChart harvests={harvests} />
        </div>
        <div className="md:col-span-2 xl:col-span-2">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tractor className="w-5 h-5 text-primary" />
                  Cosechas Recientes
                </CardTitle>
                <CardDescription>Una lista de las entradas de cosecha más recientes.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-auto pr-2">
                    {loading && Array.from({ length: 3 }).map((_,i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                    {!loading && sortedHarvests.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">No hay cosechas recientes.</div>
                    )}
                    {!loading && sortedHarvests.slice(0, 5).map((harvest) => (
                      <div key={harvest.id} className="shrink-0 group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                              <div className="shrink-0 flex items-center justify-center">
                                  <Badge variant="secondary" className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                                      <Tractor className="h-5 w-5" />
                                  </Badge>
                              </div>
                              <div className="min-w-0 flex flex-col justify-center flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-sm truncate leading-none">{harvest.collector.name}</span>
                                      <span className="text-xs text-muted-foreground shrink-0 leading-none">{new Date(harvest.date).toLocaleDateString('es-AR')}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                                      Lote: <Badge variant="outline" className="text-[10px] px-1 py-0">{harvest.batchNumber}</Badge>
                                      <span className="mx-1.5 opacity-50">•</span>
                                      Kilos: <span className="font-bold text-foreground">{harvest.kilograms.toLocaleString('es-ES')} kg</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                    ))}
                </div>
            </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1 xl:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Ranking de Productividad</CardTitle>
                    <CardDescription>Rendimiento de cada recolector ordenado de mayor a menor.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Recolector</TableHead>
                            <TableHead className="text-right">kg/hr</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading && Array.from({ length: 3 }).map((_,i) => (
                           <TableRow key={i}>
                            <TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell>
                           </TableRow>
                        ))}
                        {!loading && sortedCollectors.map((collector, index) => (
                            <TableRow key={collector.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                {index === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                                {collector.name}
                            </TableCell>
                            <TableCell className="text-right font-bold">{collector.productivity.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <BatchYieldChart />
        </div>
      </div>
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <ProductionPaymentHistory />
        <PackagingHistory />
      </div>
    </>
  );
}
