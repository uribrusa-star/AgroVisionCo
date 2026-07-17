
'use client';

import React, { useContext, useTransition, useMemo, useRef } from 'react';
import Image from 'next/image';


import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { summarizeHarvestData } from '@/ai/flows/summarize-harvest-data';
import { useToast } from '@/hooks/use-toast';
import { MonthlyHarvestChart } from '@/app/(app)/monthly-harvest-chart';
import { BatchYieldChart } from '@/app/(app)/engineer-log/batch-yield-chart';
import { CostDistributionChart } from '../dashboard/cost-distribution-chart';
import { ProfitabilityTrendChart } from './profitability-trend-chart';
import { IncomeChart } from './income-chart';


export function HarvestSummary() {
  const [isPending, startTransition] = useTransition();
  const { harvests, transactions, agronomistLogs, currentUser, establishmentData, collectorPaymentLogs, packagingLogs, culturalPracticeLogs } = useContext(AppDataContext);
  const { toast } = useToast();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';

  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const costChartRef = useRef<HTMLDivElement>(null);
  const batchYieldChartRef = useRef<HTMLDivElement>(null);
  const profitabilityChartRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<HTMLDivElement>(null);

  const totalProduction = useMemo(() => harvests.reduce((acc, h) => acc + h.kilograms, 0), [harvests]);
  
  const totalHarvestLaborCost = useMemo(() => collectorPaymentLogs.reduce((acc, p) => acc + p.payment, 0), [collectorPaymentLogs]);
  const totalPackagingLaborCost = useMemo(() => packagingLogs.reduce((acc, p) => acc + p.payment, 0), [packagingLogs]);
  const totalCulturalPracticeCost = useMemo(() => culturalPracticeLogs.reduce((acc, p) => acc + p.payment, 0), [culturalPracticeLogs]);
  
  const otherExpenses = useMemo(() => transactions.filter(t => t.type === 'Gasto'), [transactions]);

  const costByCategory = useMemo(() => {
    const costs: {[key: string]: number} = { 
      'Cosecha': totalHarvestLaborCost,
      'Embalaje': totalPackagingLaborCost,
      'Mano de Obra': totalCulturalPracticeCost,
    };
    
    otherExpenses.forEach(transaction => {
        const { category, amount } = transaction;
        if (!costs[category]) {
            costs[category] = 0;
        }
        costs[category] += amount;
    });

    return costs;
  }, [otherExpenses, totalHarvestLaborCost, totalPackagingLaborCost, totalCulturalPracticeCost]);
  
  const totalCost = useMemo(() => Object.values(costByCategory).reduce((acc, amount) => acc + amount, 0), [costByCategory]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  
  // Use establishment data for calculations, with fallbacks
  const farmArea = establishmentData?.area.strawberry || 1; // Default to 1ha to avoid division by zero
  

  const handleGeneratePdf = () => {
    startTransition(async () => {
      if (!establishmentData) {
        toast({
            title: 'Datos no disponibles',
            description: 'No se pueden cargar los datos del establecimiento para generar el informe.',
            variant: 'destructive',
        });
        return;
      }
      if (harvests.length === 0) {
        toast({
            title: 'No hay datos',
            description: 'No se puede generar un informe sin datos de cosecha.',
            variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Generando Informe',
        description: 'Por favor espere, estamos compilando los datos y el análisis de IA...',
      });

      try {
        let logoPngDataUri = '';
        try {
          const response = await fetch('/logo.png');
          const blob = await response.blob();
          logoPngDataUri = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Error loading logo:", e);
        }

        const captureChart = async (ref: React.RefObject<HTMLDivElement>) => {
            if (!ref.current) return '';
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(ref.current, { scale: 3, backgroundColor: '#ffffff' });
            return canvas.toDataURL('image/png');
        };

        const [monthlyHarvestImg, costDistributionImg, batchYieldImg, profitabilityImg, incomeImg] = await Promise.all([
            captureChart(monthlyChartRef),
            captureChart(costChartRef),
            captureChart(batchYieldChartRef),
            captureChart(profitabilityChartRef),
            captureChart(incomeChartRef)
        ]);

        const formattedCostByCategory = Object.fromEntries(
            Object.entries(costByCategory).map(([key, value]) => [key, `$${value.toLocaleString('es-AR')}`])
        );

        const aiInput = {
            productionData: JSON.stringify({
              "Superficie Cultivada (ha)": farmArea,
              "Producción Total (kg)": totalProduction.toLocaleString('es-ES'),
              "Rendimiento (kg/ha)": (totalProduction / farmArea).toLocaleString('es-ES', {maximumFractionDigits: 0})
            }),
            costData: JSON.stringify({
              "Costo Total (ARS)": `$${totalCost.toLocaleString('es-AR')}`,
              "Costos por Categoría (ARS)": formattedCostByCategory
            }),
            agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 15).map(l => ({type: l.type, product: l.product, notes: l.notes}))),
        };
        
        const aiResult = await summarizeHarvestData(aiInput);

        const { generateProducerHarvestReportPDF } = await import('@/lib/pdf-generator');
        
        generateProducerHarvestReportPDF(
            establishmentData,
            aiResult,
            {
                totalProduction,
                farmArea,
                totalCost,
                totalIncome,
                costByCategory
            },
            {
                monthlyHarvest: monthlyHarvestImg,
                costDistribution: costDistributionImg,
                batchYield: batchYieldImg,
                profitabilityTrend: profitabilityImg,
                monthlyIncome: incomeImg
            },
            logoPngDataUri
        );
        
        toast({
            title: '¡Informe Generado!',
            description: 'El archivo PDF profesional se ha descargado exitosamente.',
        });

      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
          title: 'Error al Generar Informe',
          description: 'No se pudo generar el resumen con IA o compilar el PDF.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Informe de Cosecha en PDF</CardTitle>
          <CardDescription>Genere un informe de producción profesional con análisis de IA, tablas y gráficos.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                El informe se compilará en un documento PDF formal, ideal para análisis y archivo.
            </p>
            {/* Hidden elements for rendering and capturing */}
            <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
              <div ref={costChartRef} className='p-4 bg-card w-[450px]'>
                 <CostDistributionChart isForPdf={true} />
              </div>
               <div ref={monthlyChartRef} className="p-4 bg-card w-[450px]">
                   <MonthlyHarvestChart harvests={harvests} />
               </div>
               <div ref={batchYieldChartRef} className="p-4 bg-card w-[450px]">
                    <BatchYieldChart />
               </div>
               <div ref={profitabilityChartRef} className="p-4 bg-card w-[450px]">
                    <ProfitabilityTrendChart />
               </div>
               <div ref={incomeChartRef} className="p-4 bg-card w-[450px]">
                    <IncomeChart transactions={transactions} />
               </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGeneratePdf} disabled={isPending || !canManage}>
            {isPending ? 'Generando PDF...' : 'Generar Informe PDF'}
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
