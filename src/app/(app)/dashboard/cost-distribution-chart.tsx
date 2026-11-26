'use client';

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Pie, PieChart as RechartsPieChart, Cell } from 'recharts';

const costChartConfig = {
  costs: {
    label: "Costos",
    color: "#16a34a",
  },
  'Cosecha': {
    label: "Cosecha",
    color: "#16a34a", // Verde Cosecha
  },
  'Embalaje': {
    label: "Embalaje",
    color: "#f59e0b", // Naranja Amber
  },
  'Mano de Obra': {
    label: "Mano de Obra",
    color: "#e11d48", // Rojo / Rose
  },
  'Insumos': {
    label: "Insumos",
    color: "#eab308", // Amarillo Dorado
  },
  'Riego': {
    label: "Riego",
    color: "#0284c7", // Azul Cielo
  },
  'Mantenimiento': {
    label: "Mantenimiento",
    color: "#9333ea", // Púrpura
  },
  'Servicios': {
    label: "Servicios",
    color: "#0d9488", // Verde Azulado Teal
  },
  'Otro': {
    label: "Otro",
    color: "#78716c", // Gris Piedra
  }
} as const;

const FALLBACK_PALETTE = ['#16a34a', '#f59e0b', '#e11d48', '#0284c7', '#9333ea', '#0d9488', '#eab308', '#78716c'];

function CostDistributionChartComponent({ isForPdf = false }: { isForPdf?: boolean}) {
  const { loading, transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs, currentUser } = useContext(AppDataContext);

  const isProducer = currentUser?.role === 'Productor' || currentUser?.role === 'SuperAdmin';

  const totalHarvestLaborCost = useMemo(() => (collectorPaymentLogs || []).reduce((acc, p) => acc + p.payment, 0), [collectorPaymentLogs]);
  const totalPackagingLaborCost = useMemo(() => (packagingLogs || []).reduce((acc, p) => acc + p.payment, 0), [packagingLogs]);
  const totalCulturalPracticeCost = useMemo(() => (culturalPracticeLogs || []).reduce((acc, p) => acc + p.payment, 0), [culturalPracticeLogs]);

  const otherExpenses = useMemo(() => (transactions || []).filter(t => t.type === 'Gasto'), [transactions]);

  const costByCategory = useMemo(() => {
    const costs: {[key: string]: number} = { 
      'Cosecha': totalHarvestLaborCost,
      'Embalaje': totalPackagingLaborCost,
      'Mano de Obra': totalCulturalPracticeCost,
    };
    
    otherExpenses.forEach(transaction => {
        const { category, amount } = transaction;
        // La categoría 'Insumos' solo debe ser visible si el usuario es el Productor
        if (category === 'Insumos' && !isProducer) {
            return;
        }
        if (!costs[category]) {
            costs[category] = 0;
        }
        costs[category] += amount;
    });

    return costs;
  }, [otherExpenses, totalHarvestLaborCost, totalPackagingLaborCost, totalCulturalPracticeCost, isProducer]);

  const costDistributionData = useMemo(() => 
      Object.entries(costByCategory).map(([category, value], idx) => ({
          name: category,
          value,
          fill: costChartConfig[category as keyof typeof costChartConfig]?.color || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]
      })).filter(item => item.value > 0),
  [costByCategory]);

  const totalCost = useMemo(() => 
    costDistributionData.reduce((acc, item) => acc + item.value, 0),
  [costDistributionData]);

  const chart = (
    <div className="flex flex-col items-center w-full">
      <ChartContainer config={costChartConfig} className="h-[140px] sm:h-[155px] w-full">
        <RechartsPieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => `$${Math.round(Number(value)).toLocaleString('es-AR')}`} />} />
          <Pie 
            data={costDistributionData} 
            dataKey="value" 
            nameKey="name" 
            innerRadius={isForPdf ? 45 : 38} 
            outerRadius={isForPdf ? 75 : 62}
            paddingAngle={3}
            strokeWidth={2}
          >
            {costDistributionData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ChartContainer>

      {/* Modern Responsive Legend List */}
      <div className="flex flex-col gap-1 w-full mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
        {costDistributionData.map((item) => {
          const percent = totalCost > 0 ? ((item.value / totalCost) * 100).toFixed(0) : 0;
          const label = costChartConfig[item.name as keyof typeof costChartConfig]?.label || item.name;
          return (
            <div key={item.name} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors leading-tight">
              <div className="flex items-center gap-1.5 min-w-0 pr-2 overflow-visible">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                  style={{ backgroundColor: item.fill }} 
                />
                <span className="text-stone-700 dark:text-stone-300 font-medium whitespace-nowrap text-xs leading-normal">
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto leading-normal">
                <span className="text-stone-900 dark:text-stone-100 font-semibold text-xs leading-normal">
                  ${Math.round(item.value).toLocaleString('es-AR')}
                </span>
                <span className="text-stone-400 dark:text-stone-500 font-medium text-[10px] min-w-[32px] text-right leading-normal">
                  ({percent}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isForPdf) {
    // For PDF generation, we need the Card structure to be captured by html2canvas
    return (
        <Card className="bg-white text-stone-900 overflow-visible">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-stone-900 text-base font-bold">Distribución de Costos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 pb-4 overflow-visible">{chart}</CardContent>
        </Card>
    )
  }

  if (loading) {
    return <Skeleton className="h-[220px] w-full" />;
  }

  if (costDistributionData.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Distribución de Costos</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Desglose de los costos operativos totales registrados.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] sm:h-[220px] w-full items-center justify-center p-3.5 sm:p-4 pt-0 sm:pt-0">
            <p className="text-muted-foreground text-xs">No hay costos registrados para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold">Distribución de Costos</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Desglose de los costos operativos totales registrados.</CardDescription>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-4 pt-0 sm:pt-0">{chart}</CardContent>
    </Card>
  );
}

export const CostDistributionChart = React.memo(CostDistributionChartComponent);
