
'use client';

import React, { useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Edit } from 'lucide-react';
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
          : [{ name: '', plantCount: undefined, area: undefined }],
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
            <CardTitle>Historial de Lotes</CardTitle>
            <CardDescription>Registro de todos los lotes pre-cargados para la cosecha.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>ID Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Variedades</TableHead>
                    <TableHead>Fecha Precarga</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedBatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4} className="text-center">No hay lotes registrados.</TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedBatches.map((batch) => {
                      const status = getBatchStatus(batch.id);
                      return (
                        <TableRow 
                            key={batch.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setViewingBatch(batch)}
                        >
                            <TableCell className="font-medium">{batch.id}</TableCell>
                            <TableCell>
                              <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                                {status === 'completed' ? 'Cosechado' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {batch.varieties && batch.varieties.length > 0 ? (
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                  {batch.varieties.map(v => v.name).join(', ')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">Sin variedades</span>
                              )}
                            </TableCell>
                            <TableCell>{new Date(batch.preloadedDate).toLocaleDateString('es-ES')}</TableCell>
                            {canManage && (
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                    <Dialog open={editingBatch?.id === batch.id} onOpenChange={(open) => !open && setEditingBatch(null)}>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingBatch(batch)}>
                                          <Edit className="h-4 w-4" />
                                          <span className="sr-only">Editar Lote</span>
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                          <DialogTitle>Editar Lote {batch.id}</DialogTitle>
                                          <DialogDescription>Actualice las variedades y cantidades de plantas para este lote.</DialogDescription>
                                        </DialogHeader>
                                        <Form {...editForm}>
                                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-1">
                                                    <FormItem>
                                                        <FormLabel>ID del Lote</FormLabel>
                                                        <Input value={batch.id} disabled />
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
                                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border p-3 rounded-md">
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
                                                  <div className="md:col-span-1 flex justify-end">
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => remove(index)}
                                                      disabled={fields.length === 1}
                                                      className="text-destructive hover:text-destructive"
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                            <DialogFooter>
                                              <Button type="submit">Guardar Cambios</Button>
                                            </DialogFooter>
                                          </form>
                                        </Form>
                                      </DialogContent>
                                    </Dialog>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar Lote</span>
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el lote {batch.id}.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(batch.id)}>Continuar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                              </TableCell>
                            )}
                        </TableRow>
                      )
                  })}
                </TableBody>
            </Table>
        </CardContent>

        <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
            <DialogContent className="max-w-md sm:max-w-lg">
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
                                            <div className="flex gap-4 text-sm text-muted-foreground">
                                                {v.plantCount && <span><strong className="text-foreground">{v.plantCount.toLocaleString()}</strong> plantas</span>}
                                                {v.area && <span><strong className="text-foreground">{v.area}</strong> ha</span>}
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
            </DialogContent>
        </Dialog>
    </Card>
  )
}
