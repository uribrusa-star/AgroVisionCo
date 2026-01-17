
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
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const LogSchema = z.object({
  type: z.enum(['Riego', 'Fertilización', 'Fumigación']),
  batchId: z.string().optional(),
  product: z.string().optional(),
  quantityUsed: z.coerce.number().optional(),
  notes: z.string().min(5, "Las notas son requeridas."),
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
      type: 'Riego',
      batchId: 'general',
      product: '',
      quantityUsed: 0,
      notes: '',
    },
  });
  
  const applicationType = form.watch('type');

  const availableSupplies = useMemo(() => {
    if (applicationType === 'Riego') return [];
    const supplyTypeMap = {
      'Fertilización': 'Fertilizante',
      'Fumigación': ['Fungicida', 'Insecticida', 'Acaricida'],
    };
    const targetType = supplyTypeMap[applicationType as keyof typeof supplyTypeMap];
    if (!targetType) return [];
    
    return supplies.filter(s => Array.isArray(targetType) ? targetType.includes(s.type) : s.type === targetType);
  }, [applicationType, supplies]);


  const onSubmit = (data: LogFormValues) => {
    if (data.type !== 'Riego' && (!data.product || !data.quantityUsed || data.quantityUsed <= 0)) {
        toast({
            title: "Datos Incompletos",
            description: "Para Fertilización o Fumigación, debe seleccionar un producto y especificar la cantidad utilizada.",
            variant: "destructive"
        });
        return;
    }

    startTransition(() => {
      addAgronomistLog({
        date: new Date().toISOString(),
        type: data.type,
        batchId: data.batchId === 'general' ? undefined : data.batchId,
        product: data.product,
        quantityUsed: data.quantityUsed,
        notes: data.notes,
      });
      
      toast({
        title: "¡Registro Exitoso!",
        description: `Se ha agregado un nuevo registro de ${data.type}.`,
      });
      
      form.reset({
        type: 'Riego',
        batchId: 'general',
        product: '',
        quantityUsed: 0,
        notes: '',
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
             
            {applicationType !== 'Riego' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="product"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{getProductLabel()}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un producto" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {availableSupplies.map(s => (
                                        <SelectItem key={s.id} value={s.name}>{s.name} ({s.stock} kg/L disp.)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="quantityUsed"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dosis Aplicada (kg/L)</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.1" {...field} placeholder="Ej: 5.5" disabled={!canManage || isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

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
