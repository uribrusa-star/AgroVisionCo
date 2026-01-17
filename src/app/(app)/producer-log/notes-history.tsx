

'use client';

import React, { useContext, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { ProducerLog } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, NotebookText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function NotesHistory() {
  const { loading, producerLogs, deleteProducerLog, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<ProducerLog | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor';

  const sortedLogs = useMemo(() => 
    [...(producerLogs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [producerLogs]
  );

  const getLogTypeInfo = (log: ProducerLog) => {
    if (log.type === 'Actividad Omitida') {
        return { icon: AlertCircle, color: 'text-amber-500', title: 'Actividad Omitida' };
    }
    return { icon: NotebookText, color: 'text-muted-foreground', title: 'Nota Personal' };
  };
  
  const handleDelete = (logId: string) => {
    startTransition(() => {
        deleteProducerLog(logId);
        toast({
            title: "Observación Eliminada",
            description: "El registro ha sido eliminado exitosamente.",
        });
        setSelectedLog(null);
    });
  }


  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>Historial de Observaciones</CardTitle>
            <CardDescription>Sus últimas notas y registros de actividad omitida.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[300px]">
              {loading && <Skeleton className="h-10 w-full" />}
              {!loading && sortedLogs.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No hay notas registradas.</p>
                </div>
              )}
              {!loading && (
                <div className="space-y-4">
                  {sortedLogs.map(log => {
                    const { icon: Icon, color } = getLogTypeInfo(log);
                    return (
                        <div 
                        key={log.id} 
                        className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedLog(log)}
                        >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">
                                {new Date(log.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                            {log.type === 'Actividad Omitida' && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                    <AlertCircle className="h-3 w-3 mr-1"/>
                                    Actividad Omitida
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap truncate">{log.omittedActivity ? `Actividad Omitida: ${log.omittedActivity}. ` : ''}{log.notes}</p>
                        </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedLog && (() => {
            const { icon: Icon, title } = getLogTypeInfo(selectedLog);
            return (
                <AlertDialog>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">{Icon && <Icon className="h-5 w-5" />}{title}</DialogTitle>
                        <DialogDescription>
                            Revisión de la nota registrada en la bitácora.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                        </div>
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {selectedLog.omittedActivity && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Actividad Omitida</p>
                                        <p className="font-semibold">{selectedLog.omittedActivity}</p>
                                    </div>
                                )}
                                <p className="text-sm font-medium text-muted-foreground">{selectedLog.omittedActivity ? 'Razón / Notas' : 'Notas'}</p>
                                <p className="text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>

                                {selectedLog.images && selectedLog.images.length > 0 && (
                                        <div className="space-y-2 pt-4">
                                            <p className="text-sm font-medium text-muted-foreground">Imágenes Adjuntas</p>
                                            <Carousel className="w-full">
                                            <CarouselContent>
                                                {selectedLog.images.map((image, index) => (
                                                <CarouselItem key={index}>
                                                   <Dialog>
                                                      <DialogTrigger asChild>
                                                        <div className="relative w-full aspect-video rounded-md overflow-hidden border cursor-pointer">
                                                          <Image
                                                            src={image.url}
                                                            alt={`${selectedLog.notes} - Imagen ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                            data-ai-hint={image.hint}
                                                          />
                                                        </div>
                                                      </DialogTrigger>
                                                      <DialogContent className="max-w-4xl h-[90vh] flex items-center justify-center p-2">
                                                        <DialogHeader>
                                                          <DialogTitle className="sr-only">Imagen: {`${selectedLog.notes} - ${index + 1}`}</DialogTitle>
                                                        </DialogHeader>
                                                        <Image
                                                          src={image.url}
                                                          alt={`${selectedLog.notes} - Imagen ${index + 1}`}
                                                          width={1920}
                                                          height={1080}
                                                          className="object-contain max-h-full max-w-full"
                                                          data-ai-hint={image.hint}
                                                        />
                                                      </DialogContent>
                                                    </Dialog>
                                                </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                            {selectedLog.images.length > 1 && (
                                                <>
                                                <CarouselPrevious className="-left-8" />
                                                <CarouselNext className="-right-8" />
                                                </>
                                            )}
                                            </Carousel>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    </div>
                     <DialogFooter className="flex flex-row justify-between w-full pt-2">
                        {canManage ? (
                           <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" disabled={isPending}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </AlertDialogTrigger>
                        ) : <div />}
                        <Button onClick={() => setSelectedLog(null)} variant="secondary">Cerrar</Button>
                    </DialogFooter>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la observación de sus registros.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Continuar y Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
            })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
