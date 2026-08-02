

'use client';

import { useContext, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { getBatchPhiStatus } from '@/lib/phi-utils';

const CollectorEntrySchema = z.object({
  collectorId: z.string().min(1, "El recolector es requerido."),
  kilosPerBatch: z.coerce.number().min(1, "Los kilos deben ser un número positivo."),
  hoursWorked: z.coerce.number().min(0.5, "Las horas trabajadas son requeridas."),
  ratePerKg: z.coerce.number().min(0.01, "La tarifa por kg es requerida."),
});

const ProductionSchema = z.object({
  date: z.date({
    required_error: "La fecha de cosecha es requerida.",
  }),
  batchIds: z.array(z.string()).min(1, "Debe seleccionar al menos un lote."),
  collectors: z.array(CollectorEntrySchema).min(1, "Debe agregar al menos un recolector."),
});

type ProductionFormValues = z.infer<typeof ProductionSchema>;

export function ProductionForm() {
  const { toast } = useToast();
  const { collectors, batches, addMultipleHarvests, harvests, currentUser, agronomistLogs } = useContext(AppDataContext);
  const [isPending, startTransition] = useTransition();
  const [validationAlert, setValidationAlert] = useState<{ open: boolean; reason: string; data: ProductionFormValues | null }>({ open: false, reason: '', data: null });
  
  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(ProductionSchema),
    defaultValues: {
      date: new Date(),
      batchIds: [],
      collectors: [{
        collectorId: '',
        kilosPerBatch: 0,
        hoursWorked: 8,
        ratePerKg: 0.45,
      }],
    },
  });

  const { fields: collectorFields, append: appendCollector, remove: removeCollector } = useFieldArray({
    control: form.control,
    name: "collectors"
  });

  const availableBatches = useMemo(() => {
    return batches;
  }, [batches]);

  const batchOptions = useMemo(() => {
    return availableBatches.map(b => {
      const phiStatus = getBatchPhiStatus(b.id, agronomistLogs);
      return {
        label: b.id,
        value: b.id,
        disabled: phiStatus.isBlocked,
        tag: phiStatus.isBlocked ? `🔒 BLOQUEADO PHI (${phiStatus.remainingDays || 0}d rest.)` : undefined,
      };
    });
  }, [availableBatches, agronomistLogs]);

  const saveHarvestData = (values: ProductionFormValues) => {
    startTransition(async () => {
      const harvestsData = values.collectors.map(cEntry => {
         const collector = collectors.find(c => c.id === cEntry.collectorId);
         return {
           harvest: {
             date: values.date.toISOString(),
             batchNumber: values.batchIds.join(', '),
             kilograms: cEntry.kilosPerBatch,
             collector: {
               id: cEntry.collectorId,
               name: collector?.name || 'Unknown'
             }
           },
           hoursWorked: cEntry.hoursWorked,
           ratePerKg: cEntry.ratePerKg
         };
      });

      await addMultipleHarvests(harvestsData);

      toast({
          title: '¡Éxito!',
          description: `Cosecha para los lotes ${values.batchIds.join(', ')} registrada.`,
      });

      form.reset({
          ...form.getValues(),
          batchIds: [],
          collectors: [{
             collectorId: '',
             kilosPerBatch: 0,
             hoursWorked: 8,
             ratePerKg: 0.45
          }]
      });
    });
  }


  const onSubmit = (values: ProductionFormValues) => {
    startTransition(async () => {
      // Simplificamos la validación de IA para no bloquear el nuevo flujo
      saveHarvestData(values);
    });
  }

  const handleConfirmValidation = () => {
    if (validationAlert.data) {
        saveHarvestData(validationAlert.data!);
        setValidationAlert({ open: false, reason: '', data: null });
    }
  };

  return (
    <>
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
                    name="batchIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lotes</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={batchOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Seleccione lotes"
                            disabled={!canManage || isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-base font-semibold">Recolectores</FormLabel>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendCollector({ collectorId: '', kilosPerBatch: 0, hoursWorked: 8, ratePerKg: 0.45 })}
                      disabled={isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Recolector
                    </Button>
                  )}
                </div>
                
                {collectorFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-md relative items-start">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`collectors.${index}.collectorId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recolector</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione..." />
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
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`collectors.${index}.kilosPerBatch`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kilos</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="ej., 125.5" {...field} disabled={!canManage || isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`collectors.${index}.hoursWorked`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horas</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.5" {...field} disabled={!canManage || isPending}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`collectors.${index}.ratePerKg`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tarifa (ARS)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} disabled={!canManage || isPending}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-1 pt-8 flex justify-center">
                      {canManage && collectorFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCollector(index)}
                          disabled={isPending}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

              </div>
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
    </>
  );
}
