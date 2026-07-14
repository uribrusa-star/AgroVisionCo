
'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { PlusCircle, Trash2, MapPin, Navigation, WifiOff } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { ImageWithHint } from '@/lib/types';

const LogSchema = z.object({
  date: z.date({
    required_error: "La fecha es requerida.",
  }),
  observationType: z.enum(['Plaga', 'Enfermedad', 'Deficiencia', 'Exceso'], {
    required_error: "El tipo de observación es requerido.",
  }),
  batchIds: z.array(z.string()).optional(),
  product: z.string().min(1, "El agente o nutriente observado es requerido."),
  severity: z.string().min(3, "La incidencia o severidad es requerida."),
  phiDays: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().min(5, "Las notas deben tener al menos 5 caracteres."),
  latitude: z.coerce.number().optional().or(z.literal('')),
  longitude: z.coerce.number().optional().or(z.literal('')),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function HealthLogForm() {
  const { addAgronomistLog, currentUser, batches } = React.useContext(AppDataContext);
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      date: new Date(),
      observationType: undefined,
      batchIds: [],
      product: '',
      severity: '',
      phiDays: '',
      notes: '',
      latitude: '',
      longitude: '',
      images: [{ url: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "images"
  });

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
        toast({
            title: "No compatible",
            description: "Su navegador no soporta geolocalización.",
            variant: "destructive"
        });
        return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            form.setValue('latitude', position.coords.latitude);
            form.setValue('longitude', position.coords.longitude);
            setIsCapturingGps(false);
            toast({
                title: "Ubicación capturada",
                description: "Se han cargado las coordenadas actuales."
            });
        },
        (error) => {
            console.error(error);
            setIsCapturingGps(false);
            toast({
                title: "Error de GPS",
                description: "No se pudo obtener la ubicación. Verifique los permisos.",
                variant: "destructive"
            });
        },
        { enableHighAccuracy: true }
    );
  };

  const onSubmit = (data: LogFormValues) => {
    startTransition(() => {
        const imagesWithHints: ImageWithHint[] = (data.images || [])
            .filter(img => img.url)
            .map(img => ({ url: img.url, hint: 'crop disease pest deficiency'}));

      addAgronomistLog({
        date: data.date.toISOString(),
        type: 'Sanidad',
        batchIds: data.batchIds && data.batchIds.length > 0 ? data.batchIds : undefined,
        product: `${data.observationType}: ${data.product}`,
        notes: `Incidencia: ${data.severity}. Observaciones: ${data.notes}`,
        images: imagesWithHints,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        phiDays: data.phiDays !== '' && data.phiDays !== undefined ? Number(data.phiDays) : undefined,
      });

      toast({
        title: "¡Registro de Sanidad Exitoso!",
        description: `Se ha agregado una nueva observación de ${data.observationType}.`,
      });

      form.reset({
        date: new Date(),
        observationType: undefined,
        batchIds: [],
        product: '',
        severity: '',
        phiDays: '',
        notes: '',
        latitude: '',
        longitude: '',
        images: [{ url: '' }],
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle>Registrar Sanidad y Monitoreo</CardTitle>
            {!isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold border border-amber-200 uppercase">
                    <WifiOff className="h-3 w-3" /> Modo Local
                </div>
            )}
        </div>
        <CardDescription>Observe plagas, enfermedades, deficiencias o excesos nutricionales y asocie coordenadas.</CardDescription>
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
                    <FormLabel>Fecha de Observación</FormLabel>
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
                    <FormLabel>Lotes (Opcional - Dejar vacío para Observación General)</FormLabel>
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
            <div className="grid md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="observationType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Observación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Plaga">Plaga</SelectItem>
                            <SelectItem value="Enfermedad">Enfermedad</SelectItem>
                            <SelectItem value="Deficiencia">Deficiencia</SelectItem>
                            <SelectItem value="Exceso">Exceso</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Agente/Nutriente Observado</FormLabel>
                        <FormControl>
                        <Input placeholder="Ej. Ácaros, Calcio, Nitrógeno" {...field} disabled={!canManage || isPending} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Incidencia / Severidad</FormLabel>
                    <FormControl>
                    <Input placeholder="Ej. 10% de plantas afectadas" {...field} disabled={!canManage || isPending} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phiDays"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <span>Período de Carencia (PHI en días)</span>
                    </FormLabel>
                    <FormControl>
                    <Input type="number" min="0" placeholder="Ej. 5 (bloqueo de cosecha)" {...field} disabled={!canManage || isPending} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
              />
            </div>

            {/* Nueva sección de Georeferenciación */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Ubicación Geográfica (Hotspot)</FormLabel>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleCaptureGps}
                        disabled={!canManage || isPending || isCapturingGps}
                        className="h-8"
                    >
                        <Navigation className={cn("mr-2 h-3 w-3", isCapturingGps && "animate-pulse")} />
                        {isCapturingGps ? 'Capturando...' : 'Capturar GPS'}
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Latitud</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="-31.9..." {...field} disabled={!canManage || isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Longitud</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="-60.9..." {...field} disabled={!canManage || isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa síntomas, condiciones ambientales, etc."
                      className="resize-none"
                      {...field}
                      disabled={!canManage || isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <FormLabel>Imágenes (Opcional)</FormLabel>
              {fields.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`images.${index}.url`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input placeholder={`https://ejemplo.com/imagen-${index + 1}.jpg`} {...field} disabled={!canManage || isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={!canManage || isPending || fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ url: '' })}
                disabled={!canManage || isPending || fields.length >= 5}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Imagen
              </Button>
            </div>
          </CardContent>
          {canManage && (
            <CardFooter>
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Observación'}</Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
