
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
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { ImageWithHint } from '@/lib/types';

const LogSchema = z.object({
  observationType: z.enum(['Plaga', 'Enfermedad', 'Deficiencia', 'Exceso'], {
    required_error: "El tipo de observación es requerido.",
  }),
  batchId: z.string().optional(),
  product: z.string().min(1, "El agente o nutriente observado es requerido."),
  severity: z.string().min(3, "La incidencia o severidad es requerida."),
  notes: z.string().min(5, "Las notas deben tener al menos 5 caracteres."),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function HealthLogForm() {
  const { addAgronomistLog, currentUser, batches } = React.useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      observationType: undefined,
      batchId: 'general',
      product: '',
      severity: '',
      notes: '',
      images: [{ url: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "images"
  });

  const onSubmit = (data: LogFormValues) => {
    startTransition(() => {
        const imagesWithHints: ImageWithHint[] = (data.images || [])
            .filter(img => img.url)
            .map(img => ({ url: img.url, hint: 'crop disease pest deficiency'}));

      addAgronomistLog({
        date: new Date().toISOString(),
        type: 'Sanidad',
        batchId: data.batchId === 'general' ? undefined : data.batchId,
        product: `${data.observationType}: ${data.product}`,
        notes: `Incidencia: ${data.severity}. Observaciones: ${data.notes}`,
        images: imagesWithHints,
      });

      toast({
        title: "¡Registro de Sanidad Exitoso!",
        description: `Se ha agregado una nueva observación de ${data.observationType}.`,
      });

      form.reset({
        observationType: undefined,
        batchId: 'general',
        product: '',
        severity: '',
        notes: '',
        images: [{ url: '' }],
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Sanidad y Monitoreo</CardTitle>
        <CardDescription>Observe plagas, enfermedades, deficiencias o excesos nutricionales.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
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
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote (Opcional)</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={!canManage || isPending}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Observación General" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">Observación General</SelectItem>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa la ubicación, síntomas, condiciones, etc."
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
