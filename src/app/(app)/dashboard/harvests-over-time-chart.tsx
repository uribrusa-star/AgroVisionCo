"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Harvest } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const colors = [
  "#10b981", // green
  "#3b82f6", // blue
  "#f59e0b", // amber/orange
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
];

export function HarvestsOverTimeChart({ harvests }: { harvests: Harvest[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { chartData, batchesPresent } = useMemo(() => {
    if (!harvests || harvests.length === 0) {
      return { chartData: [], batchesPresent: [] };
    }

    const dateMap: { [dateKey: string]: { label: string; [key: string]: any } } = {};
    const batchesSet = new Set<string>();

    harvests.forEach((h) => {
      if (!h.date) return;
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return;

      const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { label };
      }

      const batches = (h.batchNumber || "").split(",").map((s) => s.trim()).filter(Boolean);
      batches.forEach((batch) => {
        batchesSet.add(batch);
        dateMap[dateKey][batch] = (dateMap[dateKey][batch] || 0) + h.kilograms;
      });
    });

    const sortedDates = Object.keys(dateMap).sort();
    const batchesPresent = Array.from(batchesSet).sort();

    const chartData = sortedDates.map((dateKey) => {
      // Leave unharvested batches as undefined so lines connect smoothly without dropping to 0
      return { ...dateMap[dateKey] };
    });

    return { chartData, batchesPresent };
  }, [harvests]);

  if (!isClient) {
    return (
      <Card>
        <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Kilogramos cosechados a lo largo del tiempo para cada lote.</CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-4 pt-0 sm:pt-0">
          <Skeleton className="h-[220px] sm:h-[260px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Kilogramos cosechados a lo largo del tiempo para cada lote.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[220px] sm:h-[260px] w-full items-center justify-center p-3.5 sm:p-4 pt-0 sm:pt-0">
          <p className="text-muted-foreground text-xs">No hay datos de cosecha suficientes para mostrar el gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Comparativa de kilogramos recolectados por lote a lo largo de la temporada.</CardDescription>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-4 pt-0 sm:pt-0">
        <div className="h-[220px] sm:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                unit=" kg"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value ? value.toLocaleString("es-ES") : 0} kg`,
                  name.startsWith("Lote") ? name : `Lote ${name}`,
                ]}
                labelStyle={{ fontWeight: "bold" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", fontSize: "12px" }}
                filterNull={true}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value: string) => (value.startsWith("Lote") ? value : `Lote ${value}`)}
              />
              {batchesPresent.map((batchId, index) => (
                <Line
                  key={batchId}
                  type="monotone"
                  dataKey={batchId}
                  name={batchId}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2.5}
                  connectNulls={true}
                  dot={{ r: 4, strokeWidth: 1, fill: colors[index % colors.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
