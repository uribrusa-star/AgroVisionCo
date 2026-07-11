
'use client';

import React, { useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { getProtocolForSanitaryLog, TreatmentProtocol } from '@/lib/treatment-protocols';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Beaker, ClipboardCheck, Clock, FlaskConical, Info, Stethoscope } from 'lucide-react';
import { format, isAfter, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function RecommendedActionsPanel() {
    const { agronomistLogs, loading } = useContext(AppDataContext);

    const recommendations = useMemo(() => {
        if (loading || !agronomistLogs) return [];

        const thirtyDaysAgo = subDays(new Date(), 30);
        
        // Filter recent sanitary logs
        const recentSanitaryLogs = agronomistLogs.filter(log => 
            log.type === 'Sanidad' && 
            isAfter(new Date(log.date), thirtyDaysAgo)
        );

        const actions: { logId: string, protocol: TreatmentProtocol, date: string, severity: string }[] = [];
        const matchedKeywords = new Set<string>();

        // Only show one recommendation per pest type per batch to avoid clutter
        recentSanitaryLogs.forEach(log => {
            const protocol = getProtocolForSanitaryLog(log.product || '', log.notes || '');
            if (protocol) {
                const key = `${protocol.pestOrDisease}-${log.batchId || 'general'}`;
                if (!matchedKeywords.has(key)) {
                    actions.push({
                        logId: log.id,
                        protocol,
                        date: log.date,
                        severity: log.notes // notes usually contains severity in onSubmit of HealthLogForm
                    });
                    matchedKeywords.add(key);
                }
            }
        });

        return actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [agronomistLogs, loading]);

    if (loading) return null;

    if (recommendations.length === 0) {
        return (
            <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        Acciones Recomendadas
                    </CardTitle>
                    <CardDescription>No se han detectado alertas sanitarias recientes que requieran protocolos específicos.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-primary font-bold">
                    <Stethoscope className="h-5 w-5" /> Protocolos de Tratamiento Sugeridos
                </CardTitle>
                <CardDescription>Acciones basadas en los hallazgos de monitoreo de los últimos 30 días.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {recommendations.map((item, index) => (
                    <div key={index} className="border rounded-xl  overflow-hidden transition-all hover:shadow-lg bg-card">
                        <div className="bg-primary/5 p-3 border-b flex justify-between items-center">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                {item.protocol.pestOrDisease}
                            </h3>
                            <Badge variant="outline" className="text-[10px]">
                                Detectado el {format(new Date(item.date), "dd/MM", { locale: es })}
                            </Badge>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <FlaskConical className="h-3 w-3" /> Insumo Sugerido:
                                    </p>
                                    <p className="text-xs font-semibold">{item.protocol.suggestedProduct} <span className="text-muted-foreground font-normal">({item.protocol.activeIngredient})</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <Beaker className="h-3 w-3" /> Dosis:
                                    </p>
                                    <p className="text-xs font-semibold">{item.protocol.dosage}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Frecuencia / Carencia:
                                    </p>
                                    <div className="text-xs font-semibold flex items-center flex-wrap gap-1">{item.protocol.frequency} <Badge variant="secondary" className="text-[9px] h-4">PC: {item.protocol.safetyPeriod}</Badge></div>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <Info className="h-3 w-3" /> Método:
                                    </p>
                                    <p className="text-xs font-semibold">{item.protocol.applicationMethod}</p>
                                </div>
                            </div>
                            <div className="mt-3 bg-muted/50 p-2 rounded text-[11px] border border-border/50">
                                <p className="font-bold mb-1 underline underline-offset-2">Recomendación del Experto:</p>
                                <p className="italic text-muted-foreground">"{item.protocol.notes}"</p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
