

'use client';

import React, { useContext, useTransition, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Info, Trash2, FlaskConical, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { DiagnosisLog } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DiagnosisHistory() {
    const { diagnosisLogs, loading, deleteDiagnosisLog, currentUser } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedLog, setSelectedLog] = useState<DiagnosisLog | null>(null);

    const canDelete = currentUser?.role === 'Productor' || currentUser?.role === 'Ingeniero Agronomo';

    const getProbabilityBadgeVariant = (prob: number) => {
        if (prob > 70) return 'destructive';
        if (prob > 40) return 'secondary';
        return 'default';
    };

    const handleDelete = (logId: string) => {
        startTransition(() => {
            deleteDiagnosisLog(logId);
            toast({
                title: "Diagnóstico Eliminado",
                description: "El registro del diagnóstico ha sido eliminado.",
            });
            setSelectedLog(null);
        });
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Diagnósticos</CardTitle>
                    <CardDescription>Registro de los últimos análisis de sanidad generados por la IA.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[550px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Diagnóstico Principal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skel-${i}`}>
                                        <TableCell colSpan={3}>
                                            <Skeleton className="h-10 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && diagnosisLogs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No hay diagnósticos guardados.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && diagnosisLogs.map(log => {
                                    const mainDiagnosis = log.result.posiblesDiagnosticos.find(d => d.nombre === log.result.diagnosticoPrincipal);
                                    return (
                                        <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(log.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.batchId}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                 <Badge variant={getProbabilityBadgeVariant(mainDiagnosis?.probabilidad || 0)}>
                                                    {log.result.diagnosticoPrincipal}
                                                 </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
                <DialogContent>
                    {selectedLog && (
                       <AlertDialog>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Detalle del Diagnóstico de IA
                                </DialogTitle>
                                <DialogDescription>
                                    Análisis generado el {new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} para el lote {selectedLog.batchId}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                               <Card className="w-full bg-primary/5 border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex justify-between items-center">
                                            <span>Resultado del Diagnóstico</span>
                                            <Badge variant="secondary">{selectedLog.result.diagnosticoPrincipal}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {selectedLog.result.posiblesDiagnosticos.map((diag) => (
                                            <div key={diag.nombre}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-medium">{diag.nombre}</p>
                                                    <p className="text-sm font-bold">{diag.probabilidad}%</p>
                                                </div>
                                                <Progress value={diag.probabilidad} indicatorClassName={diag.probabilidad > 70 ? 'bg-destructive' : diag.probabilidad > 40 ? 'bg-yellow-500' : 'bg-primary'} />
                                                <p className="text-xs text-muted-foreground mt-1">{diag.descripcion}</p>
                                            </div>
                                        ))}
                                        <Alert>
                                            <FlaskConical className="h-4 w-4" />
                                            <AlertTitle>Recomendación General</AlertTitle>
                                            <AlertDescription>{selectedLog.result.recomendacionGeneral}</AlertDescription>
                                        </Alert>
                                        {selectedLog.userCorrection && (
                                             <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Corrección del Usuario</AlertTitle>
                                                <AlertDescription>{selectedLog.userCorrection}</AlertDescription>
                                            </Alert>
                                        )}
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
                                    <AlertDialogTitle>¿Está seguro de eliminar este diagnóstico?</AlertDialogTitle>
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
