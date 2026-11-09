'use client';

import React, { useTransition, useContext, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, QrCode, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { MultiSelect } from '@/components/ui/multi-select';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';

const LogSchema = z.object({
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  practiceType: z.string().min(1, "El tipo de labor es requerido."),
  personId: z.string().min(1, "Debe seleccionar a una persona."),
  hoursWorked: z.coerce.number().min(0.5, "Las horas deben ser un número positivo."),
  costPerHour: z.coerce.number().min(1, "El costo por hora es requerido."),
  batchIds: z.array(z.string()).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function CulturalPracticesLogForm() {
  const { addCulturalPracticeLog, currentUser, collectors, packers, batches } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  const combinedPersonnel = useMemo(() => {
    const allPersonnel = [
      ...collectors.map(c => ({ id: c.id, name: c.name, dni: c.dni, phone: c.phone, type: 'Recolector' as const })),
      ...packers.map(p => ({ id: p.id, name: p.name, dni: p.dni, phone: p.phone, type: 'Embalador' as const }))
    ];
    return allPersonnel.sort((a, b) => a.name.localeCompare(b.name));
  }, [collectors, packers]);

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      date: new Date(),
      practiceType: '',
      personId: '',
      hoursWorked: 8,
      costPerHour: 0,
      batchIds: [],
    },
  });

  const selectedPersonId = form.watch('personId');
  const watchedHours = form.watch('hoursWorked') || 0;
  const watchedCost = form.watch('costPerHour') || 0;

  const currentPerson = useMemo(() => {
    return combinedPersonnel.find(p => p.id === selectedPersonId);
  }, [combinedPersonnel, selectedPersonId]);

  const estimatedTotal = useMemo(() => {
    return watchedHours * watchedCost;
  }, [watchedHours, watchedCost]);

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

    const matched = combinedPersonnel.find(p => 
      p.id === workerId || 
      (workerName && p.name.toLowerCase() === workerName.toLowerCase())
    );

    if (matched) {
      form.setValue('personId', matched.id);
      toast({
        title: `${matched.type} Reconocido`,
        description: `Se asignó a ${matched.name} (${matched.type}) exitosamente con su QR.`,
      });
      setIsQRScannerOpen(false);
    } else {
      toast({
        title: "Código no reconocido",
        description: "El código escaneado no corresponde a ningún recolector o embalador registrado.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: LogFormValues) => {
    startTransition(() => {
      const person = combinedPersonnel.find(p => p.id === data.personId);
      if (!person) {
        toast({ title: "Error", description: "No se encontró a la persona seleccionada.", variant: "destructive" });
        return;
      }
      
      const payment = data.hoursWorked * data.costPerHour;

      const batchIdsToProcess = data.batchIds && data.batchIds.length > 0 ? data.batchIds : undefined;
      
      addCulturalPracticeLog({
        date: data.date.toISOString(),
        practiceType: data.practiceType,
        personnelId: person.id,
        personnelName: person.name,
        personnelType: person.type,
        hoursWorked: data.hoursWorked,
        costPerHour: data.costPerHour,
        payment: payment,
        notes: `Pago por labor de ${data.practiceType}`,
        batchIds: batchIdsToProcess,
      });

      toast({
        title: "¡Registro Exitoso!",
        description: `Se ha guardado el pago por la labor cultural a ${person.name}.`,
      });

      form.reset({
        date: new Date(),
        practiceType: '',
        personId: '',
        hoursWorked: 8,
        costPerHour: 0,
        batchIds: [],
      });
    });
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle>Registrar Pago de Labores Culturales</CardTitle>
            <CardDescription>Registre la labor, el personal, el lote y el costo asociado a la tarea.</CardDescription>
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de la Actividad</FormLabel>
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
                          <SelectItem value="Otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Personal (Recolectores y Embaladores)</FormLabel>
                      {currentPerson && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> {currentPerson.type} seleccionado
                        </span>
                      )}
                    </div>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione o escanee con QR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {combinedPersonnel.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentPerson && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">{currentPerson.name}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium">
                      {currentPerson.type}
                    </span>
                    {currentPerson.dni && <span className="text-muted-foreground ml-2">DNI: {currentPerson.dni}</span>}
                  </div>
                  {currentPerson.phone && (
                    <span className="text-muted-foreground">{currentPerson.phone}</span>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="batchIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lotes (Opcional - Dejar vacío para Labor General)</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
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

              {/* Resumen dinámico del monto a liquidar */}
              <div className="rounded-lg bg-muted/60 p-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Monto Total a Liquidar:</span>
                <span className="text-base font-bold text-foreground">
                  ${estimatedTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS
                </span>
              </div>
            </CardContent>
            {canManage && (
              <CardFooter>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? 'Guardando...' : 'Guardar Pago de Labor'}
                </Button>
              </CardFooter>
            )}
          </form>
        </Form>
      </Card>

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleScanSuccess}
        title="Escanear QR de Personal (Labores)"
        description="Apunte la cámara a la credencial del recolector o embalador para seleccionarlo instantáneamente."
      />
    </>
  );
}
