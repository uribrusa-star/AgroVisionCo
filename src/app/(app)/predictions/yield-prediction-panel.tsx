
'use client';

import React, { useContext, useState, useTransition, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Sparkles, BrainCircuit, BarChart, Weight, History } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { predictYield } from '@/ai/flows/predict-yield';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { AgronomistLog, PhenologyLog } from '@/lib/types';

const PredictionRequestSchema = z.object({
  batchId: z.string().min(1, "Debe seleccionar un lote."),
});

type PredictionRequestValues = z.infer<typeof PredictionRequestSchema>;

type PredictionResult = {
  prediction: string;
  confidence: 'Alta' | 'Media' | 'Baja';
}

export function YieldPredictionPanel() {
  const { batches, harvests, agronomistLogs, phenologyLogs, loading: dataLoading, establishmentData, addPredictionLog } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const harvestedBatches = useMemo(() => {
    const harvestedBatchIds = new Set(harvests.map(h => h.batchNumber));
    return batches.filter(b => harvestedBatchIds.has(b.id));
  }, [batches, harvests]);
  
  const selectedBatchStats = useMemo(() => {
    if (!selectedBatchId) return null;
    
    const batchHarvests = harvests.filter(h => h.batchNumber === selectedBatchId);
    if(batchHarvests.length === 0) return null;

    const totalKilos = batchHarvests.reduce((sum, h) => sum + h.kilograms, 0);
    const averageYield = totalKilos / batchHarvests.length;

    const allLogs: (AgronomistLog | PhenologyLog)[] = [...agronomistLogs, ...phenologyLogs];
    const latestLog = allLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];


    return {
        totalKilos,
        averageYield,
        harvestCount: batchHarvests.length,
        latestLog: latestLog ? { 
            date: new Date(latestLog.date).toLocaleDateString('es-ES'),
            description: 'type' in latestLog ? `${latestLog.type}: ${latestLog.product || latestLog.notes}` : `${latestLog.developmentState}: ${latestLog.notes}`
        } : null,
    }
  }, [selectedBatchId, harvests, agronomistLogs, phenologyLogs]);

  const form = useForm<PredictionRequestValues>({
    resolver: zodResolver(PredictionRequestSchema),
    defaultValues: {
      batchId: '',
    },
  });

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    form.setValue('batchId', batchId);
    setPredictionResult(null);
  }

  const onSubmit = (values: PredictionRequestValues) => {
    if (!establishmentData) {
        toast({ title: "Error", description: "No se pudieron cargar los datos del establecimiento para obtener la ubicación.", variant: "destructive"});
        return;
    }

    setPredictionResult(null);
    startTransition(async () => {
      try {
        const [lat, lng] = establishmentData.location.coordinates.split(',').map(s => parseFloat(s.trim()));
        
        if (isNaN(lat) || isNaN(lng)) {
            toast({ title: "Error", description: "Las coordenadas del establecimiento no son válidas.", variant: "destructive"});
            return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentHarvests = harvests.filter(h => h.batchNumber === values.batchId && new Date(h.date) > thirtyDaysAgo);
        
        const recentAgronomistLogs = agronomistLogs.filter(log => 
            (log.batchId === values.batchId || !log.batchId) && new Date(log.date) > thirtyDaysAgo
        );
        const recentPhenologyLogs = phenologyLogs.filter(log => 
            (log.batchId === values.batchId || !log.batchId) && new Date(log.date) > thirtyDaysAgo
        );

        const recentEnvironmentalLogs = agronomistLogs.filter(log => log.type === 'Condiciones Ambientales' && new Date(log.date) > thirtyDaysAgo);

        if (recentHarvests.length === 0) {
            toast({
                title: "Datos Insuficientes",
                description: "No hay cosechas recientes para este lote. La predicción podría no ser precisa.",
                variant: 'destructive'
            });
            return;
        }

        const result = await predictYield({
          batchId: values.batchId,
          latitude: lat,
          longitude: lng,
          recentHarvests: JSON.stringify(recentHarvests),
          agronomistLogs: JSON.stringify(recentAgronomistLogs),
          phenologyLogs: JSON.stringify(recentPhenologyLogs),
          environmentalLogs: JSON.stringify(recentEnvironmentalLogs),
        });

        setPredictionResult(result);
        addPredictionLog({
            date: new Date().toISOString(),
            batchId: values.batchId,
            prediction: result.prediction,
            confidence: result.confidence,
        });

      } catch (error) {
        console.error("Error generating prediction:", error);
        toast({
          title: 'Error de IA',
          description: 'No se pudo generar la predicción. Por favor, intente de nuevo.',
          variant: 'destructive',
        });
      }
    });
  };

  const getConfidenceBadgeVariant = (confidence: PredictionResult['confidence']) => {
    switch (confidence) {
        case 'Alta': return 'default';
        case 'Media': return 'secondary';
        case 'Baja': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generar Nueva Predicción</CardTitle>
        <CardDescription>Seleccione un lote para que la IA busque el clima y genere una proyección de rendimiento.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="batchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seleccionar Lote</FormLabel>
                  <Select onValueChange={handleBatchChange} value={field.value} disabled={isPending || dataLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un lote cosechado..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {harvestedBatches.length > 0 ? (
                        harvestedBatches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No hay lotes con cosechas registradas</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedBatchStats && (
                <Card>
                    <CardHeader>
                        <CardTitle>Radiografía del Lote: {selectedBatchId}</CardTitle>
                        <CardDescription>Resumen de los datos históricos clave para este lote.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Weight className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{selectedBatchStats.totalKilos.toLocaleString('es-ES')} kg</p>
                                <p className="text-muted-foreground">Producción Total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <BarChart className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{selectedBatchStats.averageYield.toFixed(1)} kg/cosecha</p>
                                <p className="text-muted-foreground">Rendimiento Promedio</p>
                            </div>
                        </div>
                         {selectedBatchStats.latestLog && (
                            <div className="flex items-start gap-3 md:col-span-3">
                                <History className="h-6 w-6 text-primary flex-shrink-0" />
                                <div>
                                    <p className="font-semibold" title={selectedBatchStats.latestLog.description}>{selectedBatchStats.latestLog.description}</p>
                                    <p className="text-muted-foreground">Última Actividad ({selectedBatchStats.latestLog.date})</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-6">
            <Button type="submit" disabled={isPending || dataLoading || !selectedBatchId}>
              {isPending ? (
                <>
                  <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
                  Analizando Datos...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Predicción
                </>
              )}
            </Button>
            
            {isPending && (
                <div className="w-full space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            )}

            {predictionResult && (
              <Card className="w-full bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Proyección de IA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-semibold text-foreground">
                    {predictionResult.prediction}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Nivel de Confianza:</span>
                    <Badge variant={getConfidenceBadgeVariant(predictionResult.confidence)}>
                      {predictionResult.confidence}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
