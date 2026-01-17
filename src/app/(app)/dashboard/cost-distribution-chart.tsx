
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
  },
  'Cosecha': {
    label: "Cosecha",
    color: "hsl(var(--chart-1))",
  },
  'Embalaje': {
    label: "Embalaje",
    color: "hsl(var(--chart-2))",
  },
   'Mano de Obra': {
    label: "Mano de Obra",
    color: "hsl(var(--chart-5))",
  },
  'Insumos': {
    label: "Insumos",
    color: "hsl(var(--chart-3))",
  },
  'Riego': {
    label: "Riego",
    color: "hsl(var(--chart-4))",
  },
   'Mantenimiento': {
    label: "Mantenimiento",
    color: "hsl(var(--chart-5))",
  },
  'Servicios': {
    label: "Servicios",
    color: "hsl(var(--chart-1))",
  },
  'Otro': {
      label: "Otro",
      color: "hsl(var(--muted))"
  }
} as const;

function CostDistributionChartComponent({ isForPdf = false }: { isForPdf?: boolean}) {
  const { loading, transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs } = useContext(AppDataContext);

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
        if (!costs[category]) {
            costs[category] = 0;
        }
        costs[category] += amount;
    });

    return costs;
  }, [otherExpenses, totalHarvestLaborCost, totalPackagingLaborCost, totalCulturalPracticeCost]);

  const costDistributionData = useMemo(() => 
      Object.entries(costByCategory).map(([category, value]) => ({
          name: category,
          value,
          fill: costChartConfig[category as keyof typeof costChartConfig]?.color || 'hsl(var(--muted))'
      })).filter(item => item.value > 0),
  [costByCategory]);

  const chart = (
    <ChartContainer config={costChartConfig} className="h-[250px] lg:h-[300px] w-full">
        <RechartsPieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie 
              data={costDistributionData} 
              dataKey="value" 
              nameKey="name" 
              innerRadius={isForPdf ? 50 : 60} 
              labelLine={!isForPdf} 
              label={isForPdf ? ({name, percent}) => `${costChartConfig[name as keyof typeof costChartConfig]?.label || name}: ${(percent * 100).toFixed(0)}%` : undefined}
            >
                {costDistributionData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
            </Pie>
        </RechartsPieChart>
    </ChartContainer>
  );

  if (isForPdf) {
    // For PDF generation, we need the Card structure to be captured by html2canvas
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribución de Costos</CardTitle>
            </CardHeader>
            <CardContent>{chart}</CardContent>
        </Card>
    )
  }

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (costDistributionData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Costos</CardTitle>
          <CardDescription>Desglose de los costos operativos totales registrados.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] w-full items-center justify-center">
            <p className="text-muted-foreground">No hay costos registrados para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Costos</CardTitle>
        <CardDescription>Desglose de los costos operativos totales registrados.</CardDescription>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}

export const CostDistributionChart = React.memo(CostDistributionChartComponent);
