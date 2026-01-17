
'use client';

import React, { useContext, useTransition, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
                    <div className="h-[550px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Predicción</TableHead>
                                    <TableHead>Confianza</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skel-${i}`}>
                                        <TableCell colSpan={4}>
                                            <Skeleton className="h-10 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && predictionLogs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            No hay predicciones guardadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && predictionLogs.map(log => (
                                    <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(log.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.batchId}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm truncate max-w-[200px]">{log.prediction}</TableCell>
                                        <TableCell>
                                            <Badge variant={getConfidenceBadgeVariant(log.confidence)}>{log.confidence}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
