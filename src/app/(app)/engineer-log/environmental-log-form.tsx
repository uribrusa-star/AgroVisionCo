
'use client';

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const LogSchema = z.object({
  minTemp: z.coerce.number(),
  maxTemp: z.coerce.number(),
  humidity: z.coerce.number(),
  notes: z.string().min(3, "Las notas son requeridas."),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function EnvironmentalLogForm() {
  const { addAgronomistLog, currentUser } = React.useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      minTemp: 0,
      maxTemp: 0,
      humidity: 0,
      notes: '',
    },
  });

  const onSubmit = (data: LogFormValues) => {
    startTransition(() => {
      addAgronomistLog({
        date: new Date().toISOString(),
        type: 'Condiciones Ambientales',
        product: `T: ${data.minTemp}°C - ${data.maxTemp}°C / H: ${data.humidity}%`,
        notes: data.notes,
      });

      toast({
        title: "¡Registro Exitoso!",
        description: `Se han guardado las condiciones ambientales del día.`,
      });

      form.reset({
        minTemp: 0,
        maxTemp: 0,
        humidity: 0,
        notes: '',
      });
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Condiciones Ambientales</CardTitle>
        <CardDescription>Registre los datos climáticos diarios del campo.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="minTemp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>T. Mín (°C)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled={!canManage || isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxTemp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>T. Máx (°C)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled={!canManage || isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="humidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Humedad (%)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled={!canManage || isPending} /></FormControl>
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
                  <FormLabel>Obs. Climáticas (lluvia, helada, viento)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. 5mm de lluvia por la mañana, helada leve."
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
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Datos Climáticos'}</Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
