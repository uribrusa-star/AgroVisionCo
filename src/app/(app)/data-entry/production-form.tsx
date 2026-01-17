

'use client';

import { useContext, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { validateProductionData } from '@/ai/flows/validate-production-data';
import { ProductionPaymentHistory } from '../production-payment-history';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

const ProductionSchema = z.object({
  date: z.date({
    required_error: "La fecha de cosecha es requerida.",
  }),
  batchId: z.string().min(1, "El ID del lote es requerido."),
  kilosPerBatch: z.coerce.number().min(1, "Los kilos deben ser un número positivo."),
  collectorId: z.string().min(1, "El recolector es requerido."),
  ratePerKg: z.coerce.number().min(0.01, "La tarifa por kg es requerida."),
  hoursWorked: z.coerce.number().min(0.5, "Las horas trabajadas son requeridas."),
});

type ProductionFormValues = z.infer<typeof ProductionSchema>;

export function ProductionForm() {
  const { toast } = useToast();
  const { collectors, batches, addHarvest, harvests, currentUser } = useContext(AppDataContext);
  const [isPending, startTransition] = useTransition();
  const [validationAlert, setValidationAlert] = useState<{ open: boolean; reason: string; data: ProductionFormValues | null }>({ open: false, reason: '', data: null });
  
  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(ProductionSchema),
    defaultValues: {
      date: new Date(),
      batchId: '',
      kilosPerBatch: 0,
      collectorId: '',
      ratePerKg: 0.45,
      hoursWorked: 8,
    },
  });
  
  const availableBatches = useMemo(() => {
    return batches;
  }, [batches]);

  const saveHarvestData = (values: ProductionFormValues) => {
    const collector = collectors.find(c => c.id === values.collectorId);
    if (!collector) {
      toast({ title: 'Error', description: 'Recolector no encontrado.', variant: 'destructive'});
      return;
    }
    
    startTransition(async () => {
      await addHarvest({
          date: values.date.toISOString(),
          batchNumber: values.batchId,
          kilograms: values.kilosPerBatch,
          collector: {
            id: values.collectorId,
            name: collector.name,
          }
      }, values.hoursWorked, values.ratePerKg);
      
      toast({
          title: '¡Éxito!',
          description: `Cosecha para el lote ${values.batchId} con ${values.kilosPerBatch}kg registrada.`,
      });

      form.reset({
          ...form.getValues(),
          batchId: '',
          kilosPerBatch: 0,
          collectorId: '',
      });
    });
  }
  
  const onSubmit = (values: ProductionFormValues) => {
    startTransition(async () => {
      const collector = collectors.find(c => c.id === values.collectorId);
      if(!collector) return;

      const historicalDataForCollector = harvests.filter(h => h.collector.id === values.collectorId);
      const totalKilos = historicalDataForCollector.reduce((sum, h) => sum + h.kilograms, 0);
      const averageKilos = historicalDataForCollector.length > 0 ? totalKilos / historicalDataForCollector.length : values.kilosPerBatch;
      
      try {
          const validationResult = await validateProductionData({
              kilosPerBatch: values.kilosPerBatch,
              batchId: values.batchId,
              timestamp: values.date.toISOString(),
              farmerId: values.collectorId,
              averageKilosPerBatch: averageKilos,
              historicalData: JSON.stringify(historicalDataForCollector),
          });
          
          if (validationResult.isValid) {
              saveHarvestData(values);
          } else {
              setValidationAlert({ open: true, reason: validationResult.reason || 'Anomalía detectada.', data: values });
          }

      } catch (aiError) {
           console.error("AI validation failed, saving data directly.", aiError);
           saveHarvestData(values);
      }
    });
  }

  const handleConfirmValidation = () => {
    if (validationAlert.data) {
        saveHarvestData(validationAlert.data!);
        setValidationAlert({ open: false, reason: '', data: null });
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Carga de Producción</CardTitle>
          <CardDescription>Ingrese los detalles de la cosecha y calcule el pago del recolector.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Cosecha</FormLabel>
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
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID del Lote</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un lote" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableBatches.length > 0 ? (
                                availableBatches.map(b => (
                                  <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No hay lotes pendientes</SelectItem>
                              )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="kilosPerBatch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilos por Lote</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="ej., 125.5" {...field} disabled={!canManage || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="hoursWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas Trabajadas</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} disabled={!canManage || isPending}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                    control={form.control}
                    name="ratePerKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tarifa por kg (ARS)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} disabled={!canManage || isPending}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <FormField
                control={form.control}
                name="collectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recolector</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} name={field.name} disabled={!canManage || isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un recolector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collectors.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            {canManage && (
                <CardFooter>
                    <Button type="submit" disabled={isPending || !canManage}>
                        {isPending ? 'Validando y Guardando...' : 'Guardar Producción y Pago'}
                    </Button>
                </CardFooter>
            )}
          </form>
        </Form>
      </Card>
      <ProductionPaymentHistory />

      <AlertDialog open={validationAlert.open} onOpenChange={(open) => setValidationAlert(prev => ({...prev, open}))}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Advertencia de Validación de IA</AlertDialogTitle>
                <AlertDialogDescription>
                   {validationAlert.reason}
                   <br/><br/>
                   ¿Desea guardar este registro de todos modos?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setValidationAlert({open: false, reason: '', data: null})}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmValidation}>Guardar de todos modos</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
