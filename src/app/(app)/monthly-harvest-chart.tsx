
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Harvest } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect, useState } from "react";

const chartConfig = {
  total: {
    label: "Total (kg)",
    color: "hsl(var(--chart-1))",
  },
};

const processHarvestsForChart = (harvests: Harvest[]) => {
    const monthlyData: { [key: string]: number } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    harvests.forEach(harvest => {
        const monthIndex = new Date(harvest.date).getMonth();
        const monthName = monthNames[monthIndex];
        if (!monthlyData[monthName]) {
            monthlyData[monthName] = 0;
        }
        monthlyData[monthName] += harvest.kilograms;
    });

    return monthNames.map(month => ({
        month,
        total: monthlyData[month] || 0,
    })).filter(d => d.total > 0);
};


function MonthlyHarvestChartComponent({ harvests }: { harvests: Harvest[] }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = processHarvestsForChart(harvests);
  
  if (!isClient) {
    return (
      <Card>
        <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Cosecha Mensual</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Total de kilogramos cosechados por mes.</CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-4 pt-0 sm:pt-0">
           <Skeleton className="h-[200px] sm:h-[220px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if(chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Cosecha Mensual</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Total de kilogramos cosechados por mes.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] sm:h-[220px] w-full items-center justify-center p-3.5 sm:p-4 pt-0 sm:pt-0">
            <p className="text-muted-foreground text-xs">No hay datos de cosecha para mostrar.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold">Cosecha Mensual</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Total de kilogramos cosechados por mes.</CardDescription>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-4 pt-0 sm:pt-0">
        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export const MonthlyHarvestChart = React.memo(MonthlyHarvestChartComponent);
