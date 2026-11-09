'use client';

import { useContext, useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, QrCode, CheckCircle2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { PackagingHistory } from './packaging-history';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';

const PackagingSchema = z.object({
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  packerId: z.string().min(1, "El embalador es requerido."),
  kilogramsPackaged: z.coerce.number().min(1, "Los kilos deben ser un número positivo."),
  hoursWorked: z.coerce.number().min(0.5, "Las horas trabajadas son requeridas."),
  costPerHour: z.coerce.number().min(1, "El costo por hora es requerido."),
});

type PackagingFormValues = z.infer<typeof PackagingSchema>;

export function PackagingForm() {
  const { toast } = useToast();
  const { packers, addPackagingLog, currentUser } = useContext(AppDataContext);
  const [isPending, startTransition] = useTransition();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(PackagingSchema),
    defaultValues: {
      date: new Date(),
      packerId: '',
      kilogramsPackaged: 0,
      hoursWorked: 8,
      costPerHour: 5,
    },
  });

  const selectedPackerId = form.watch('packerId');
  const watchedHours = form.watch('hoursWorked') || 0;
  const watchedCost = form.watch('costPerHour') || 0;
  const watchedKilos = form.watch('kilogramsPackaged') || 0;

  const currentPacker = useMemo(() => {
    return packers.find(p => p.id === selectedPackerId);
  }, [packers, selectedPackerId]);

  const estimatedTotal = useMemo(() => {
    return watchedHours * watchedCost;
  }, [watchedHours, watchedCost]);

  const estimatedRate = useMemo(() => {
    return watchedHours > 0 && watchedKilos > 0 ? (watchedKilos / watchedHours).toFixed(1) : null;
  }, [watchedHours, watchedKilos]);

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

    const matched = packers.find(p => 
      p.id === workerId || 
      (workerName && p.name.toLowerCase() === workerName.toLowerCase())
    );

    if (matched) {
      form.setValue('packerId', matched.id);
      toast({
        title: "Embalador Reconocido",
        description: `Se asignó a ${matched.name} exitosamente con su QR.`,
      });
      setIsQRScannerOpen(false);
    } else {
      toast({
        title: "Código no reconocido",
        description: "El código escaneado no corresponde a un embalador registrado.",
        variant: "destructive"
      });
    }
  };
  
  const savePackagingData = (values: PackagingFormValues) => {
    const packer = packers.find(p => p.id === values.packerId);
    if (!packer) {
      toast({ title: 'Error', description: 'Embalador no encontrado.', variant: 'destructive'});
      return;
    }
    
    startTransition(() => {
      const payment = values.hoursWorked * values.costPerHour;
      addPackagingLog({
          date: values.date.toISOString(),
          packerId: values.packerId,
          packerName: packer.name,
          kilogramsPackaged: values.kilogramsPackaged,
          hoursWorked: values.hoursWorked,
          costPerHour: values.costPerHour,
          payment: payment,
      });

      toast({
          title: '¡Éxito!',
          description: `Registro de embalaje para ${packer.name} guardado correctamente.`,
      });

      form.reset({
        ...form.getValues(),
        packerId: '',
        kilogramsPackaged: 0,
        date: new Date(),
      });
    });
  }
  
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle>Registrar Costo de Embalaje</CardTitle>
            <CardDescription>Ingrese los detalles del trabajo de embalaje y calcule el costo.</CardDescription>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQRScannerOpen(true)}
              disabled={isPending}
              className="gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0"
            >
              <QrCode className="h-4 w-4" />
              Escanear QR
            </Button>
          )}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(savePackagingData)}>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha del Trabajo</FormLabel>
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
                    name="packerId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Embalador</FormLabel>
                          {currentPacker && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Seleccionado
                            </span>
                          )}
                        </div>
                        <Select onValueChange={field.onChange} value={field.value} name={field.name} disabled={!canManage || isPending}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione o escanee con QR" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {packers.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>

              {currentPacker && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">{currentPacker.name}</span>
                    {currentPacker.dni && <span className="text-muted-foreground ml-2">DNI: {currentPacker.dni}</span>}
                  </div>
                  {currentPacker.phone && (
                    <span className="text-muted-foreground">{currentPacker.phone}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="kilogramsPackaged"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilos Embalados</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="ej., 200" {...field} disabled={!canManage || isPending} />
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
                    name="costPerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo por Hora (ARS)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} disabled={!canManage || isPending}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* Resumen dinámico del cálculo */}
              <div className="rounded-lg bg-muted/60 p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Monto a Liquidar:</span>
                  <span className="text-base font-bold text-foreground">
                    ${estimatedTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Velocidad Estimada:</span>
                  <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                    {estimatedRate ? `${estimatedRate} kg/h` : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
            {canManage && (
                <CardFooter>
                    <Button type="submit" disabled={isPending || !canManage} className="w-full sm:w-auto">
                        {isPending ? 'Guardando...' : 'Guardar Registro de Embalaje'}
                    </Button>
                </CardFooter>
            )}
          </form>
        </Form>
      </Card>

      <PackagingHistory />

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleScanSuccess}
        title="Escanear QR de Embalador"
        description="Apunte la cámara a la credencial del embalador para seleccionarlo instantáneamente."
      />
    </div>
  );
}
