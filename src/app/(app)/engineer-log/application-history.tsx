

'use client';

import React, { useState, useContext, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Bug, Hand, Leaf, SprayCan, Wind, Thermometer, Trash2, PlusCircle, Image as ImageIcon, MapPin, Navigation, Edit } from 'lucide-react';
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
import { MultiSelect } from '@/components/ui/multi-select';

const LogSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  type: z.enum(['Fertilización', 'Fumigación', 'Control', 'Sanidad', 'Labor Cultural', 'Riego', 'Condiciones Ambientales']),
  batchIds: z.array(z.string()).optional(),
  product: z.string().optional(),
  quantityUsed: z.coerce.number().optional(),
  notes: z.string().min(5, "Las notas deben tener al menos 5 caracteres."),
  dissolution: z.string().optional(),
  diagnosis: z.string().optional(),
  probability: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
  supplies: z.array(z.object({
    supplyId: z.string().optional(),
    name: z.string(),
    quantity: z.coerce.number(),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function ApplicationHistory() {
  const { loading, agronomistLogs, addAgronomistLog, editAgronomistLog, deleteAgronomistLog, currentUser, batches, supplies } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AgronomistLog | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
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

  const { fields: supplyFields, append: appendSupply, remove: removeSupply } = useFieldArray({
    control: form.control,
    name: "supplies"
  });

  useEffect(() => {
    if (selectedLog && isEditDialogOpen) {
      form.reset({
        date: selectedLog.date.slice(0, 16),
        type: selectedLog.type,
        batchIds: selectedLog.batchIds || (selectedLog.batchId ? [selectedLog.batchId] : []),
        product: selectedLog.product,
        quantityUsed: selectedLog.quantityUsed,
        notes: selectedLog.notes,
        dissolution: selectedLog.dissolution || '',
        diagnosis: selectedLog.diagnosis,
        probability: selectedLog.probability,
        latitude: selectedLog.latitude,
        longitude: selectedLog.longitude,
        images: selectedLog.images?.map(img => ({ url: img.url })) || [{ url: '' }],
        supplies: selectedLog.supplies || (selectedLog.product ? [{ name: selectedLog.product, quantity: selectedLog.quantityUsed || 0, supplyId: supplies.find(s => s.name === selectedLog.product)?.id || '' }] : []),
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

          // Update the current log with the selected batches
          editAgronomistLog({
            ...selectedLog,
            date: values.date,
            type: values.type as AgronomistLogType,
            batchIds: values.batchIds && values.batchIds.length > 0 ? values.batchIds : undefined,
            product: values.product,
            quantityUsed: values.quantityUsed,
            notes: values.notes,
            dissolution: values.dissolution,
            diagnosis: values.diagnosis,
            probability: values.probability,
            latitude: values.latitude,
            longitude: values.longitude,
            images: imagesWithHints,
            supplies: values.supplies,
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

  const captureGPS = () => {
    setIsCapturingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          setIsCapturingGps(false);
          toast({
            title: "GPS Capturado",
            description: "Coordenadas actualizadas con éxito.",
          });
        },
        (error) => {
          console.error("Error capturing GPS:", error);
          setIsCapturingGps(false);
          toast({
            title: "Error GPS",
            description: "No se pudo obtener la ubicación. Por favor ingrésela manualmente.",
            variant: "destructive",
          });
        }
      );
    } else {
      setIsCapturingGps(false);
      toast({
        title: "Error",
        description: "Su navegador no soporta geolocalización.",
        variant: "destructive",
      });
    }
  }

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

  const sortedLogs = [...agronomistLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedLogs = sortedLogs.slice(0, displayLimit);

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
                {!loading && displayedLogs.map((log) => {
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
                          {log.batchIds && log.batchIds.length > 0 
                            ? <div className="flex flex-wrap gap-1">{log.batchIds.map(id => <Badge key={id} variant="outline">{id}</Badge>)}</div>
                            : <span className="text-xs text-muted-foreground">General</span>}
                        </TableCell>
                        <TableCell onClick={() => handleDetails(log)} className="cursor-pointer">
                          <p className="font-medium">
                            {log.supplies && log.supplies.length > 0 
                              ? log.supplies.map(s => s.name).join(', ') 
                              : (log.product || '-')}
                          </p>
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
            <DialogTitle>Editar Registro de Actividad</DialogTitle>
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
                                <SelectItem value="Fumigación">Fumigación</SelectItem>
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
                      name="batchIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lotes (Opcional - Dejar vacío para Aplicación General)</FormLabel>
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

                {(form.watch('type') === 'Fertilización' || form.watch('type') === 'Fumigación') && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <FormLabel>Insumos Utilizados</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => appendSupply({ name: '', quantity: 0, supplyId: '' })}
                                disabled={isPending || !canManage}
                            >
                                <PlusCircle className="h-4 w-4 mr-2" /> Agregar
                            </Button>
                        </div>
                        {supplyFields.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md">
                                <div className="col-span-7">
                                    <FormField
                                        control={form.control}
                                        name={`supplies.${index}.supplyId`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select 
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        const s = supplies.find(sup => sup.id === val);
                                                        if (s) form.setValue(`supplies.${index}.name`, s.name);
                                                    }} 
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger size="sm">
                                                            <SelectValue placeholder="Producto" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {supplies.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <FormField
                                        control={form.control}
                                        name={`supplies.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="number" step="any" {...field} placeholder="Cant." className="h-8" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeSupply(index)}
                                        className="h-8 w-8 text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {form.watch('type') === 'Sanidad' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Navigation className="h-4 w-4" /> Georreferenciación (GPS)
                            </h4>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={captureGPS}
                                disabled={isCapturingGps || isPending}
                            >
                                <MapPin className="mr-2 h-4 w-4" />
                                {isCapturingGps ? "Capturando..." : "Obtener Ubicación Actual"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="latitude"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">Latitud</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} disabled={!canManage || isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="longitude"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">Longitud</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} disabled={!canManage || isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                             <FormField
                                control={form.control}
                                name="diagnosis"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diagnóstico</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ej. Arañuela" {...field} disabled={!canManage || isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="probability"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Certeza (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={!canManage || isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )}

                 <FormField
                    control={form.control}
                    name="dissolution"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Preparación / Disolución</FormLabel>
                        <FormControl>
                        <Input placeholder="ej. Mochila 20L" {...field} disabled={!canManage || isPending} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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

                                {selectedLog.supplies && selectedLog.supplies.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Insumos Aplicados</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedLog.supplies.map((s, i) => (
                                                <Badge key={i} variant="secondary" className="px-2 py-1">
                                                    {s.name}: {s.quantity} kg/L
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
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
                                
                                {selectedLog.dissolution && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Preparación / Disolución</p>
                                        <p className="font-semibold">{selectedLog.dissolution}</p>
                                    </div>
                                )}
                                
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
