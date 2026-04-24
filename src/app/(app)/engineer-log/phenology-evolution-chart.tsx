
'use client';

import React, { useContext, useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATE_VALUES: { [key: string]: number } = {
  'Plantación': 1,
  'Desarrollo foliar': 2,
  'Floración': 3,
  'Caida de petalos': 4,
  'Fase de fruto verde': 5,
  'Fructificación': 6,
  'Cambio de color (Vire)': 7,
  'Maduracion comercial': 8,
  'Maduración': 8,
};

const VALUE_TO_STATE: { [key: number]: string } = {
    1: 'Plantación',
    2: 'D. Foliar',
    3: 'Floración',
    4: 'Caída P.',
    5: 'F. Verde',
    6: 'Fructif.',
    7: 'Vire',
    8: 'Comercial',
};

export function PhenologyEvolutionChart() {
  const { loading, phenologyLogs, batches } = useContext(AppDataContext);

  const chartData = useMemo(() => {
    if (loading || !phenologyLogs || phenologyLogs.length === 0) return [];

    // Group logs by date and batch
    const dataByDate: { [date: string]: { [batchId: string]: number } } = {};
    const batchIds = new Set<string>();

    phenologyLogs.forEach(log => {
      const logBatchIds = log.batchIds && log.batchIds.length > 0 ? log.batchIds : (log.batchId ? [log.batchId] : []);
      if (logBatchIds.length === 0) return;
      
      logBatchIds.forEach(bId => {
        batchIds.add(bId);
        
        const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
        if (!dataByDate[dateKey]) dataByDate[dateKey] = {};
        
        const val = STATE_VALUES[log.developmentState] || 0;
        // If multiple logs for same batch/day, take the most advanced one
        if (!dataByDate[dateKey][bId] || val > dataByDate[dateKey][bId]) {
          dataByDate[dateKey][bId] = val;
        }
      });
    });

    const sortedDates = Object.keys(dataByDate).sort();
    
    // Fill gaps: if a batch has no data for a date, use its previous known state
    const lastKnownState: { [batchId: string]: number } = {};
    
    return sortedDates.map(date => {
        const entry: any = { date: format(new Date(date), 'dd/MM') };
        batchIds.forEach(id => {
            if (dataByDate[date][id]) {
                lastKnownState[id] = dataByDate[date][id];
            }
            entry[id] = lastKnownState[id] || null;
        });
        return entry;
    });
  }, [loading, phenologyLogs]);

  const batchesPresent = useMemo(() => {
      const set = new Set<string>();
      phenologyLogs?.forEach(l => {
          const ids = l.batchIds && l.batchIds.length > 0 ? l.batchIds : (l.batchId ? [l.batchId] : []);
          ids.forEach(id => set.add(id));
      });
      return Array.from(set);
  }, [phenologyLogs]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución Fenológica</CardTitle>
          <CardDescription>Seguimiento de etapas de crecimiento por lote.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay registros de fenología para graficar.</p>
        </CardContent>
      </Card>
    );
  }

  const colors = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#a855f7", "#06b6d4"];

  return (
    <Card className="lg:col-span-2 shadow-sm border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Curva de Evolución Fenológica
        </CardTitle>
        <CardDescription>Progresión de estados de desarrollo por lote en el tiempo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                />
                <YAxis 
                    domain={[1, 8]} 
                    ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                    tickFormatter={(val) => VALUE_TO_STATE[val] || ''}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip 
                    formatter={(value: number) => [VALUE_TO_STATE[value] || 'Desconocido', 'Estado']}
                    labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {batchesPresent.map((batchId, index) => (
                    <Line
                        key={batchId}
                        type="monotone"
                        dataKey={batchId}
                        name={`Lote ${batchId}`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 1, fill: colors[index % colors.length] }}
                        activeDot={{ r: 6 }}
                        connectNulls
                    />
                ))}
            </LineChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Minimal icons for internal use
function Activity(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    )
  }
