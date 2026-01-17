
'use client';

import React, { useTransition, useContext } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageWithHint } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';

const LogSchema = z.object({
  omittedActivity: z.string().min(1, "Debe seleccionar una actividad."),
  notes: z.string().min(10, "La razón debe tener al menos 10 caracteres."),
  images: z.array(z.object({
    url: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')),
  })).optional(),
});

type LogFormValues = z.infer<typeof LogSchema>;

export function ActivityOmissionLogForm() {
  const { addProducerLog, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';
  
  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: { 
        omittedActivity: '',
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
            .map(img => ({ url: img.url, hint: 'field problem' }));

      addProducerLog({
        date: new Date().toISOString(),
        notes: data.notes,
        type: 'Actividad Omitida',
        omittedActivity: data.omittedActivity,
        images: imagesWithHints,
      });

      toast({
        title: "¡Registro Guardado!",
        description: "La falta de actividad ha sido registrada en la bitácora del productor.",
      });

      form.reset();
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Falta de Actividad</CardTitle>
        <CardDescription>Anote una labor importante que no se realizó y la razón. El registro aparecerá en la bitácora del productor.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="omittedActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actividad Omitida</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending || !canManage}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione una actividad..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Labores Culturales">Labores Culturales</SelectItem>
                            <SelectItem value="Fertilización">Fertilización</SelectItem>
                            <SelectItem value="Fumigación">Fumigación</SelectItem>
                            <SelectItem value="Riego">Riego</SelectItem>
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón / Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. 'No se pudo regar por corte de energía en la bomba.'"
                      className="resize-y min-h-[100px]"
                      {...field}
                      disabled={isPending || !canManage}
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
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Registro'}</Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
