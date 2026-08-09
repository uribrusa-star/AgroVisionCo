
'use client';

import React, { useContext, useTransition, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Info, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { PredictionLog } from '@/lib/types';

export function PredictionHistory() {
    const { predictionLogs, loading, deletePredictionLog, currentUser } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedLog, setSelectedLog] = useState<PredictionLog | null>(null);

    const canDelete = currentUser?.role === 'Productor' || currentUser?.role === 'Ingeniero Agronomo';

    const getConfidenceBadgeVariant = (confidence: 'Alta' | 'Media' | 'Baja') => {
        switch (confidence) {
            case 'Alta': return 'default';
            case 'Media': return 'secondary';
            case 'Baja': return 'destructive';
            default: return 'outline';
        }
    };

    const handleDelete = (logId: string) => {
        startTransition(() => {
            deletePredictionLog(logId);
            toast({
                title: "Predicción Eliminada",
                description: "El registro de la predicción ha sido eliminado.",
            });
            setSelectedLog(null);
        });
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Predicciones</CardTitle>
                    <CardDescription>Un registro de los últimos análisis de rendimiento generados. Haga clic para ver detalles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[550px] overflow-auto pr-2 space-y-3">
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-lg" />
                        ))}
                        
                        {!loading && predictionLogs.length === 0 && (
                            <div className="flex items-center justify-center h-32 border rounded-lg bg-muted/20 text-muted-foreground text-sm">
                                No hay predicciones guardadas.
                            </div>
                        )}
                        
                        {!loading && predictionLogs.map(log => (
                            <div 
                                key={log.id} 
                                onClick={() => setSelectedLog(log)} 
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-4"
                            >
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{log.batchId}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(log.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium line-clamp-2 text-foreground/90 leading-snug">
                                        {log.prediction}
                                    </p>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <Badge variant={getConfidenceBadgeVariant(log.confidence)} className="shadow-sm">
                                        {log.confidence}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
                <DialogContent className="sm:max-w-md">
                    {selectedLog && (
                       <AlertDialog>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Detalle de la Predicción
                                </DialogTitle>
                                <DialogDescription>
                                    Revisión del análisis de rendimiento generado por la IA.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                                </div>
                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Lote Analizado</p>
                                            <Badge variant="outline">{selectedLog.batchId}</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Predicción de IA</p>
                                            <p className="font-semibold whitespace-pre-wrap">{selectedLog.prediction}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Nivel de Confianza</p>
                                            <Badge variant={getConfidenceBadgeVariant(selectedLog.confidence)}>{selectedLog.confidence}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <DialogFooter className="flex-row justify-between w-full pt-2">
                                {canDelete ? (
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" disabled={isPending}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                ) : <div/>}
                                <Button onClick={() => setSelectedLog(null)} variant="secondary">Cerrar</Button>
                            </DialogFooter>

                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro de eliminar esta predicción?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. El registro se eliminará permanentemente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                       </AlertDialog>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
