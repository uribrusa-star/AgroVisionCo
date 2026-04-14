
'use client';

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

type HarvestAlert = {
    batchId: string;
     currentState: string;
    estimatedDate: Date;
    daysRemaining: number;
    urgency: 'high' | 'medium' | 'low';
};

export function SmartHarvestAlerts() {
    const { phenologyLogs, loading } = useContext(AppDataContext);

    const alerts = useMemo(() => {
        if (loading || !phenologyLogs) return [];

        const latestLogsByBatch: { [key: string]: any } = {};
        phenologyLogs.forEach(log => {
            if (!log.batchId) return;
            if (!latestLogsByBatch[log.batchId] || isAfter(new Date(log.date), new Date(latestLogsByBatch[log.batchId].date))) {
                latestLogsByBatch[log.batchId] = log;
            }
        });

        const newAlerts: HarvestAlert[] = [];
        const today = startOfDay(new Date());

        Object.values(latestLogsByBatch).forEach(log => {
            let offsetDays = 0;
            switch (log.developmentState) {
                case 'Floración':
                    offsetDays = 35;
                    break;
                case 'Fase de fruto verde':
                    offsetDays = 18;
                    break;
                case 'Cambio de color (Vire)':
                    offsetDays = 7;
                    break;
                case 'Maduracion comercial':
                case 'Maduracion':
                    offsetDays = 2;
                    break;
                default:
                    return; // Skip other states like 'Plantación'
            }

            const estimatedDate = addDays(new Date(log.date), offsetDays);
            const daysRemaining = Math.ceil((estimatedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysRemaining > 0 && daysRemaining <= 45) {
                newAlerts.push({
                    batchId: log.batchId,
                    currentState: log.developmentState,
                    estimatedDate,
                    daysRemaining,
                    urgency: daysRemaining <= 7 ? 'high' : daysRemaining <= 15 ? 'medium' : 'low'
                });
            }
        });

        return newAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [phenologyLogs, loading]);

    if (loading) return null;

    if (alerts.length === 0) {
        return (
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-5 w-5" /> Alertas Inteligentes
                    </CardTitle>
                    <CardDescription>No hay alertas de cosecha próximas basadas en la fenología actual.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-primary/20 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" /> Alertas Inteligentes de Cosecha
                </CardTitle>
                <CardDescription>Predicciones basadas en los últimos registros de fenología.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {alerts.map((alert) => (
                    <div key={alert.batchId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border group hover:border-primary/30 transition-colors">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{alert.batchId}</span>
                                <Badge variant={alert.urgency === 'high' ? 'destructive' : alert.urgency === 'medium' ? 'default' : 'secondary'}>
                                    {alert.daysRemaining} {alert.daysRemaining === 1 ? 'día' : 'días'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                Estado actual: <span className="text-foreground font-medium">{alert.currentState}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                {format(alert.estimatedDate, "dd 'de' MMM", { locale: es })}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Fecha Est. Cosecha</p>
                        </div>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4">
                <p className="text-[10px] text-muted-foreground italic">
                    * Estimaciones basadas en parámetros estándar de crecimiento para la frutilla. Considere variaciones climáticas.
                </p>
            </CardFooter>
        </Card>
    );
}
