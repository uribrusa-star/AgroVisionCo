'use client';

import { useContext, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Calculator, QrCode, Scale, Clock, Banknote } from 'lucide-react';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { getBatchPhiStatus } from '@/lib/phi-utils';

const CollectorEntrySchema = z.object({
  collectorId: z.string().min(1, "El recolector es requerido."),
  kilosPerBatch: z.coerce.number().min(0, "Los kilos deben ser mayores o iguales a 0.").default(0),
  hoursWorked: z.coerce.number().min(0, "Las horas deben ser mayores o iguales a 0.").default(8),
  ratePerKg: z.coerce.number().min(0.01, "La tarifa debe ser mayor a 0."),
});

const ProductionSchema = z.object({
  date: z.date({
    required_error: "La fecha de cosecha es requerida.",
  }),
  paymentType: z.enum(['kilo', 'hour']).default('kilo'),
  batchIds: z.array(z.string()).min(1, "Debe seleccionar al menos un lote."),
  collectors: z.array(CollectorEntrySchema).min(1, "Debe agregar al menos un recolector."),
});

type ProductionFormValues = z.infer<typeof ProductionSchema>;

export function ProductionForm({ onToggleCalculator, showCalculator }: { onToggleCalculator?: () => void, showCalculator?: boolean }) {
  const { toast } = useToast();
  const { collectors, batches, addMultipleHarvests, currentUser, agronomistLogs } = useContext(AppDataContext);
  const [isPending, startTransition] = useTransition();
  const [validationAlert, setValidationAlert] = useState<{ open: boolean; reason: string; data: ProductionFormValues | null }>({ open: false, reason: '', data: null });
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  // Tarifa base del día (editable en un solo lugar)
  const [baseRate, setBaseRate] = useState<number>(35);

  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(ProductionSchema),
    defaultValues: {
      date: new Date(),
      paymentType: 'kilo',
      batchIds: [],
      collectors: [{
        collectorId: '',
        kilosPerBatch: 0,
        hoursWorked: 8,
        ratePerKg: 35,
      }],
    },
  });

  const paymentType = form.watch('paymentType') || 'kilo';
  const watchedCollectors = form.watch('collectors');

  const { fields: collectorFields, append: appendCollector, remove: removeCollector } = useFieldArray({
    control: form.control,
    name: "collectors"
  });

  // Cambiar modalidad de pago y sincronizar tarifa predeterminada
  const handleModeChange = (mode: 'kilo' | 'hour') => {
    form.setValue('paymentType', mode);
    const newRate = mode === 'hour' ? 3500 : 35;
    setBaseRate(newRate);
    const currentCollectors = form.getValues('collectors') || [];
    currentCollectors.forEach((_, idx) => {
      form.setValue(`collectors.${idx}.ratePerKg`, newRate);
      if (mode === 'hour') {
        form.setValue(`collectors.${idx}.hoursWorked`, 8);
      }
    });
  };

  // Modificar la tarifa base y actualizar las filas
  const handleBaseRateChange = (newRate: number) => {
    setBaseRate(newRate);
    const currentCollectors = form.getValues('collectors') || [];
    currentCollectors.forEach((_, idx) => {
      form.setValue(`collectors.${idx}.ratePerKg`, newRate, { shouldValidate: true, shouldDirty: true });
    });
  };

  const handleScanSuccess = (decodedText: string) => {
    let workerId = '';
    let workerName = '';

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id) workerId = parsed.id;
      if (parsed.name) workerName = parsed.name;
    } catch {
      workerId = decodedText.trim();
    }

    const matched = collectors.find(c => c.id === workerId || (workerName && c.name.toLowerCase() === workerName.toLowerCase()));

    if (matched) {
      const currentList = form.getValues('collectors');
      const emptyIndex = currentList.findIndex(c => !c.collectorId);

      if (emptyIndex !== -1) {
        form.setValue(`collectors.${emptyIndex}.collectorId`, matched.id);
      } else {
        appendCollector({ 
          collectorId: matched.id, 
          kilosPerBatch: 0, 
          hoursWorked: 8, 
          ratePerKg: baseRate 
        });
      }

      toast({
        title: "Recolector Reconocido",
        description: `Se asignó a ${matched.name}.`,
      });
    } else {
      toast({
        title: "Código no reconocido",
        description: "El código escaneado no corresponde a un recolector registrado.",
        variant: "destructive"
      });
    }
  };

  const availableBatches = useMemo(() => {
    return batches;
  }, [batches]);

  const selectedHarvestDate = form.watch('date') || new Date();

  const batchOptions = useMemo(() => {
    return availableBatches.map(b => {
      const phiStatus = getBatchPhiStatus(b.id, agronomistLogs, selectedHarvestDate);
      const isHistoricDate = selectedHarvestDate < new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      return {
        label: b.id,
        value: b.id,
        disabled: isHistoricDate ? false : phiStatus.isBlocked,
        tag: phiStatus.isBlocked ? `🔒 PHI (${phiStatus.remainingDays || 0}d rest.)` : undefined,
      };
    });
  }, [availableBatches, agronomistLogs, selectedHarvestDate]);

  // Cálculos de totales
  const totalKilos = useMemo(() => {
    return (watchedCollectors || []).reduce((acc, c) => acc + (Number(c?.kilosPerBatch) || 0), 0);
  }, [watchedCollectors]);

  const totalHours = useMemo(() => {
    return (watchedCollectors || []).reduce((acc, c) => acc + (Number(c?.hoursWorked) || 0), 0);
  }, [watchedCollectors]);

  const totalPayment = useMemo(() => {
    return (watchedCollectors || []).reduce((acc, c) => {
      const k = Number(c?.kilosPerBatch) || 0;
      const h = Number(c?.hoursWorked) || 0;
      const r = Number(c?.ratePerKg) || baseRate;
      return acc + (paymentType === 'hour' ? h * r : k * r);
    }, 0);
  }, [watchedCollectors, paymentType, baseRate]);

  const saveHarvestData = (values: ProductionFormValues) => {
    startTransition(async () => {
      const pType = values.paymentType || 'kilo';
      const harvestsData = values.collectors.map(cEntry => {
         const collector = collectors.find(c => c.id === cEntry.collectorId);
         return {
           harvest: {
             date: values.date.toISOString(),
             batchNumber: values.batchIds.join(', '),
             kilograms: pType === 'hour' ? (cEntry.kilosPerBatch || 0) : cEntry.kilosPerBatch,
             collector: {
               id: cEntry.collectorId,
               name: collector?.name || 'Unknown'
             }
           },
           hoursWorked: pType === 'hour' ? cEntry.hoursWorked : (cEntry.hoursWorked || 8),
           ratePerKg: cEntry.ratePerKg || baseRate,
           paymentType: pType,
         };
      });

      await addMultipleHarvests(harvestsData);

      toast({
          title: '¡Carga Exitosa!',
          description: `Cosecha para lotes [${values.batchIds.join(', ')}] guardada correctamente.`,
      });

      form.reset({
          ...form.getValues(),
          batchIds: [],
          collectors: [{
             collectorId: '',
             kilosPerBatch: 0,
             hoursWorked: 8,
             ratePerKg: baseRate
          }]
      });
    });
  };

  const onSubmit = (values: ProductionFormValues) => {
    startTransition(async () => {
      saveHarvestData(values);
    });
  };

  const handleConfirmValidation = () => {
    if (validationAlert.data) {
        saveHarvestData(validationAlert.data!);
        setValidationAlert({ open: false, reason: '', data: null });
    }
  };

  return (
    <>
      <Card className="w-full relative shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Registrar Carga de Producción</CardTitle>
            <CardDescription>Cargue los datos de cosecha o jornada y asigne los lotes correspondientes.</CardDescription>
          </div>
          {onToggleCalculator && (
            <Button 
              variant={showCalculator ? "default" : "outline"}
              size="icon" 
              onClick={onToggleCalculator}
              className="shrink-0"
              title="Mostrar/Ocultar Calculadora de Taras"
            >
              <Calculator className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              
              {/* Fila 1: Fecha y Lotes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Fecha de Cosecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start pl-3 text-left font-normal h-10",
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
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Lotes Cosechados</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={batchOptions}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccione lotes..."
                          disabled={!canManage || isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fila 2: Barra de Configuración de Jornada (Modalidad + Tarifa Base + QR) */}
              <div className="bg-muted/40 p-3 sm:p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Modalidad de Liquidación */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Modalidad de Liquidación
                  </span>
                  <div className="inline-flex rounded-lg bg-background p-1 border shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleModeChange('kilo')}
                      className={cn(
                        "px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 sm:gap-2",
                        paymentType === 'kilo' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Scale className="h-4 w-4" />
                      Por Kilo ($/kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('hour')}
                      className={cn(
                        "px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 sm:gap-2",
                        paymentType === 'hour' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Clock className="h-4 w-4" />
                      Por Hora ($/h)
                    </button>
                  </div>
                </div>

                {/* Tarifa General del Día y Escaneo QR */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Tarifa General ({paymentType === 'hour' ? '$/hora' : '$/kg'})
                    </span>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={baseRate}
                        onChange={(e) => handleBaseRateChange(Number(e.target.value) || 0)}
                        className="pl-7 pr-3 h-10 font-bold text-foreground text-sm"
                        disabled={!canManage || isPending}
                      />
                    </div>
                  </div>

                  {canManage && (
                    <div className="space-y-1.5 pt-4 md:pt-0">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:block">&nbsp;</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsQRScannerOpen(true)}
                        disabled={isPending}
                        className="h-10 gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-medium shadow-xs"
                      >
                        <QrCode className="h-4 w-4" />
                        Escanear QR
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fila 3: Lista de Cosecheros */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-foreground">
                    Cosecheros Asignados ({collectorFields.length})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {paymentType === 'hour' ? 'Liquidación según horas trabajadas' : 'Liquidación según kilos cosechados'}
                  </span>
                </div>

                {collectorFields.map((field, index) => {
                  const entry = watchedCollectors?.[index];
                  const rowKilos = Number(entry?.kilosPerBatch) || 0;
                  const rowHours = Number(entry?.hoursWorked) || 0;
                  const rowRate = Number(entry?.ratePerKg) || baseRate;
                  const rowSubtotal = paymentType === 'hour' ? rowHours * rowRate : rowKilos * rowRate;

                  return (
                    <div 
                      key={field.id} 
                      className="p-3.5 border rounded-xl bg-card text-card-foreground shadow-xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center gap-3"
                    >
                      {/* Selector de Recolector */}
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`collectors.${index}.collectorId`}
                          render={({ field: colField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                                <span>Recolector #{index + 1}</span>
                                {rowRate !== baseRate && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                    Tarifa esp: ${rowRate.toLocaleString('es-AR')}
                                  </span>
                                )}
                              </FormLabel>
                              <Select onValueChange={colField.onChange} value={colField.value} disabled={!canManage || isPending}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Seleccione cosechero..." />
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

                      {/* Input Principal según modalidad */}
                      <div className="w-full md:w-44">
                        {paymentType === 'kilo' ? (
                          <FormField
                            control={form.control}
                            name={`collectors.${index}.kilosPerBatch`}
                            render={({ field: kgField }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs text-muted-foreground font-medium">Kilos Cosechados</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0.0"
                                      {...kgField}
                                      disabled={!canManage || isPending}
                                      className="h-10 pr-9 text-base font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">kg</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name={`collectors.${index}.hoursWorked`}
                            render={({ field: hField }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs text-muted-foreground font-medium">Horas Trabajadas</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.5"
                                      min="0.5"
                                      placeholder="8"
                                      {...hField}
                                      disabled={!canManage || isPending}
                                      className="h-10 pr-9 text-base font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">hs</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Subtotal y Acciones */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-4 border-t md:border-t-0">
                        <div className="text-left md:text-right min-w-[110px]">
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {paymentType === 'hour' 
                              ? `${rowHours} hs × $${rowRate.toLocaleString('es-AR')}`
                              : `${rowKilos} kg × $${rowRate.toLocaleString('es-AR')}`
                            }
                          </div>
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            ${rowSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Popover para tarifa individual personalizada */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-9 w-9 shrink-0",
                                rowRate !== baseRate ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
                              )}
                              title="Modificar tarifa para este cosechero"
                              disabled={!canManage || isPending}
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" align="end">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-foreground">
                                Tarifa especial ($/{paymentType === 'hour' ? 'h' : 'kg'}):
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={entry?.ratePerKg ?? baseRate}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  form.setValue(`collectors.${index}.ratePerKg`, val, { shouldValidate: true, shouldDirty: true });
                                }}
                                className="h-9 font-semibold"
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Tarifa general del día: ${baseRate}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Botón Eliminar fila */}
                        {canManage && collectorFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCollector(index)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                            title="Quitar cosechero"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Botones inferiores para Añadir Cosechero */}
                {canManage && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendCollector({ 
                        collectorId: '', 
                        kilosPerBatch: 0, 
                        hoursWorked: 8, 
                        ratePerKg: baseRate 
                      })}
                      disabled={isPending}
                      className="flex-1 h-11 border-dashed border-2 hover:border-primary/50 text-sm font-medium gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir Cosechero
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsQRScannerOpen(true)}
                      disabled={isPending}
                      className="h-11 sm:w-auto text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs gap-1.5"
                    >
                      <QrCode className="h-4 w-4" />
                      Escanear QR
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Footer con Resumen General */}
            {canManage && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-muted/20 border-t pt-4">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {paymentType === 'kilo' ? (
                    <div>
                      <span className="text-muted-foreground">Kilos Totales: </span>
                      <strong className="text-foreground text-base">
                        {totalKilos.toLocaleString('es-AR')} kg
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span className="text-muted-foreground">Horas Totales: </span>
                      <strong className="text-foreground text-base">
                        {totalHours.toLocaleString('es-AR')} hs
                      </strong>
                    </div>
                  )}
                  <span className="opacity-40">•</span>
                  <div>
                    <span className="text-muted-foreground">Total Liquidación: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                      ${totalPayment.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={isPending || !canManage} className="shadow-md h-11 px-6 font-semibold">
                  {isPending ? 'Validando y Guardando...' : 'Guardar Producción y Pago'}
                </Button>
              </CardFooter>
            )}
          </form>
        </Form>

        <QRScannerDialog 
          isOpen={isQRScannerOpen} 
          onOpenChange={setIsQRScannerOpen} 
          onScanSuccess={handleScanSuccess} 
          title="Escanear QR de Cosechero" 
          description="Apunte la cámara a la credencial del recolector para asignarlo automáticamente a la pesada." 
        />
      </Card>

      <AlertDialog open={validationAlert.open} onOpenChange={(open) => setValidationAlert(prev => ({...prev, open}))}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Advertencia de Validación de Cosecha</AlertDialogTitle>
                <AlertDialogDescription>
                    {validationAlert.reason}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Corregir Datos</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmValidation}>Continuar de Todos Modos</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
