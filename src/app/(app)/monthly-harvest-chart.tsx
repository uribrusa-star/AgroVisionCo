
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
        <CardHeader>
          <CardTitle>Cosecha Mensual</CardTitle>
          <CardDescription>Total de kilogramos cosechados por mes.</CardDescription>
        </CardHeader>
        <CardContent>
           <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if(chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cosecha Mensual</CardTitle>
          <CardDescription>Total de kilogramos cosechados por mes.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] w-full items-center justify-center">
            <p className="text-muted-foreground">No hay datos de cosecha para mostrar.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cosecha Mensual</CardTitle>
        <CardDescription>Total de kilogramos cosechados por mes.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
