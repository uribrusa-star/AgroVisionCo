
'use client';

import React, { useTransition, useContext, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const LogSchema = z.object({
  practiceType: z.string().min(1, "El tipo de labor es requerido."),
  batchId: z.string().optional(),
  notes: z.string().min(5, "Las notas son requeridas."),
  personnelId: z.string().min(1, "Debe seleccionar un personal."),
  hoursWorked: z.coerce.number().min(0.5, "Las horas trabajadas son requeridas."),
  costPerHour: z.coerce.number().min(1, "El costo por hora es requerido."),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function CulturalPracticesLogForm() {
  const { addCulturalPracticeLog, currentUser, batches, collectors, packers } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      practiceType: '',
      batchId: 'general',
      notes: '',
      personnelId: '',
      hoursWorked: 8,
      costPerHour: 0,
    },
  });

  const personnelOptions = useMemo(() => {
    const collectorOptions = collectors.map(c => ({
        id: c.id,
        name: `${c.name} (Recolector)`,
        type: 'Recolector' as const
    }));
    const packerOptions = packers.map(p => ({
        id: p.id,
        name: `${p.name} (Embalador)`,
        type: 'Embalador' as const
    }));
    return [...collectorOptions, ...packerOptions];
  }, [collectors, packers]);


  const onSubmit = (data: LogFormValues) => {
    const selectedPersonnel = personnelOptions.find(p => p.id === data.personnelId);
    if (!selectedPersonnel) {
        toast({ title: "Error", description: "Personal no encontrado.", variant: "destructive" });
        return;
    }
      
    startTransition(() => {
        const payment = data.hoursWorked * data.costPerHour;
        
      addCulturalPracticeLog({
        date: new Date().toISOString(),
        practiceType: data.practiceType,
        batchId: data.batchId === 'general' ? undefined : data.batchId,
        notes: data.notes,
        personnelId: selectedPersonnel.id,
        personnelName: selectedPersonnel.name.split(' (')[0],
        personnelType: selectedPersonnel.type,
        hoursWorked: data.hoursWorked,
        costPerHour: data.costPerHour,
        payment: payment,
      });

      toast({
        title: "¡Registro Exitoso!",
        description: `Se ha agregado una nueva labor cultural: ${data.practiceType}.`,
      });

      form.reset({
        practiceType: '',
        batchId: 'general',
        notes: '',
        personnelId: '',
        hoursWorked: 8,
        costPerHour: 0,
      });
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Labores Culturales y Pago</CardTitle>
        <CardDescription>Registre labores, asócielas a un personal y calcule el costo.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="practiceType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Labor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione una labor" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Deshoje">Deshoje / Limpieza</SelectItem>
                            <SelectItem value="Reposición de plantas">Reposición de plantas</SelectItem>
                            <SelectItem value="Mantenimiento de mulching">Mantenimiento de mulching</SelectItem>
                            <SelectItem value="Mantenimiento de túnel">Mantenimiento de túnel</SelectItem>
                            <SelectItem value="Polinización">Polinización</SelectItem>
                            <SelectItem value="Otra">Otra (especificar en notas)</SelectItem>
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
                                <SelectValue placeholder="Labor General" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="general">Labor General</SelectItem>
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
              name="personnelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un recolector o embalador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personnelOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas Trabajadas</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} disabled={!canManage || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="costPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo por Hora (ARS)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={!canManage || isPending} />
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
                  <FormLabel>Notas Detalladas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa la labor realizada, el sector, etc."
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
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Labor y Pago'}</Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}

    