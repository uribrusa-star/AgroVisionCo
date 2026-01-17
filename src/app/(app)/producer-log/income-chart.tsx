
"use client";

import React, { useMemo } from 'react';
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
import type { Transaction } from "@/lib/types";

const chartConfig = {
  total: {
    label: "Ingresos (ARS)",
    color: "hsl(var(--chart-1))",
  },
};

const processTransactionsForChart = (transactions: Transaction[]) => {
    const monthlyData: { [key: string]: number } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const incomeTransactions = transactions.filter(t => t.type === 'Ingreso');

    incomeTransactions.forEach(transaction => {
        const monthIndex = new Date(transaction.date).getMonth();
        const year = new Date(transaction.date).getFullYear();
        const monthKey = `${monthNames[monthIndex]} '${String(year).slice(2)}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += transaction.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const [monthA, yearA] = a.split(" '");
        const [monthB, yearB] = b.split(" '");
        const dateA = new Date(parseInt(yearA) + 2000, monthNames.indexOf(monthA));
        const dateB = new Date(parseInt(yearB) + 2000, monthNames.indexOf(monthB));
        return dateA.getTime() - dateB.getTime();
    });

    return sortedMonths.map(month => ({
        month,
        total: monthlyData[month] || 0,
    }));
};

function IncomeChartComponent({ transactions }: { transactions: Transaction[] }) {
  const chartData = useMemo(() => processTransactionsForChart(transactions), [transactions]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Mensuales</CardTitle>
          <CardDescription>Total de ingresos (ventas) registrados por mes.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] w-full items-center justify-center">
          <p className="text-muted-foreground">No hay ingresos registrados para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
        <CardDescription>Total de ingresos (ventas) registrados por mes.</CardDescription>
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
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => `$${value / 1000}k`}
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

export const IncomeChart = React.memo(IncomeChartComponent);
