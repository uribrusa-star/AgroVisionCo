
'use client';

import React, { useContext, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription as FormDescriptionComponent, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Batch } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const BatchLogSchema = z.object({
  id: z.string().regex(/^L\d{3}$/, "El ID del lote debe tener el formato L000 (ej., L014)."),
  varieties: z.array(z.object({
    name: z.string().min(1, "El nombre de la variedad es obligatorio"),
    plantCount: z.number().optional().or(z.literal(0)).transform(val => val === 0 ? undefined : val),
    area: z.number().optional().or(z.literal(0)).transform(val => val === 0 ? undefined : val),
    plantingDate: z.string().optional(),
  })).min(1, "Debe añadir al menos una variedad"),
});

type BatchLogFormValues = z.infer<typeof BatchLogSchema>;

export function BatchLogForm() {
  const { addBatch, editBatch, batches, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = React.useState<'select' | 'manual'>('select');
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');

  if (!currentUser) return null;
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  // Lotes pendientes de completar (vienen del mapa sin variedad definida)
  const pendingBatches = batches.filter(b => 
    !b.varieties || b.varieties.length === 0 || b.varieties.every(v => !v.name)
  );

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const prefilledArea = selectedBatch?.varieties?.[0]?.area;

  const form = useForm<BatchLogFormValues>({
    resolver: zodResolver(BatchLogSchema),
    defaultValues: {
      id: '',
      varieties: [{ name: '', plantCount: undefined, area: undefined, plantingDate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "varieties",
  });

  // When user picks a pending batch, populate the form with its data
  React.useEffect(() => {
    if (mode === 'select' && selectedBatchId) {
      form.reset({
        id: selectedBatchId,
        varieties: [{ 
          name: '', 
          plantCount: undefined, 
          area: prefilledArea,  // keep the map-calculated area
          plantingDate: '' 
        }],
      });
    }
  }, [selectedBatchId, prefilledArea, mode, form]);

  const onSubmit = (data: BatchLogFormValues) => {
    const safeVarieties = data.varieties.map(v => ({
      ...v,
      plantingDate: v.plantingDate && v.plantingDate.length === 10
        ? `${v.plantingDate}T12:00:00.000Z`
        : v.plantingDate
    }));

    startTransition(() => {
      if (mode === 'select' && selectedBatch) {
        // Update the existing batch
        editBatch({ ...selectedBatch, varieties: safeVarieties });
        toast({
          title: "¡Lote Completado!",
          description: `Los datos del lote ${data.id} han sido guardados exitosamente.`,
        });
        setSelectedBatchId('');
        form.reset({ id: '', varieties: [{ name: '', plantCount: undefined, area: undefined, plantingDate: '' }] });
      } else {
        // Create brand-new batch manually
        if (batches.some(b => b.id === data.id)) {
          form.setError("id", { type: "manual", message: "Este ID de lote ya existe." });
          return;
        }
        addBatch({ id: data.id, varieties: safeVarieties });
        toast({
          title: "¡Lote Pre-cargado!",
          description: `El lote ${data.id} con ${data.varieties.length} variedad(es) está listo.`,
        });
        form.reset({ id: '', varieties: [{ name: '', plantCount: undefined, area: undefined, plantingDate: '' }] });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestionar Lotes</CardTitle>
            <CardDescription>
              {mode === 'select' 
                ? 'Seleccioná un lote del mapa para completar sus datos de plantación.' 
                : 'Ingresá un nuevo lote manualmente con su ID y datos.'}
            </CardDescription>
          </div>
          <Button 
            type="button" 
            variant={mode === 'manual' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => {
              const next = mode === 'select' ? 'manual' : 'select';
              setMode(next);
              setSelectedBatchId('');
              form.reset({ id: '', varieties: [{ name: '', plantCount: undefined, area: undefined, plantingDate: '' }] });
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {mode === 'select' ? 'Crear Manualmente' : 'Usar lote del Mapa'}
          </Button>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <div className="space-y-6">

              {/* Mode: select pending batch from map */}
              {mode === 'select' && (
                <div className="space-y-2">
                  <FormLabel>Lote del Mapa (Pendiente)</FormLabel>
                  {pendingBatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 bg-muted/40 rounded-md">
                      No hay lotes pendientes. Delimitá uno en el mapa del establecimiento, o usá "Crear Manualmente".
                    </p>
                  ) : (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={selectedBatchId}
                      onChange={e => setSelectedBatchId(e.target.value)}
                      disabled={!canManage || isPending}
                    >
                      <option value="">-- Seleccionar lote --</option>
                      {pendingBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.id}{b.varieties?.[0]?.area ? ` — ${b.varieties[0].area} ha` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Mode: manual ID entry */}
              {mode === 'manual' && (
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuevo ID de Lote</FormLabel>
                      <FormControl>
                        <Input placeholder="ej., L017" {...field} disabled={!canManage || isPending} />
                      </FormControl>
                      <FormDescriptionComponent>
                        El formato debe ser 'L' seguido de 3 números.
                      </FormDescriptionComponent>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Show variety fields when a batch is selected or in manual mode */}
              {(mode === 'manual' || selectedBatchId) && (
                <div className="space-y-4">
                  {prefilledArea && mode === 'select' && (
                    <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                      📐 Superficie calculada desde el mapa: <strong>{prefilledArea} ha</strong>. Podés ajustarla si es necesario.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Variedades Plantadas</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ name: '', plantCount: undefined, area: undefined, plantingDate: '' })}
                      disabled={!canManage || isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Variedad
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border p-4 rounded-md bg-muted/30">
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`varieties.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variedad</FormLabel>
                              <FormControl>
                                <Input placeholder="ej. San Andreas" {...field} disabled={!canManage || isPending} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`varieties.${index}.plantCount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plantas</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="ej. 2500" 
                                  {...field} 
                                  value={field.value ?? ''}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                  disabled={!canManage || isPending} 
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`varieties.${index}.area`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sup. (ha)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="ej. 0.2" 
                                  {...field} 
                                  value={field.value ?? ''}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                  disabled={!canManage || isPending} 
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
                          control={form.control}
                          name={`varieties.${index}.plantingDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plantación</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date"
                                  {...field}
                                  disabled={!canManage || isPending} 
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
                          disabled={!canManage || isPending || fields.length === 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar Variedad</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          {canManage && (mode === 'manual' || selectedBatchId) && (
            <CardFooter>
              <Button type="submit" disabled={isPending || !canManage}>
                {isPending ? 'Guardando...' : mode === 'select' ? 'Completar Lote' : 'Agregar Lote'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
