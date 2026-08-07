
'use client';

import React, { useContext, useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
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
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  margin: {
    label: "Margen Neto (ARS)",
    color: "hsl(var(--chart-2))",
  },
};

export function ProfitabilityTrendChart() {
  const { loading, transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs } = useContext(AppDataContext);

  const chartData = useMemo(() => {
    if (loading) return [];

    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // Process Transactions
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
      
      if (t.type === 'Ingreso') {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expense += t.amount;
      }
    });

    // Process Labor Costs
    [...collectorPaymentLogs, ...packagingLogs, ...culturalPracticeLogs].forEach(p => {
      const date = new Date(p.date);
      const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
      monthlyData[monthKey].expense += p.payment;
    });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      const [mA, yA] = a.split(" '");
      const [mB, yB] = b.split(" '");
      const dA = new Date(parseInt(yA) + 2000, monthNames.indexOf(mA));
      const dB = new Date(parseInt(yB) + 2000, monthNames.indexOf(mB));
      return dA.getTime() - dB.getTime();
    });

    return sortedMonths.map(month => ({
      month,
      margin: monthlyData[month].income - monthlyData[month].expense,
    }));
  }, [loading, transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs]);

  if (loading) return <Skeleton className="h-[350px] w-full" />;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Rentabilidad</CardTitle>
          <CardDescription>Margen neto mensual (Ingresos - Gastos totales).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos financieros suficientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader>
        <CardTitle>Tendencia de Rentabilidad</CardTitle>
        <CardDescription>Evolución del margen neto mensual en Pesos Argentinos.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Line
              type="monotone"
              dataKey="margin"
              stroke="var(--color-margin)"
              strokeWidth={2}
              dot={{ fill: "var(--color-margin)" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
