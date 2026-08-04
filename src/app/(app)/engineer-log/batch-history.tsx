
'use client';

import React, { useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Edit, Map } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import type { Batch } from '@/lib/types';

const EditBatchSchema = z.object({
  id: z.string(),
  preloadedDate: z.string().min(1, "La fecha de precarga es obligatoria"),
  varieties: z.array(z.object({
    name: z.string().min(1, "El nombre de la variedad es obligatorio"),
    plantCount: z.number().optional().or(z.literal(0)).transform(val => val === 0 ? undefined : val),
    area: z.number().optional().or(z.literal(0)).transform(val => val === 0 ? undefined : val),
    plantingDate: z.string().optional(),
  })).min(1, "Debe añadir al menos una variedad"),
});

type EditBatchValues = z.infer<typeof EditBatchSchema>;

export function BatchHistory() {
  const { loading, batches, deleteBatch, editBatch, currentUser, harvests } = useContext(AppDataContext);
  const { toast } = useToast();
  const [editingBatch, setEditingBatch] = React.useState<Batch | null>(null);
  const [viewingBatch, setViewingBatch] = React.useState<Batch | null>(null);
  
  const editForm = useForm<EditBatchValues>({
    resolver: zodResolver(EditBatchSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: editForm.control,
    name: "varieties",
  });

  React.useEffect(() => {
    if (editingBatch) {
      editForm.reset({
        id: editingBatch.id,
        preloadedDate: editingBatch.preloadedDate.slice(0, 10),
        varieties: editingBatch.varieties && editingBatch.varieties.length > 0 
          ? editingBatch.varieties 
          : [{ name: '', plantCount: undefined, area: undefined, plantingDate: '' }],
      });
    }
  }, [editingBatch, editForm]);

  const onEditSubmit = async (data: EditBatchValues) => {
    if (!editingBatch) return;
    
    await editBatch({
      ...editingBatch,
      preloadedDate: data.preloadedDate,
      varieties: data.varieties,
    });

    toast({
      title: "Lote Actualizado",
      description: `Los datos del lote ${data.id} han sido guardados.`,
    });
    setEditingBatch(null);
  };

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const handleDelete = (batchId: string) => {
    deleteBatch(batchId);
    toast({
      title: "Lote Eliminado",
      description: `El lote ${batchId} ha sido eliminado exitosamente.`,
    });
  };
  
  const getBatchStatus = (batchId: string) => {
      return harvests.some(h => h.batchNumber === batchId || h.batchNumber.split(',').map(s => s.trim()).includes(batchId)) ? 'completed' : 'pending';
  }

  const sortedBatches = [...batches].sort((a, b) => new Date(b.preloadedDate).getTime() - new Date(a.preloadedDate).getTime());

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Historial de Lotes
            </CardTitle>
            <CardDescription>Registro de todos los lotes pre-cargados para la cosecha.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-auto pr-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                ) : sortedBatches.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">No hay lotes registrados.</div>
                ) : (
                    sortedBatches.map(batch => {
                        const status = getBatchStatus(batch.id);
                        return (
                            <div 
                                key={batch.id} 
                                className="shrink-0 group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden"
                                onClick={() => setViewingBatch(batch)}
                            >
                                <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                                    <div className="shrink-0 flex items-center justify-center">
                                        <Badge variant="secondary" className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                                            <Map className="h-5 w-5" />
                                        </Badge>
                                    </div>
                                    <div className="min-w-0 flex flex-col justify-center flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold text-sm truncate leading-none">Lote {batch.id}</span>
                                            <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0 h-4 leading-tight">
                                                {status === 'completed' ? 'Cosechado' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                                            Precarga: <span className="font-medium text-foreground">{new Date(batch.preloadedDate).toLocaleDateString('es-ES')}</span>
                                            <span className="mx-1.5 opacity-50">•</span>
                                            {batch.varieties && batch.varieties.length > 0 ? batch.varieties.map(v => v.name).join(', ') : 'Sin variedades'}
                                            {batch.varieties && batch.varieties.some(v => v.plantingDate) && (
                                                <>
                                                  <span className="mx-1.5 opacity-50">•</span>
                                                  Plantación: <span className="font-medium text-foreground">{new Date(batch.varieties.find(v => v.plantingDate)!.plantingDate!).toLocaleDateString('es-ES')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </CardContent>

        <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-primary">Detalles del Lote {viewingBatch?.id}</DialogTitle>
                    <DialogDescription>
                        Información completa de las variedades plantadas y el estado actual.
                    </DialogDescription>
                </DialogHeader>
                {viewingBatch && (
                    <div className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/30 rounded-xl border">
                                <p className="text-sm text-muted-foreground mb-1">Estado</p>
                                <Badge variant={getBatchStatus(viewingBatch.id) === 'completed' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                                    {getBatchStatus(viewingBatch.id) === 'completed' ? 'Cosechado' : 'Pendiente'}
                                </Badge>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-xl border">
                                <p className="text-sm text-muted-foreground mb-1">Fecha de Precarga</p>
                                <p className="font-medium text-lg">{new Date(viewingBatch.preloadedDate).toLocaleDateString('es-ES')}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                Variedades Plantadas
                            </h4>
                            {viewingBatch.varieties && viewingBatch.varieties.length > 0 ? (
                                <div className="space-y-3">
                                    {viewingBatch.varieties.map((v, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow bg-card">
                                            <div className="font-medium text-primary mb-2 sm:mb-0">{v.name}</div>
                                            <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                                                {v.plantCount && <span><strong className="text-foreground">{v.plantCount.toLocaleString()}</strong> plantas</span>}
                                                {v.area && <span><strong className="text-foreground">{v.area}</strong> ha</span>}
                                                {v.plantingDate && <span><strong className="text-foreground">{new Date(v.plantingDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</strong> (Plantación)</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-6 border rounded-lg border-dashed text-muted-foreground">
                                    No hay variedades registradas en este lote.
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {canManage && (
                    <DialogFooter className="flex flex-col gap-3 w-full sm:flex-row pt-4">
                        <Button variant="outline" className="w-full sm:w-auto flex-1 shadow-sm h-10" onClick={() => {
                            setEditingBatch(viewingBatch);
                            setViewingBatch(null);
                        }}>
                            <Edit className="h-4 w-4 mr-2" /> Editar Lote
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full sm:w-auto flex-1 shadow-sm h-10">
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-lg">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el lote {viewingBatch?.id}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => {
                                        if(viewingBatch) handleDelete(viewingBatch.id);
                                        setViewingBatch(null);
                                    }}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={!!editingBatch} onOpenChange={(open) => !open && setEditingBatch(null)}>
            <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Lote {editingBatch?.id}</DialogTitle>
                    <DialogDescription>Actualice las variedades y cantidades de plantas para este lote.</DialogDescription>
                </DialogHeader>
                {editingBatch && (
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-1">
                                    <FormItem>
                                        <FormLabel>ID del Lote</FormLabel>
                                        <Input value={editingBatch.id} disabled />
                                    </FormItem>
                                </div>
                                <div className="md:col-span-1">
                                    <FormField
                                        control={editForm.control}
                                        name="preloadedDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fecha de Precarga</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-base">Variedades Plantadas</FormLabel>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => append({ name: '', plantCount: undefined, area: undefined })}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Añadir Variedad
                                    </Button>
                                </div>
                                
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border p-3 rounded-md bg-muted/20">
                                        <div className="md:col-span-5">
                                            <FormField
                                                control={editForm.control}
                                                name={`varieties.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Variedad</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormField
                                                control={editForm.control}
                                                name={`varieties.${index}.plantCount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Cant. Plantas</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                {...field} 
                                                                value={field.value ?? ''}
                                                                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                                                className="h-8"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormField
                                                control={editForm.control}
                                                name={`varieties.${index}.area`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Superficie (ha)</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                {...field} 
                                                                value={field.value ?? ''}
                                                                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                                                className="h-8"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormField
                                                control={editForm.control}
                                                name={`varieties.${index}.plantingDate`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">F. Plantación</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="date" 
                                                                {...field} 
                                                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                                onChange={e => field.onChange(e.target.value || undefined)}
                                                                className="h-8"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                disabled={fields.length === 1}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter className="pt-4 flex sm:flex-row gap-2">
                                <Button type="button" variant="secondary" onClick={() => setEditingBatch(null)} className="w-full sm:w-auto">Cancelar</Button>
                                <Button type="submit" className="w-full sm:w-auto">Guardar Cambios</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    </Card>
  )
}
