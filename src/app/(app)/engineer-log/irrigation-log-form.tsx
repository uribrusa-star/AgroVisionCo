
'use client';

import React, { useTransition, useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFieldArray } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';

const LogSchema = z.object({
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  type: z.enum(['Riego', 'Fertilización', 'Fumigación']),
  batchIds: z.array(z.string()).optional(),
  product: z.string().optional(),
  quantityUsed: z.coerce.number().optional(),
  notes: z.string().min(5, "Las notas son requeridas."),
  dissolution: z.string().optional(),
  supplies: z.array(z.object({
    supplyId: z.string().min(1, "Seleccione un insumo"),
    name: z.string(),
    quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0"),
  })).optional(),
  phiDays: z.coerce.number().optional().or(z.literal('')),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function IrrigationLogForm() {
  const { addAgronomistLog, currentUser, batches, supplies } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      date: new Date(),
      type: 'Riego',
      batchIds: [],
      notes: '',
      dissolution: '',
      supplies: [],
      phiDays: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "supplies"
  });
  
  const applicationType = form.watch('type');

  const availableSupplies = useMemo(() => {
    if (applicationType === 'Riego') return [];
    const supplyTypeMap = {
      'Fertilización': 'Fertilizante',
      'Fumigación': ['Fungicida', 'Insecticida', 'Acaricida', 'Fertilizante'],
    };
    const targetType = supplyTypeMap[applicationType as keyof typeof supplyTypeMap];
    if (!targetType) return [];
    
    return supplies.filter(s => Array.isArray(targetType) ? targetType.includes(s.type) : s.type === targetType);
  }, [applicationType, supplies]);


  const onSubmit = (data: LogFormValues) => {
    if (data.type !== 'Riego' && (!data.supplies || data.supplies.length === 0)) {
        toast({
            title: "Datos Incompletos",
            description: "Para Fertilización o Fumigación, debe agregar al menos un insumo.",
            variant: "destructive"
        });
        return;
    }

    startTransition(() => {
      addAgronomistLog({
        date: data.date.toISOString(),
        type: data.type,
        batchIds: data.batchIds && data.batchIds.length > 0 ? data.batchIds : undefined,
        supplies: data.supplies,
        dissolution: data.dissolution,
        notes: data.notes,
        phiDays: data.phiDays !== '' && data.phiDays !== undefined ? Number(data.phiDays) : undefined,
      });
      
      toast({
        title: "¡Registro Exitoso!",
        description: `Se ha agregado un nuevo registro de ${data.type}.`,
      });
      
      form.reset({
        date: new Date(),
        type: 'Riego',
        batchIds: [],
        notes: '',
        dissolution: '',
        supplies: [],
        phiDays: '',
      });
    });
  };

  const getProductLabel = () => {
    switch (applicationType) {
      case 'Fertilización':
        return 'Fertilizante';
      case 'Fumigación':
        return 'Producto Fitosanitario';
      case 'Riego':
        return 'Fuente de Agua (Opcional)';
      default:
        return 'Producto/Detalle';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aplicaciones (Riego, Fertilizante, Fitosanitario)</CardTitle>
        <CardDescription>Registre las aplicaciones de agua, nutrientes o productos fitosanitarios.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Aplicación</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={!canManage || isPending}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
            <div className="grid md:grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Aplicación</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('product', '');
                      form.setValue('quantityUsed', 0);
                    }} value={field.value} disabled={!canManage || isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Riego">Riego</SelectItem>
                        <SelectItem value="Fertilización">Fertilización</SelectItem>
                        <SelectItem value="Fumigación">Fumigación</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             
            {applicationType !== 'Riego' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Insumos / Productos</FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => append({ supplyId: '', name: '', quantity: 0 })}
                      disabled={isPending || !canManage}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Agregar Insumo
                    </Button>
                  </div>
                  
                  {fields.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      No se han agregado insumos. Haga clic en "Agregar Insumo".
                    </div>
                  )}

                  <div className="space-y-3">
                    {fields.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border p-3 rounded-lg bg-muted/30">
                        <div className="md:col-span-7">
                          <FormField
                            control={form.control}
                            name={`supplies.${index}.supplyId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Producto</FormLabel>
                                <Select 
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    const s = availableSupplies.find(sup => sup.id === val);
                                    if (s) form.setValue(`supplies.${index}.name`, s.name);
                                  }} 
                                  value={field.value} 
                                  disabled={!canManage || isPending}
                                >
                                  <FormControl>
                                    <SelectTrigger size="sm">
                                      <SelectValue placeholder="Seleccione un producto" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableSupplies.map(s => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name} ({s.stock} {s.unit} disp.)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <FormField
                            control={form.control}
                            name={`supplies.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Cantidad</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="any" 
                                    {...field} 
                                    placeholder="Ej: 5.5" 
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
                            disabled={isPending || !canManage}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {applicationType !== 'Riego' && (
                <FormField
                  control={form.control}
                  name="dissolution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preparación / Disolución (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Mochila 20L, Tanque 1000L" {...field} disabled={!canManage || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="phiDays"
                render={({ field }) => (
                  <FormItem className={applicationType === 'Riego' ? 'md:col-span-2' : ''}>
                    <FormLabel className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <span>Período de Carencia (PHI en días)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Ej. 5 (bloqueo automático de cosecha en el lote)" {...field} disabled={!canManage || isPending} />
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
                  <FormLabel>Notas (CE, pH, duración, etc.)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. 2 horas de riego. CE: 1.5 dS/m, pH: 6.2. Dosis de 5kg/ha."
                      className="resize-none"
                      {...field}
                      disabled={!canManage || isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          {canManage && (
            <CardFooter>
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Aplicación'}</Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
