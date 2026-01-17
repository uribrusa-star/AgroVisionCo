
'use client';

import React, { useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  kilograms: {
    label: "Kilogramos",
    color: "hsl(var(--chart-1))",
  },
};

function BatchYieldChartComponent() {
  const { loading, harvests } = useContext(AppDataContext);

  const harvestedBatchIds = [...new Set(harvests.map(h => h.batchNumber))];
  
  // We want to show latest harvested batches, so we need to find the latest harvest date for each batch
  const batchLastHarvestDates = harvestedBatchIds.map(batchId => {
      const dates = harvests.filter(h => h.batchNumber === batchId).map(h => new Date(h.date).getTime());
      return { batchId, lastDate: Math.max(...dates) };
  })
  .sort((a,b) => b.lastDate - a.lastDate)
  .slice(0,10);

  const chartData = batchLastHarvestDates.map(batchInfo => {
    const batchHarvests = harvests.filter(h => h.batchNumber === batchInfo.batchId);
    const totalKilos = batchHarvests.reduce((sum, h) => sum + h.kilograms, 0);
    return {
      batch: batchInfo.batchId,
      kilograms: totalKilos,
    };
  }).reverse(); // reverse to show chronologically

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por Lote</CardTitle>
        <CardDescription>Kilogramos cosechados de los últimos 10 lotes con actividad.</CardDescription>
      </CardHeader>
      <CardContent>
         {chartData.length > 0 ? (
           <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsBarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="batch"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => `${value} kg`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="kilograms" fill="var(--color-kilograms)" radius={4} />
            </RechartsBarChart>
          </ChartContainer>
         ) : (
          <div className="flex h-[300px] w-full items-center justify-center">
            <p className="text-muted-foreground">No hay datos de lotes cosechados para mostrar.</p>
          </div>
         )}
      </CardContent>
    </Card>
  )
}
export const BatchYieldChart = React.memo(BatchYieldChartComponent);
