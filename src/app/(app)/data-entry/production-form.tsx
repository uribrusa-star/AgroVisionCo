'use client';

import { useContext, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Calculator, QrCode, Scale, Clock, Banknote, ChevronDown, Check } from 'lucide-react';
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
  const [isModeOpen, setIsModeOpen] = useState(false);
  
  // Tarifa base del día (soporta string mientras se tipea para evitar saltos y números raros)
  const [baseRate, setBaseRate] = useState<string | number>(35);

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

  // useWatch garantiza reactividad instantánea en el componente padre con cada tecla ingresada
  const watchedPaymentType = useWatch({
    control: form.control,
    name: 'paymentType',
  }) || 'kilo';

  const watchedCollectors = useWatch({
    control: form.control,
    name: 'collectors',
  });

  const { fields: collectorFields, append: appendCollector, remove: removeCollector } = useFieldArray({
    control: form.control,
    name: "collectors"
  });

  // Tarifa numérica validada
  const numericBaseRate = useMemo(() => {
    const parsed = typeof baseRate === 'number' ? baseRate : parseFloat(baseRate);
    return !isNaN(parsed) && parsed > 0 ? parsed : (watchedPaymentType === 'hour' ? 3500 : 35);
  }, [baseRate, watchedPaymentType]);

  // Cambiar modalidad de pago y sincronizar tarifa predeterminada
  const handleModeChange = (mode: 'kilo' | 'hour') => {
    form.setValue('paymentType', mode);
    const newRate = mode === 'hour' ? 3500 : 35;
    setBaseRate(newRate);
    const currentCollectors = form.getValues('collectors') || [];
    currentCollectors.forEach((_, idx) => {
      form.setValue(`collectors.${idx}.ratePerKg`, newRate, { shouldValidate: true, shouldDirty: true });
      if (mode === 'hour') {
        form.setValue(`collectors.${idx}.hoursWorked`, 8, { shouldValidate: true, shouldDirty: true });
      }
    });
  };

  // Modificar la tarifa base y actualizar todas las filas en tiempo real
  const handleBaseRateChange = (rawVal: string) => {
    setBaseRate(rawVal);
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      const currentCollectors = form.getValues('collectors') || [];
      currentCollectors.forEach((_, idx) => {
        form.setValue(`collectors.${idx}.ratePerKg`, num, { shouldValidate: true, shouldDirty: true });
      });
    }
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
          ratePerKg: numericBaseRate 
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
      
      // Obtener nombre de la variedad si existe
      let varietyName = '';
      if (b.varieties && Array.isArray(b.varieties) && b.varieties.length > 0) {
        const names = b.varieties
          .map((v: any) => (typeof v === 'string' ? v : v?.name)?.trim())
          .filter(Boolean);
        if (names.length > 0) varietyName = names.join(', ');
      } else if (typeof (b as any).variety === 'string' && (b as any).variety.trim()) {
        varietyName = (b as any).variety.trim();
      }

      const displayLabel = varietyName ? `${b.id} - ${varietyName}` : b.id;

      return {
        label: displayLabel,
        value: b.id,
        disabled: isHistoricDate ? false : phiStatus.isBlocked,
        tag: phiStatus.isBlocked ? `🔒 PHI (${phiStatus.remainingDays || 0}d rest.)` : undefined,
      };
    });
  }, [availableBatches, agronomistLogs, selectedHarvestDate]);

  // Cálculos de totales reactivos con parseFloat estricto
  const totalKilos = useMemo(() => {
    if (!watchedCollectors || !Array.isArray(watchedCollectors)) return 0;
    return watchedCollectors.reduce((acc, c) => {
      const val = parseFloat(String(c?.kilosPerBatch || 0));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [watchedCollectors]);

  const totalHours = useMemo(() => {
    if (!watchedCollectors || !Array.isArray(watchedCollectors)) return 0;
    return watchedCollectors.reduce((acc, c) => {
      const val = parseFloat(String(c?.hoursWorked || 0));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [watchedCollectors]);

  const totalPayment = useMemo(() => {
    if (!watchedCollectors || !Array.isArray(watchedCollectors)) return 0;
    return watchedCollectors.reduce((acc, c) => {
      const k = parseFloat(String(c?.kilosPerBatch || 0)) || 0;
      const h = parseFloat(String(c?.hoursWorked || 0)) || 0;
      const parsedR = parseFloat(String(c?.ratePerKg));
      const r = !isNaN(parsedR) && parsedR > 0 ? parsedR : numericBaseRate;
      return acc + (watchedPaymentType === 'hour' ? h * r : k * r);
    }, 0);
  }, [watchedCollectors, watchedPaymentType, numericBaseRate]);

  const saveHarvestData = (values: ProductionFormValues) => {
    startTransition(async () => {
      const pType = values.paymentType || 'kilo';
      const harvestsData = values.collectors.map(cEntry => {
         const collector = collectors.find(c => c.id === cEntry.collectorId);
         const parsedRate = parseFloat(String(cEntry.ratePerKg));
         const effectiveRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : numericBaseRate;

         return {
           harvest: {
             date: values.date.toISOString(),
             batchNumber: values.batchIds.join(', '),
             kilograms: pType === 'hour' ? (parseFloat(String(cEntry.kilosPerBatch)) || 0) : (parseFloat(String(cEntry.kilosPerBatch)) || 0),
             collector: {
               id: cEntry.collectorId,
               name: collector?.name || 'Unknown'
             }
           },
           hoursWorked: pType === 'hour' ? (parseFloat(String(cEntry.hoursWorked)) || 8) : (parseFloat(String(cEntry.hoursWorked)) || 8),
           ratePerKg: effectiveRate,
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
             ratePerKg: numericBaseRate
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
                                "w-full justify-start pl-3 text-left font-normal h-10 text-base md:text-sm",
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

              {/* Fila 2: Configuración de Jornada (Modalidad Desplegable + Tarifa Base + QR ancho completo) */}
              <div className="bg-muted/40 p-3.5 sm:p-4 rounded-xl border space-y-3.5">
                
                {/* Selector Desplegable de Modalidad a Ancho Completo */}
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                    <span>Modalidad de Liquidación</span>
                    <span className="text-[11px] font-normal lowercase text-muted-foreground">Toque para cambiar</span>
                  </div>
                  
                  {/* Botón que despliega las opciones */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModeOpen(!isModeOpen)}
                    className="w-full h-11 justify-between px-4 text-base md:text-sm font-semibold border-muted-foreground/20 bg-background shadow-xs hover:bg-muted/40 transition-all"
                  >
                    <span className="flex items-center gap-2.5">
                      {watchedPaymentType === 'kilo' ? (
                        <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="text-foreground">
                        Modalidad: <strong>{watchedPaymentType === 'kilo' ? 'Por Kilo ($/kg)' : 'Por Hora ($/h)'}</strong>
                      </span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isModeOpen && "rotate-180")} />
                  </Button>

                  {/* Opciones desplegadas que ocupan todo el ancho */}
                  {isModeOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1 animate-in fade-in-50 duration-150">
                      <Button
                        type="button"
                        variant={watchedPaymentType === 'kilo' ? 'default' : 'outline'}
                        onClick={() => {
                          handleModeChange('kilo');
                          setIsModeOpen(false);
                        }}
                        className={cn(
                          "w-full h-11 gap-2 font-semibold text-base md:text-sm transition-all",
                          watchedPaymentType === 'kilo' ? "shadow-sm" : "bg-background"
                        )}
                      >
                        <Scale className="h-4 w-4" />
                        Por Kilo ($/kg)
                        {watchedPaymentType === 'kilo' && <Check className="h-4 w-4 ml-auto" />}
                      </Button>
                      <Button
                        type="button"
                        variant={watchedPaymentType === 'hour' ? 'default' : 'outline'}
                        onClick={() => {
                          handleModeChange('hour');
                          setIsModeOpen(false);
                        }}
                        className={cn(
                          "w-full h-11 gap-2 font-semibold text-base md:text-sm transition-all",
                          watchedPaymentType === 'hour' ? "shadow-sm" : "bg-background"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                        Por Hora ($/h)
                        {watchedPaymentType === 'hour' && <Check className="h-4 w-4 ml-auto" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tarifa General y Escaneo QR (Ambos ocupan todo el ancho) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full items-end">
                  <div className="space-y-1.5 w-full">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">
                      Tarifa General ({watchedPaymentType === 'hour' ? '$/hora' : '$/kg'})
                    </span>
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={baseRate}
                        onChange={(e) => handleBaseRateChange(e.target.value)}
                        className="pl-7 pr-3 h-11 font-bold text-foreground text-base w-full bg-background shadow-xs"
                        disabled={!canManage || isPending}
                      />
                    </div>
                  </div>

                  {canManage && (
                    <div className="space-y-1.5 w-full">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block px-0.5">&nbsp;</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsQRScannerOpen(true)}
                        disabled={isPending}
                        className="w-full h-11 gap-2 border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-base md:text-sm font-semibold shadow-xs"
                      >
                        <QrCode className="h-5 w-5" />
                        Escanear Credencial QR
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
                    {watchedPaymentType === 'hour' ? 'Liquidación según horas trabajadas' : 'Liquidación según kilos cosechados'}
                  </span>
                </div>

                {collectorFields.map((field, index) => {
                  const entry = watchedCollectors?.[index];
                  const rowKilos = parseFloat(String(entry?.kilosPerBatch || 0)) || 0;
                  const rowHours = parseFloat(String(entry?.hoursWorked || 0)) || 0;
                  const parsedRate = parseFloat(String(entry?.ratePerKg));
                  const rowRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : numericBaseRate;
                  const rowSubtotal = watchedPaymentType === 'hour' ? rowHours * rowRate : rowKilos * rowRate;

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
                                {parsedRate !== numericBaseRate && !isNaN(parsedRate) && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                    Tarifa esp: ${rowRate.toLocaleString('es-AR')}
                                  </span>
                                )}
                              </FormLabel>
                              <Select onValueChange={colField.onChange} value={colField.value} disabled={!canManage || isPending}>
                                <FormControl>
                                  <SelectTrigger className="h-10 text-base md:text-sm">
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
                        {watchedPaymentType === 'kilo' ? (
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
                                      onChange={(e) => {
                                        kgField.onChange(e);
                                      }}
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
                                      step="any"
                                      min="0"
                                      placeholder="8"
                                      {...hField}
                                      onChange={(e) => {
                                        hField.onChange(e);
                                      }}
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
                            {watchedPaymentType === 'hour' 
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
                                parsedRate !== numericBaseRate && !isNaN(parsedRate) ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
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
                                Tarifa especial ($/{watchedPaymentType === 'hour' ? 'h' : 'kg'}):
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={entry?.ratePerKg ?? numericBaseRate}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  form.setValue(`collectors.${index}.ratePerKg`, val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                }}
                                className="h-10 font-semibold text-base"
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Tarifa general del día: ${numericBaseRate}
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
                        ratePerKg: numericBaseRate 
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
                  <div>
                    <span className="text-muted-foreground">Kilos Totales: </span>
                    <strong className="text-foreground text-base">
                      {totalKilos.toLocaleString('es-AR')} kg
                    </strong>
                  </div>
                  {watchedPaymentType === 'hour' && (
                    <>
                      <span className="opacity-40">•</span>
                      <div>
                        <span className="text-muted-foreground">Horas Totales: </span>
                        <strong className="text-foreground text-base">
                          {totalHours.toLocaleString('es-AR')} hs
                        </strong>
                      </div>
                    </>
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
