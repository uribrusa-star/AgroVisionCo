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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, LineChart as LineChartIcon } from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

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

  const visibleBatches = useMemo(() => {
    if (!selectedBatch) return batchesPresent;
    return batchesPresent.filter((b) => b === selectedBatch);
  }, [batchesPresent, selectedBatch]);

  if (!isClient) {
    return (
      <Card>
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Kilogramos cosechados a lo largo del tiempo para cada lote.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          <Skeleton className="h-[220px] sm:h-[260px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Kilogramos cosechados a lo largo del tiempo para cada lote.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[220px] sm:h-[260px] w-full items-center justify-center p-3 pt-0 sm:p-4 sm:pt-0">
          <p className="text-muted-foreground text-xs">No hay datos de cosecha suficientes para mostrar el gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Evolución de Cosechas por Lote</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Comparativa de kilogramos recolectados por lote a lo largo de la temporada.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-7 px-2.5 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-full font-medium shrink-0 shadow-2xs"
              title="Ver detalle interactivo con filtros y desplazamiento"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Detalle</span>
              <span className="sm:hidden">Detalle</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          <div
            className="h-[220px] sm:h-[260px] w-full cursor-pointer group/chart relative"
            onClick={() => setIsModalOpen(true)}
            title="Haz clic para ver el detalle interactivo"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
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
                  width={48}
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
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={(value: string) => (value.startsWith("Lote") ? value : `Lote ${value}`)}
                />
                {batchesPresent.map((batchId, index) => (
                  <Line
                    key={batchId}
                    type="monotone"
                    dataKey={batchId}
                    name={batchId}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    connectNulls={true}
                    dot={{ r: 3.5, strokeWidth: 1, fill: colors[index % colors.length] }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Modal / Diálogo Desplegable de Detalle Interactivo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-primary" />
                  Detalle de Evolución por Lote
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Deslice horizontalmente para recorrer las fechas y filtre por lote para un análisis individual.
                </DialogDescription>
              </div>
              {chartData.length > 8 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-full self-start sm:self-auto">
                  ⇄ Deslizar para recorrer fechas
                </span>
              )}
            </div>

            {/* Filter chips to isolate specific lots in modal */}
            {batchesPresent.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                    selectedBatch === null
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Todos los Lotes
                </button>
                {batchesPresent.map((batchId) => {
                  const index = batchesPresent.indexOf(batchId);
                  const color = colors[index % colors.length];
                  const isSelected = selectedBatch === batchId;
                  return (
                    <button
                      key={batchId}
                      type="button"
                      onClick={() => setSelectedBatch(isSelected ? null : batchId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 border ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-background border-border/70 text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                      <span>{batchId.startsWith("Lote") ? batchId : `Lote ${batchId}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </DialogHeader>

          <div className="pt-2">
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
              <div
                className="h-[300px] sm:h-[380px] w-full"
                style={{ minWidth: `${Math.max(620, chartData.length * 32)}px` }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 30, left: 0, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      minTickGap={10}
                    />
                    <YAxis
                      unit=" kg"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      width={52}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value ? value.toLocaleString("es-ES") : 0} kg`,
                        name.startsWith("Lote") ? name : `Lote ${name}`,
                      ]}
                      labelStyle={{ fontWeight: "bold" }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", fontSize: "13px" }}
                      filterNull={true}
                    />
                    {selectedBatch === null && (
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                        formatter={(value: string) => (value.startsWith("Lote") ? value : `Lote ${value}`)}
                      />
                    )}
                    {visibleBatches.map((batchId) => {
                      const index = batchesPresent.indexOf(batchId);
                      const color = colors[index % colors.length];
                      return (
                        <Line
                          key={batchId}
                          type="monotone"
                          dataKey={batchId}
                          name={batchId}
                          stroke={color}
                          strokeWidth={selectedBatch ? 3.5 : 2.5}
                          connectNulls={true}
                          dot={{ r: 3.5, strokeWidth: 1.5, fill: color }}
                          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
