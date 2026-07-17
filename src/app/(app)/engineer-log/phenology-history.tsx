

'use client';

import React, { useState, useContext, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Flower, Grape, Sun, Trash2, PlusCircle, Image as ImageIcon, Edit, Sprout, Leaf, Wind, Apple, Palette, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { PhenologyLog, ImageWithHint } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { MultiSelect } from '@/components/ui/multi-select';

const LogSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  developmentState: z.enum([
    'Plantación', 'Desarrollo foliar', 'Floración', 'Caida de petalos', 
    'Fase de fruto verde', 'Fructificación', 'Cambio de color (Vire)', 
    'Maduracion comercial', 'Maduración'
  ], {
    required_error: "El estado de desarrollo es requerido.",
  }),
  batchIds: z.array(z.string()).optional(),
  flowerCount: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().optional()),
  fruitCount: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().optional()),
  notes: z.string().min(5, "Las notas deben tener al menos 5 caracteres."),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function PhenologyHistory() {
  const { loading, phenologyLogs, addPhenologyLog, editPhenologyLog, deletePhenologyLog, currentUser, batches } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PhenologyLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const [displayLimit, setDisplayLimit] = useState(5);

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "images"
  });

  useEffect(() => {
    if (selectedLog && isEditDialogOpen) {
      form.reset({
        date: selectedLog.date.slice(0, 16),
        developmentState: selectedLog.developmentState,
        batchIds: selectedLog.batchIds || (selectedLog.batchId ? [selectedLog.batchId] : []),
        flowerCount: selectedLog.flowerCount,
        fruitCount: selectedLog.fruitCount,
        notes: selectedLog.notes,
        images: selectedLog.images?.map(img => ({ url: img.url })) || [{ url: '' }],
      });
    }
  }, [selectedLog, isEditDialogOpen, form]);

  const handleEdit = (log: PhenologyLog) => {
    setSelectedLog(log);
    setIsEditDialogOpen(true);
  };
  
  const handleDetails = (log: PhenologyLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleDelete = (logId: string) => {
    startTransition(() => {
        deletePhenologyLog(logId).then(() => {
          toast({
            title: "Registro Eliminado",
            description: "La entrada del registro de fenología ha sido eliminada exitosamente.",
          });
          setIsDetailOpen(false);
          setSelectedLog(null);
        });
    });
  };

  const onEditSubmit = (values: LogFormValues) => {
    if (selectedLog) {
      startTransition(() => {
          const imagesWithHints: ImageWithHint[] = (values.images || [])
            .filter(img => img.url)
            .map(img => ({ url: img.url, hint: 'crop phenology' }));

          // Update the current log with the selected batches
          editPhenologyLog({
            ...selectedLog,
            date: values.date,
            developmentState: values.developmentState,
            batchIds: values.batchIds && values.batchIds.length > 0 ? values.batchIds : undefined,
            flowerCount: values.flowerCount,
            fruitCount: values.fruitCount,
            notes: values.notes,
            images: imagesWithHints,
          });

          toast({
            title: "Registro Actualizado",
            description: "La entrada del registro ha sido actualizada exitosamente.",
          });
          setIsEditDialogOpen(false);
          setSelectedLog(null);
      });
    }
  };

  const getStateInfo = (state: PhenologyLog['developmentState']) => {
    switch (state) {
      case 'Plantación': return { variant: 'secondary', icon: Sprout, label: state };
      case 'Desarrollo foliar': return { variant: 'secondary', icon: Leaf, label: state };
      case 'Floración': return { variant: 'default', icon: Flower, label: state };
      case 'Caida de petalos': return { variant: 'outline', icon: Wind, label: state };
      case 'Fase de fruto verde': return { variant: 'secondary', icon: Apple, label: state };
      case 'Fructificación': return { variant: 'secondary', icon: Grape, label: state };
      case 'Cambio de color (Vire)': return { variant: 'default', icon: Palette, label: state };
      case 'Maduracion comercial': return { variant: 'default', icon: Store, label: state };
      case 'Maduración': return { variant: 'destructive', icon: Sun, label: state };
      default: return { variant: 'outline', icon: MoreHorizontal, label: state };
    }
  }

  const sortedLogs = [...phenologyLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedLogs = sortedLogs.slice(0, displayLimit);

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                Historial de Fenología
            </CardTitle>
            <CardDescription>Registro de todas las observaciones fenológicas del cultivo.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-2">
                {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                {!loading && phenologyLogs.length === 0 && (
                    <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">
                        No hay registros de fenología.
                    </div>
                )}
                {!loading && displayedLogs.map((log) => {
                    const stateInfo = getStateInfo(log.developmentState);
                    return (
                        <div key={log.id} className="group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden" onClick={() => handleDetails(log)}>
                            <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                                <div className="shrink-0 flex items-center justify-center">
                                    <Badge variant={stateInfo.variant as any} className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                                        <stateInfo.icon className="h-5 w-5" />
                                    </Badge>
                                </div>
                                <div className="min-w-0 flex flex-col justify-center flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-sm truncate leading-none">{stateInfo.label}</span>
                                        <span className="text-xs text-muted-foreground shrink-0 leading-none">{new Date(log.date).toLocaleDateString('es-AR')}</span>
                                        {log.images && log.images.length > 0 && (
                                            <ImageIcon className="h-3 w-3 text-blue-500 shrink-0 ml-1" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                                        Lotes: {log.batchIds && log.batchIds.length > 0 ? log.batchIds.join(', ') : 'General'} 
                                        <span className="mx-1.5 opacity-50">•</span>
                                        Flores: {log.flowerCount ?? '-'} 
                                        <span className="mx-1.5 opacity-50">•</span>
                                        Frutos: {log.fruitCount ?? '-'}
                                    </p>
                                </div>
                            </div>
                            
                            {canManage && (
                                <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                    <AlertDialog>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" disabled={isPending}>
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem onSelect={() => handleDetails(log)}>Ver Detalles</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleEdit(log)}>Editar</DropdownMenuItem>
                                            <AlertDialogTrigger asChild>
                                              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Eliminar</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de fenología.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(log.id)}>Continuar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {!loading && sortedLogs.length > 5 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
                    <span className="text-xs text-muted-foreground font-medium">
                        Mostrando {displayedLogs.length} de {sortedLogs.length} registros
                    </span>
                    <div className="flex items-center gap-2">
                        {displayLimit < sortedLogs.length && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDisplayLimit(prev => prev + 5)}
                                className="text-xs font-semibold h-8 px-3"
                            >
                                Mostrar más ({Math.min(5, sortedLogs.length - displayLimit)} restantes)
                            </Button>
                        )}
                        {displayLimit > 5 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayLimit(5)}
                                className="text-xs text-muted-foreground h-8 px-3 hover:text-foreground"
                            >
                                Mostrar menos
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
      
    {/* Edit Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Editar Registro de Fenología</DialogTitle>
            <DialogDescription>
                Actualice los detalles del registro. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fecha y Hora</FormLabel>
                        <FormControl>
                            <Input type="datetime-local" {...field} disabled={!canManage || isPending} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               <div className="grid md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="developmentState"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Estado de Desarrollo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Plantación">Plantación</SelectItem>
                                <SelectItem value="Desarrollo foliar">Desarrollo foliar</SelectItem>
                                <SelectItem value="Floración">Floración</SelectItem>
                                <SelectItem value="Caida de petalos">Caida de petalos</SelectItem>
                                <SelectItem value="Fase de fruto verde">Fase de fruto verde</SelectItem>
                                <SelectItem value="Fructificación">Fructificación</SelectItem>
                                <SelectItem value="Cambio de color (Vire)">Cambio de color (Vire)</SelectItem>
                                <SelectItem value="Maduracion comercial">Maduracion comercial</SelectItem>
                                <SelectItem value="Maduración">Maduración</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="batchIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lotes (Opcional - Dejar vacío para Observación General)</FormLabel>
                          <FormControl>
                            <MultiSelect
                              options={batches.map(b => ({ label: b.id, value: b.id }))}
                              selected={field.value || []}
                              onChange={field.onChange}
                              placeholder="Seleccionar lotes..."
                              disabled={!canManage || isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
               </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="flowerCount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nº Flores (aprox.) - Opcional</FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                placeholder="Dejar vacío si no aplica"
                                {...field} 
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                disabled={!canManage || isPending} 
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="fruitCount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nº Frutos (aprox.) - Opcional</FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                placeholder="Dejar vacío si no aplica"
                                {...field} 
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                disabled={!canManage || isPending} 
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Describa el vigor, color de hojas, síntomas, etc."
                        className="resize-none"
                        {...field}
                        disabled={!canManage || isPending}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="space-y-4">
                  <FormLabel>Imágenes</FormLabel>
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`images.${index}.url`}
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input placeholder={`https://ejemplo.com/imagen-${index + 1}.jpg`} {...field} disabled={!canManage || isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={!canManage || isPending || fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ url: '' })}
                    disabled={!canManage || isPending || fields.length >= 5}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir URL de Imagen
                  </Button>
                </div>
                <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending || !canManage}>{isPending ? 'Guardando...' : 'Guardar Cambios'}</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>

    {/* Detail View Dialog */}
     <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
           {selectedLog && (() => {
              const stateInfo = getStateInfo(selectedLog.developmentState);
              return (
                 <AlertDialog>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           {stateInfo.icon && <stateInfo.icon className="h-5 w-5" />}
                           Detalle del Registro de Fenología
                        </DialogTitle>
                        <DialogDescription>
                           Revisión de la entrada de la bitácora.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                        </div>
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Estado del Cultivo</p>
                                    <Badge variant={stateInfo.variant as any}>{stateInfo.label}</Badge>
                                </div>
                                
                                {(selectedLog.batchIds || selectedLog.batchId) && (
                                  <div className="space-y-1">
                                      <p className="text-sm font-medium text-muted-foreground">Lotes</p>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedLog.batchIds && selectedLog.batchIds.length > 0 ? (
                                            selectedLog.batchIds.map(id => <Badge key={id} variant="outline">{id}</Badge>)
                                        ) : (
                                            <Badge variant="outline">{selectedLog.batchId}</Badge>
                                        )}
                                      </div>
                                  </div>
                                )}

                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Nº Flores (aprox.)</p>
                                        <p className="font-semibold">{selectedLog.flowerCount ?? 'No registrado'}</p>
                                    </div>
                                     <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Nº Frutos (aprox.)</p>
                                        <p className="font-semibold">{selectedLog.fruitCount ?? 'No registrado'}</p>
                                    </div>
                                 </div>
                                
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Notas</p>
                                    <p className="text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>
                                </div>
                                
                                {selectedLog.images && selectedLog.images.length > 0 && (
                                    <div className="space-y-2">
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
                    <DialogFooter className="flex-row justify-between w-full pt-2">
                       {canManage ? (
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={isPending}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar</span>
                                </Button>
                            </AlertDialogTrigger>
                        ) : <div />}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => {
                                      setIsDetailOpen(false);
                                      handleEdit(selectedLog);
                                  }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                  </Button>
                                  <Button onClick={() => setIsDetailOpen(false)} variant="secondary">Cerrar</Button>
                                </div>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente este registro de fenología.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Continuar y Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </DialogFooter>
                 </AlertDialog>
              );
           })()}
        </DialogContent>
     </Dialog>
    </>
  )
}
