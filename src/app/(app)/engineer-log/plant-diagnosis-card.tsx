
'use client';

import React, { useState, useTransition, useContext, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, BrainCircuit, Upload, FlaskConical, AlertTriangle, CheckCircle2, ShieldAlert, Info } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { diagnosePlant, type DiagnosePlantOutput } from '@/ai/flows/diagnose-plant-health';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AppDataContext } from '@/context/app-data-context.tsx';

const DiagnosisRequestSchema = z.object({
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  image: z.any().refine(file => file.length > 0, "Se requiere una imagen."),
  batchId: z.string().min(1, "Debe seleccionar un lote."),
});

type DiagnosisRequestValues = z.infer<typeof DiagnosisRequestSchema>;

const CorrectionSchema = z.object({
    correctedDiagnosis: z.string().min(3, 'El diagnóstico es requerido.'),
    correctionNotes: z.string().optional(),
});

export function PlantDiagnosisCard() {
  const { batches, addDiagnosisLog } = useContext(AppDataContext);
  const [isPending, startTransition] = useTransition();
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantOutput | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<DiagnosisRequestValues>({
    resolver: zodResolver(DiagnosisRequestSchema),
    defaultValues: {
      description: '',
      batchId: '',
    },
  });

  const correctionForm = useForm<z.infer<typeof CorrectionSchema>>({
    resolver: zodResolver(CorrectionSchema),
  });

  const availableDiagnoses = useMemo(() => {
    if (!diagnosisResult) return [];
    const names = diagnosisResult.posiblesDiagnosticos.map(d => d.nombre);
    return [...new Set(names)];
  }, [diagnosisResult]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ 
          title: "Imagen muy grande", 
          description: "La imagen excede el límite de 5MB. Por favor, suba una imagen más pequeña.", 
          variant: "destructive" 
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (values: DiagnosisRequestValues) => {
    if (!previewImage) {
      toast({
        title: "Error de Imagen",
        description: "Por favor, seleccione una imagen para analizar.",
        variant: "destructive",
      });
      return;
    }
    
    setDiagnosisResult(null);
    startTransition(async () => {
      try {
        const result = await diagnosePlant({
          photoDataUri: previewImage,
          description: values.description,
        });

        if (result) {
          setDiagnosisResult(result);
          toast({
            title: "Análisis Completo",
            description: "La IA ha procesado la imagen y la descripción.",
          });
        } else {
          throw new Error("El resultado del diagnóstico está vacío.");
        }
      } catch (error) {
        console.error("Error generating diagnosis:", error);
        toast({
          title: "Error de IA",
          description: "No se pudo generar el diagnóstico. Intente de nuevo.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleValidation = () => {
    if (!diagnosisResult) return;

    addDiagnosisLog({
      date: new Date().toISOString(),
      batchId: form.getValues('batchId'),
      result: diagnosisResult,
    });

    toast({
      title: "Diagnóstico Guardado",
      description: `Se ha registrado el diagnóstico en el historial.`,
    });

    // Reset state
    setDiagnosisResult(null);
    setPreviewImage(null);
    form.reset();
  };
  
  const onCorrectionSubmit = (values: z.infer<typeof CorrectionSchema>) => {
    if (!diagnosisResult) return;

    addDiagnosisLog({
      date: new Date().toISOString(),
      batchId: form.getValues('batchId'),
      result: diagnosisResult,
      userCorrection: `${values.correctedDiagnosis}${values.correctionNotes ? `: ${values.correctionNotes}` : ''}`,
    });

    toast({
      title: "Diagnóstico Guardado",
      description: `Se ha registrado la corrección en el historial.`,
    });

    // Reset state
    setIsCorrectionOpen(false);
    setDiagnosisResult(null);
    setPreviewImage(null);
    form.reset();
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Diagnóstico de Plantas con IA</CardTitle>
          <CardDescription>Suba una imagen de una planta o fruto, seleccione el lote y describa el problema para obtener un análisis.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen de la Planta/Fruto</FormLabel>
                      <FormControl>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                {previewImage ? (
                                    <Image src={previewImage} alt="Vista previa de la planta" width={180} height={180} className="object-contain h-full w-full p-2" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haga clic para subir</span> o arrastre aquí</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (MAX. 1MB)</p>
                                    </div>
                                )}
                            </label>
                        </div>
                      </FormControl>
                      <Input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={(e) => { field.onChange(e.target.files); handleImageChange(e); }} disabled={isPending} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="space-y-4">
                     <FormField
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lote Afectado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un lote" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {batches.map(b => (
                                  <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción del Problema</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Ej: Hojas amarillentas con manchas marrones..." {...field} disabled={isPending} className="h-28" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-6">
              <Button type="submit" disabled={isPending}>
                {isPending ? <><BrainCircuit className="mr-2 h-4 w-4 animate-spin" /> Analizando...</> : "Analizar con IA"}
              </Button>
              
              {isPending && (
                  <div className="w-full space-y-4">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-20 w-full" />
                  </div>
              )}

              {diagnosisResult && (
                <Card className={`w-full border-2 ${
                  diagnosisResult.nivelDeConfianza === 'alto' ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                  diagnosisResult.nivelDeConfianza === 'medio' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
                  'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span>Resultado del Diagnóstico</span>
                                {diagnosisResult.nivelDeConfianza === 'alto' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                 diagnosisResult.nivelDeConfianza === 'medio' ? <AlertTriangle className="h-4 w-4 text-blue-600" /> :
                                 <ShieldAlert className="h-4 w-4 text-yellow-600" />}
                            </CardTitle>
                            <CardDescription>
                                Confianza del análisis: 
                                <Badge variant="secondary" className={`ml-2 capitalize ${
                                    diagnosisResult.nivelDeConfianza === 'alto' ? 'bg-green-100 text-green-700' :
                                    diagnosisResult.nivelDeConfianza === 'medio' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {diagnosisResult.nivelDeConfianza}
                                </Badge>
                            </CardDescription>
                        </div>
                        <Badge variant="default" className="text-sm px-3 py-1">{diagnosisResult.diagnosticoPrincipal}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      {diagnosisResult.mensajeIA && (
                          <div className="p-3 rounded-md bg-yellow-100/50 border border-yellow-200 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200 flex gap-2 items-start">
                              <Info className="h-4 w-4 mt-0.5" />
                              <p className="flex-1 italic">{diagnosisResult.mensajeIA}</p>
                          </div>
                      )}

                      <div className="space-y-4">
                        {diagnosisResult.posiblesDiagnosticos.map((diag) => (
                            <div key={diag.nombre} className="bg-background/40 p-3 rounded-lg border border-border/40">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-sm">{diag.nombre}</p>
                                    <p className="text-xs font-bold text-muted-foreground">{diag.probabilidad}%</p>
                                </div>
                                <Progress value={diag.probabilidad} className="h-1.5" indicatorClassName={diag.probabilidad > 70 ? 'bg-destructive' : diag.probabilidad > 40 ? 'bg-yellow-500' : 'bg-primary'} />
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{diag.descripcion}</p>
                            </div>
                        ))}
                      </div>

                      <Alert className="bg-primary/5 border-primary/20">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary font-bold">Recomendación de Experto</AlertTitle>
                        <AlertDescription className="text-sm mt-1">{diagnosisResult.recomendacionGeneral}</AlertDescription>
                      </Alert>
                  </CardContent>
                   <CardFooter className="flex justify-end gap-2 border-t pt-4 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setIsCorrectionOpen(true)}>Corregir</Button>
                        <Button size="sm" onClick={handleValidation}>Validar y Guardar</Button>
                   </CardFooter>
                </Card>
              )}

            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Dialog open={isCorrectionOpen} onOpenChange={setIsCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir Diagnóstico</DialogTitle>
            <DialogDescription>Seleccione el diagnóstico correcto y añada notas si es necesario. Esto ayuda a mejorar la IA.</DialogDescription>
          </DialogHeader>
          <Form {...correctionForm}>
            <form onSubmit={correctionForm.handleSubmit(onCorrectionSubmit)} className="space-y-4">
              <FormField
                control={correctionForm.control}
                name="correctedDiagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico Correcto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el diagnóstico correcto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableDiagnoses.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        <SelectItem value="Otro">Otro (especificar en notas)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={correctionForm.control}
                name="correctionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas de Corrección (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Es Oídio, pero en una etapa muy temprana." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Guardar Corrección</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
