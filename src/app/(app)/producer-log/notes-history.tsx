

'use client';

import React, { useContext, useMemo, useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { ProducerLog } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, NotebookText, Trash2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';

const LogSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  type: z.enum(['Nota', 'Actividad Omitida']),
  notes: z.string().min(5, "La nota debe tener al menos 5 caracteres."),
  omittedActivity: z.string().optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function NotesHistory() {
  const { loading, producerLogs, editProducerLog, deleteProducerLog, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<ProducerLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
  });

  useEffect(() => {
    if (selectedLog && isEditDialogOpen) {
      form.reset({
        date: selectedLog.date.slice(0, 16),
        type: selectedLog.type || 'Nota',
        notes: selectedLog.notes,
        omittedActivity: selectedLog.omittedActivity || '',
      });
    }
  }, [selectedLog, isEditDialogOpen, form]);

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

  const onEditSubmit = (values: LogFormValues) => {
    if (selectedLog) {
      startTransition(() => {
        editProducerLog({
          ...selectedLog,
          date: values.date,
          type: values.type as any,
          notes: values.notes,
          omittedActivity: values.type === 'Actividad Omitida' ? values.omittedActivity : undefined,
        });
        toast({
          title: "Observación Actualizada",
          description: "El registro ha sido actualizado exitosamente.",
        });
        setIsEditDialogOpen(false);
        setSelectedLog(null);
      });
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <NotebookText className="w-5 h-5 text-primary" />
                Historial de Observaciones
            </CardTitle>
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
                <div className="flex flex-col gap-2 pr-4">
                  {sortedLogs.map(log => {
                    const { icon: Icon, color, title } = getLogTypeInfo(log);
                    return (
                        <div 
                          key={log.id} 
                          className="shrink-0 group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden"
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                              <div className="shrink-0 flex items-center justify-center">
                                  <Badge variant={log.type === 'Actividad Omitida' ? 'destructive' : 'secondary'} className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                                      <Icon className="h-5 w-5" />
                                  </Badge>
                              </div>
                              <div className="min-w-0 flex flex-col justify-center flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-sm truncate leading-none">{title}</span>
                                      <span className="text-xs text-muted-foreground shrink-0 leading-none">{new Date(log.date).toLocaleDateString('es-AR')}</span>
                                      {log.images && log.images.length > 0 && (
                                          <ImageIcon className="h-3 w-3 text-blue-500 shrink-0 ml-1" />
                                      )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                                      {log.omittedActivity ? `${log.omittedActivity} - ` : ''}{log.notes}
                                  </p>
                              </div>
                          </div>
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
                           <>
                             <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={isPending}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                              </AlertDialogTrigger>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setIsEditDialogOpen(true)}
                                disabled={isPending}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                           </>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Observación</DialogTitle>
            <DialogDescription>
              Actualice los detalles de su nota o actividad omitida.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Registro</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Nota">Nota Personal</SelectItem>
                        <SelectItem value="Actividad Omitida">Actividad Omitida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('type') === 'Actividad Omitida' && (
                <FormField
                  control={form.control}
                  name="omittedActivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actividad Omitida</FormLabel>
                      <FormControl>
                        <Input placeholder="ej. Riego Programado" {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{form.watch('type') === 'Actividad Omitida' ? 'Razón / Notas' : 'Notas'}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Escriba sus observaciones aquí..." 
                        className="min-h-[100px]"
                        {...field} 
                        disabled={isPending} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
