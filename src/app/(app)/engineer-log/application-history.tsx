

'use client';

import React, { useState, useContext, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Bug, Hand, Leaf, SprayCan, Wind, Thermometer, Trash2, PlusCircle, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { AgronomistLog, AgronomistLogType, ImageWithHint } from '@/lib/types';
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

const LogSchema = z.object({
  type: z.enum(['Fertilización', 'Fumigación', 'Control', 'Sanidad', 'Labor Cultural', 'Riego', 'Condiciones Ambientales']),
  batchId: z.string().optional(),
  product: z.string().optional(),
  notes: z.string().min(5, "Las notas deben tener al menos 5 caracteres."),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function ApplicationHistory() {
  const { loading, agronomistLogs, editAgronomistLog, deleteAgronomistLog, currentUser, batches, supplies } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AgronomistLog | null>(null);
  const [isPending, startTransition] = useTransition();

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
        type: selectedLog.type,
        batchId: selectedLog.batchId || 'general',
        product: selectedLog.product,
        notes: selectedLog.notes,
        images: selectedLog.images?.map(img => ({ url: img.url })) || [{ url: '' }],
      });
    }
  }, [selectedLog, isEditDialogOpen, form]);

  const handleEdit = (log: AgronomistLog) => {
    setSelectedLog(log);
    setIsEditDialogOpen(true);
  };

  const handleDetails = (log: AgronomistLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  }
  
  const handleDelete = (logId: string) => {
    startTransition(() => {
        deleteAgronomistLog(logId);
        toast({
          title: "Registro Eliminado",
          description: "La entrada del registro ha sido eliminada exitosamente.",
        });
        setIsDetailOpen(false); // Close detail view on successful delete
        setSelectedLog(null);
    });
  };

  const onEditSubmit = (values: LogFormValues) => {
    if (selectedLog) {
      startTransition(() => {
          const imagesWithHints: ImageWithHint[] = (values.images || [])
            .filter(img => img.url)
            .map(img => ({ url: img.url, hint: 'crop disease pest'}));

          editAgronomistLog({
            ...selectedLog,
            type: values.type as AgronomistLogType,
            batchId: values.batchId === 'general' ? undefined : values.batchId,
            product: values.product,
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

  const getTypeInfo = (type: AgronomistLog['type']) => {
    switch (type) {
      case 'Fertilización': return { variant: 'default', icon: Leaf, label: 'Fertilización' };
      case 'Fumigación': return { variant: 'destructive', icon: SprayCan, label: 'Fumigación' };
      case 'Control': return { variant: 'secondary', icon: Bug, label: 'Control' };
      case 'Sanidad': return { variant: 'destructive', icon: Bug, label: 'Sanidad'};
      case 'Labor Cultural': return { variant: 'secondary', icon: Hand, label: 'Labor Cultural'};
      case 'Riego': return { variant: 'default', icon: Wind, label: 'Riego'};
      case 'Condiciones Ambientales': return { variant: 'outline', icon: Thermometer, label: 'Clima'};
      default: return { variant: 'outline', icon: MoreHorizontal, label: type};
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>Historial de Actividades</CardTitle>
            <CardDescription>Registro de todas las aplicaciones, labores, controles y observaciones realizadas en el campo.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Imágenes</TableHead>
                    {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5: 4}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && agronomistLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5: 4} className="text-center">No hay registros de actividades.</TableCell>
                  </TableRow>
                )}
                {!loading && [...agronomistLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
                    const typeInfo = getTypeInfo(log.type);
                    return (
                    <TableRow key={log.id}>
                        <TableCell onClick={() => handleDetails(log)} className="cursor-pointer">
                          <Badge variant={typeInfo.variant as any} className="gap-1">
                            <typeInfo.icon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={() => handleDetails(log)} className="cursor-pointer">
                          {log.batchId ? <Badge variant="outline">{log.batchId}</Badge> : <span className="text-xs text-muted-foreground">General</span>}
                        </TableCell>
                        <TableCell onClick={() => handleDetails(log)} className="cursor-pointer">
                          <p className="font-medium">{log.product || '-'}</p>
                          <p className="text-sm text-muted-foreground max-w-xs truncate">{log.notes}</p>
                        </TableCell>
                        <TableCell onClick={() => handleDetails(log)} className="cursor-pointer">
                          {log.images && log.images.length > 0 ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                <span>{log.images.length}</span>
                            </div>
                          ) : null}
                        </TableCell>
                        {canManage && (
                            <TableCell>
                            <AlertDialog>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPending}>
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
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de la aplicación.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(log.id)}>Continuar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            </TableCell>
                        )}
                    </TableRow>
                )})}
                </TableBody>
            </Table>
        </CardContent>
    </Card>

    {/* Edit Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Editar Registro de Actividad</DialogTitle>
            <DialogDescription>
                Actualice los detalles del registro. Haga clic en guardar cuando haya terminado.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de Actividad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Condiciones Ambientales">Condiciones Ambientales</SelectItem>
                                <SelectItem value="Riego">Riego</SelectItem>
                                <SelectItem value="Fertilización">Fertilización</SelectItem>
                                <SelectItem value="Sanidad">Sanidad</SelectItem>
                                <SelectItem value="Labor Cultural">Labor Cultural</SelectItem>
                                <SelectItem value="Control">Control</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lote (Opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Aplicación General" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">Aplicación General</SelectItem>
                                {batches.map(b => (
                                  <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Producto/Labor/Detalle (Opcional)</FormLabel>
                        <FormControl>
                        <Input placeholder="ej., Nitrato de Calcio" {...field} disabled={!canManage || isPending} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Describa la aplicación, dosis, observaciones, etc."
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
              const typeInfo = getTypeInfo(selectedLog.type);
              const supply = supplies.find(s => s.name === selectedLog.product);
              const imagesToShow = selectedLog.images || [];
              if (supply?.photoUrl && !imagesToShow.some(img => img.url === supply.photoUrl)) {
                  imagesToShow.unshift({ url: supply.photoUrl, hint: 'supply product' });
              }

              return (
                 <AlertDialog>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           {typeInfo.icon && <typeInfo.icon className="h-5 w-5" />}
                           Detalle del Registro de Actividad
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
                                    <p className="text-sm font-medium text-muted-foreground">Tipo de Actividad</p>
                                    <Badge variant={typeInfo.variant as any}>{typeInfo.label}</Badge>
                                </div>
                                
                                {selectedLog.batchId && (
                                  <div className="space-y-1">
                                      <p className="text-sm font-medium text-muted-foreground">Lote</p>
                                      <Badge variant="outline">{selectedLog.batchId}</Badge>
                                  </div>
                                )}

                                {selectedLog.product && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Producto / Detalle</p>
                                        <p className="font-semibold">{selectedLog.product}</p>
                                    </div>
                                )}

                                {selectedLog.quantityUsed && selectedLog.quantityUsed > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Cantidad Aplicada</p>
                                        <p className="font-semibold">{selectedLog.quantityUsed} kg/L</p>
                                    </div>
                                )}
                                
                                 {selectedLog.diagnosis && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                                        <p className="font-semibold">{selectedLog.diagnosis} {selectedLog.probability && `(${selectedLog.probability}% de certeza)`}</p>
                                    </div>
                                )}
                                
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Notas</p>
                                    <p className="text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>
                                </div>
                                
                                {imagesToShow.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Imágenes Adjuntas</p>
                                        <Carousel className="w-full">
                                          <CarouselContent>
                                            {imagesToShow.map((image, index) => (
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
                                          {imagesToShow.length > 1 && (
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
                        <Button onClick={() => setIsDetailOpen(false)} variant="secondary">Cerrar</Button>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente este registro de actividad.
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
