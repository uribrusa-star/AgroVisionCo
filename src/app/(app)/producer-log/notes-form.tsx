
'use client';

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const LogSchema = z.object({
  notes: z.string().min(10, "Las notas deben tener al menos 10 caracteres."),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function NotesForm() {
  const { addProducerLog } = React.useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: { notes: '' },
  });

  const onSubmit = (data: LogFormValues) => {
    startTransition(() => {
      addProducerLog({
        date: new Date().toISOString(),
        notes: data.notes,
      });

      toast({
        title: "¡Nota Guardada!",
        description: "Su observación ha sido registrada en la bitácora.",
      });

      form.reset();
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Observaciones Personales</CardTitle>
        <CardDescription>Anote problemas, decisiones, ideas o recomendaciones para el futuro.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas del Día</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. 'Revisar el sistema de riego del sector B, parece haber una fuga. Llamar al técnico mañana. Considerar probar la nueva variedad para la próxima temporada...'"
                      className="resize-y min-h-[120px]"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
              <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Nota'}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
