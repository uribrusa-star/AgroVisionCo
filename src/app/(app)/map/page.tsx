
'use client';
import React, { useContext, useMemo, useState, useTransition, useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, BrainCircuit, Map as MapIcon, Sparkles, Milestone, Save } from 'lucide-react';

import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { AppDataContext } from "@/context/app-data-context.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateWeatherAlerts } from "@/ai/flows/generate-weather-alerts";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AgronomistLog } from "@/lib/types";

const MapComponent = dynamic(() => import('@/components/map'), { ssr: false });

const WindyMapEmbed = ({ lat, lng }: { lat: number, lng: number }) => {
  const windyUrl = `https://embed.windy.com/embed.html?lat=${lat}&lon=${lng}&zoom=12&overlay=wind&product=ecmwf&menu_panels=wind,rain,temp&metricWind=default&metricTemp=default`;

  return (
    <iframe
      width="100%"
      height="100%"
      src={windyUrl}
      frameBorder="0"
      title="Windy Map"
    ></iframe>
  );
};

const AlertSchema = z.object({
    risk: z.string(),
    recommendation: z.string(),
    urgency: z.enum(['Alta', 'Media', 'Baja']),
});

type Alert = z.infer<typeof AlertSchema>;

const WeatherAlertsSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

const AIAlertsPanel = ({ 
    mapCenter, 
    onCoordsChange 
}: { 
    mapCenter: { lat: number, lng: number }, 
    onCoordsChange: (coords: { lat: number, lng: number }) => void 
}) => {
    const { phenologyLogs, agronomistLogs, addAgronomistLog } = useContext(AppDataContext);
    const [isGenerating, startGeneratingTransition] = useTransition();
    const [isSaving, startSavingTransition] = useTransition();
    const [alerts, setAlerts] = useState<Alert[] | null>(null);
    const [alertsSaved, setAlertsSaved] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof WeatherAlertsSchema>>({
        resolver: zodResolver(WeatherAlertsSchema),
        defaultValues: {
            latitude: mapCenter.lat,
            longitude: mapCenter.lng,
        },
    });

    const watchedCoords = useWatch({
        control: form.control,
        name: ['latitude', 'longitude'],
    });

    useEffect(() => {
        const [lat, lng] = watchedCoords;
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
            onCoordsChange({ lat, lng });
        }
    }, [watchedCoords, onCoordsChange]);

    useEffect(() => {
        form.reset({
            latitude: mapCenter.lat,
            longitude: mapCenter.lng,
        });
    }, [mapCenter, form]);

    const onSubmit = (values: z.infer<typeof WeatherAlertsSchema>) => {
        setAlerts(null);
        setAlertsSaved(false);
        startGeneratingTransition(async () => {
             try {
                const result = await generateWeatherAlerts({
                    latitude: values.latitude,
                    longitude: values.longitude,
                    phenologyLogs: JSON.stringify(phenologyLogs.slice(0, 10)),
                    agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 20)),
                });
                if (result.alerts) {
                    setAlerts(result.alerts);
                    toast({ 
                        title: "Análisis Completo", 
                        description: `Se generaron ${result.alerts.length} alerta(s) climática(s).`
                    });
                } else {
                    setAlerts([]);
                    toast({ title: "Análisis Completo", description: "La IA no identificó riesgos mayores con el pronóstico provisto." });
                }
             } catch (error) {
                 console.error("Error generating alerts:", error);
                 toast({
                    title: "Error de IA",
                    description: "No se pudieron generar las alertas. Intente de nuevo.",
                    variant: "destructive",
                 });
             }
        });
    };

    const handleSaveChanges = () => {
        if (!alerts || alerts.length === 0) return;

        startSavingTransition(() => {
            const logPromises = alerts.map(alert => {
                const newLog: Omit<AgronomistLog, 'id'> = {
                    date: new Date().toISOString(),
                    type: 'Condiciones Ambientales',
                    product: `Alerta IA: ${alert.risk}`,
                    notes: `Recomendación: ${alert.recommendation} (Urgencia: ${alert.urgency})`,
                };
                return addAgronomistLog(newLog);
            });

            Promise.all(logPromises).then(() => {
                toast({
                    title: "Alertas Guardadas",
                    description: "Las alertas climáticas han sido guardadas en la bitácora del agrónomo.",
                });
                setAlertsSaved(true);
            }).catch(error => {
                console.error("Failed to save alerts:", error);
                toast({ title: "Error", description: "No se pudieron guardar las alertas.", variant: "destructive" });
            });
        });
    };

    const getUrgencyBadgeVariant = (urgency: Alert['urgency']) => {
        switch (urgency) {
            case 'Alta': return 'destructive';
            case 'Media': return 'secondary';
            case 'Baja': return 'outline';
            default: return 'default';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Alertas Climáticas con IA
                </CardTitle>
                <CardDescription>
                    Ingrese coordenadas para que la IA busque el clima y genere recomendaciones.
                </CardDescription>
            </CardHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="latitude"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Latitud</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" {...field} placeholder="Ej. -31.953" disabled={isGenerating} />
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
                                <FormLabel>Longitud</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" {...field} placeholder="Ej. -60.934" disabled={isGenerating} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <Button type="submit" disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
                                    Buscando pronóstico y analizando...
                                </>
                            ) : "Generar Alertas"}
                        </Button>

                         {isGenerating && (
                            <div className="w-full space-y-4">
                               <Skeleton className="h-10 w-full" />
                               <Skeleton className="h-10 w-full" />
                            </div>
                        )}

                        {alerts && (
                            <div className="w-full space-y-4">
                                <h3 className="font-semibold">Resultados del Análisis:</h3>
                                {alerts.length === 0 ? (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Sin Novedades</AlertTitle>
                                        <AlertDescription>
                                            No se identificaron riesgos climáticos significativos para los próximos días.
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    alerts.map((alert, index) => (
                                        <Alert key={index} variant={alert.urgency === 'Alta' ? 'destructive' : 'default'}>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle className="flex justify-between items-center">
                                                {alert.risk}
                                                <Badge variant={getUrgencyBadgeVariant(alert.urgency)}>{alert.urgency}</Badge>
                                            </AlertTitle>
                                            <AlertDescription>
                                                {alert.recommendation}
                                            </AlertDescription>
                                        </Alert>
                                    ))
                                )}
                                {alerts.length > 0 && (
                                     <Button onClick={handleSaveChanges} disabled={isSaving || alertsSaved}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSaving ? "Guardando..." : alertsSaved ? "Guardado" : "Guardar Alertas en Bitácora"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}


export default function MapPage() {
  const { establishmentData } = useContext(AppDataContext);
  
  const parsedGeoJson = useMemo(() => {
      try {
          return establishmentData?.geoJsonData ? JSON.parse(establishmentData.geoJsonData) : null;
      } catch {
          return null;
      }
  }, [establishmentData?.geoJsonData]);

  const mapCenter = useMemo(() => {
    if (parsedGeoJson && parsedGeoJson.features && parsedGeoJson.features.length > 0) {
      const firstFeature = parsedGeoJson.features[0];
      if (firstFeature.geometry) {
        if (firstFeature.geometry.type === 'Point') {
          const [lng, lat] = firstFeature.geometry.coordinates;
          return { lat, lng };
        }
        if (firstFeature.geometry.type === 'Polygon') {
          const coords = firstFeature.geometry.coordinates[0];
          if (!coords || coords.length === 0) return { lat: -31.953363, lng: -60.9346299 }; // Fallback
          
          let lat = 0, lng = 0;
          coords.forEach(([coordLng, coordLat]: [number, number]) => {
            lat += coordLat;
            lng += coordLng;
          });
          return { lat: lat / coords.length, lng: lng / coords.length };
        }
      }
    }
    // Fallback to location coordinates or default
    if (establishmentData?.location.coordinates) {
      const [lat, lng] = establishmentData.location.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return { lat: -31.953363, lng: -60.9346299 }; // Default center Coronda
  }, [parsedGeoJson, establishmentData]);
  
  const [windyCoords, setWindyCoords] = useState({ lat: mapCenter.lat, lng: mapCenter.lng });
  
  useEffect(() => {
    setWindyCoords({ lat: mapCenter.lat, lng: mapCenter.lng });
  }, [mapCenter]);

  const resetWindyMap = () => {
    setWindyCoords({ lat: -31.953363, lng: -60.9346299 });
  };


  return (
    <>
      <PageHeader
        title="Mapa del Establecimiento"
        description="Visualice la finca, sus lotes y genere alertas climáticas con IA."
      />
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapIcon className="h-6 w-6 text-primary" />
                    Mapa Interactivo de Lotes
                </CardTitle>
                 <CardDescription>
                    Haga clic en un lote para ver un resumen de sus datos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[600px] w-full rounded-md overflow-hidden z-0 bg-muted">
                   <MapComponent center={mapCenter} geoJsonData={parsedGeoJson} />
                </div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Mapa del Clima
                </CardTitle>
                <CardDescription>
                    Mapa meteorológico proporcionado por Windy.com.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[600px] w-full rounded-md overflow-hidden z-0 bg-muted relative">
                   <WindyMapEmbed lat={windyCoords.lat} lng={windyCoords.lng} />
                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button 
                                variant="outline" 
                                size="icon" 
                                className="absolute top-2 right-2 z-10 bg-background/70 backdrop-blur-sm"
                                onClick={resetWindyMap}
                              >
                                <Milestone className="h-4 w-4" />
                              </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Volver a la ubicación de Coronda</p>
                        </TooltipContent>
                    </Tooltip>
                   </TooltipProvider>
                </div>
            </CardContent>
        </Card>
        <div>
            <AIAlertsPanel mapCenter={mapCenter} onCoordsChange={setWindyCoords} />
        </div>
      </div>
    </>
  );
}
