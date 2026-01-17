
'use client';

import React, { useContext, useState, useTransition } from 'react';
import { Sparkles, BrainCircuit, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { recommendApplications } from '@/ai/flows/recommend-applications';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const RecommendationSchema = z.object({
    recommendation: z.string(),
    reason: z.string(),
    urgency: z.enum(['Alta', 'Media', 'Baja']),
    suggestedProducts: z.array(z.string()),
});

type Recommendation = z.infer<typeof RecommendationSchema>;

export function ApplicationRecommendation() {
    const { supplies, agronomistLogs, phenologyLogs, establishmentData } = useContext(AppDataContext);
    const [isPending, startTransition] = useTransition();
    const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
    const { toast } = useToast();

    const handleGenerate = () => {
        if (!establishmentData) {
            toast({ title: "Error", description: "No se pueden cargar los datos del establecimiento para obtener la ubicación.", variant: "destructive" });
            return;
        }

        setRecommendations(null);
        startTransition(async () => {
            try {
                const [lat, lng] = establishmentData.location.coordinates.split(',').map(s => parseFloat(s.trim()));

                if (isNaN(lat) || isNaN(lng)) {
                    toast({ title: "Error", description: "Las coordenadas del establecimiento no son válidas.", variant: "destructive" });
                    return;
                }

                const result = await recommendApplications({
                    latitude: lat,
                    longitude: lng,
                    supplies: JSON.stringify(supplies.map(s => ({ name: s.name, type: s.type, composition: s.info.activeIngredient }))),
                    agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 20)),
                    phenologyLogs: JSON.stringify(phenologyLogs.slice(0, 10)),
                });

                if (result.recommendations && result.recommendations.length > 0) {
                    setRecommendations(result.recommendations);
                    toast({
                        title: "Análisis Completo",
                        description: "Se generaron nuevas recomendaciones basadas en los datos actuales."
                    });
                } else {
                    setRecommendations([]); // Set to empty array to show "no recommendations" message
                    toast({ title: "Análisis Completo", description: "La IA no identificó la necesidad de nuevas aplicaciones por el momento." });
                }
            } catch (error) {
                console.error("Error generating recommendations:", error);
                toast({
                    title: "Error de IA",
                    description: "No se pudieron generar las recomendaciones. Intente de nuevo.",
                    variant: "destructive",
                });
            }
        });
    }

    const getUrgencyInfo = (urgency: Recommendation['urgency']) => {
        switch (urgency) {
            case 'Alta': return { variant: 'destructive', icon: AlertCircle, label: 'Urgencia Alta' };
            case 'Media': return { variant: 'secondary', icon: Info, label: 'Urgencia Media' };
            case 'Baja': return { variant: 'outline', icon: CheckCircle, label: 'Urgencia Baja' };
            default: return { variant: 'default', icon: Info, label: 'Recomendación' };
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Recomendación de Aplicaciones
                </CardTitle>
                <CardDescription>
                    La IA analizará el estado del cultivo, el clima y los insumos para sugerir las próximas labores.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isPending && (
                    <div className="w-full space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                )}
                {!isPending && recommendations && (
                    <div className="w-full space-y-4">
                        {recommendations.length === 0 ? (
                           <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Todo en Orden</AlertTitle>
                                <AlertDescription>
                                    Según el análisis, no se requieren acciones inmediatas. Mantenga el monitoreo regular.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            recommendations.map((rec, index) => {
                                const { variant, icon: Icon, label } = getUrgencyInfo(rec.urgency);
                                return (
                                    <Alert key={index} variant={rec.urgency === 'Alta' ? 'destructive' : 'default'}>
                                        <Icon className="h-4 w-4" />
                                        <AlertTitle className="flex justify-between items-center">
                                            {rec.recommendation}
                                            <Badge variant={variant}>{label}</Badge>
                                        </AlertTitle>
                                        <AlertDescription>
                                            <p className="font-semibold mt-2">Justificación:</p>
                                            <p>{rec.reason}</p>
                                            {rec.suggestedProducts.length > 0 && (
                                                <>
                                                    <p className="font-semibold mt-2">Insumos Sugeridos:</p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {rec.suggestedProducts.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
                                                    </div>
                                                </>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                );
                            })
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleGenerate} disabled={isPending}>
                    {isPending ? (
                        <>
                            <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
                            Analizando...
                        </>
                    ) : "Generar Recomendaciones"}
                </Button>
            </CardFooter>
        </Card>
    );
}
