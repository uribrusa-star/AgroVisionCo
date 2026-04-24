
'use client';

import React, { useContext, useState } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Leaf, Notebook, Weight, AlertTriangle, Activity, Thermometer, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

type MapProps = {
    center: {
        lat: number;
        lng: number;
    };
    geoJsonData?: any;
};

const MapComponent = ({ center, geoJsonData }: MapProps) => {
    const isOnline = useOnlineStatus();
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });
    
    const { harvests, agronomistLogs, phenologyLogs } = useContext(AppDataContext);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);

    const getHotspotColor = (type: string) => {
        if (type.includes('Plaga')) return "#EF4444"; // Red
        if (type.includes('Enfermedad')) return "#F97316"; // Orange
        if (type.includes('Deficiencia')) return "#EAB308"; // Yellow
        if (type.includes('Exceso')) return "#A855F7"; // Purple
        return "#3B82F6"; // Blue default
    };

    const renderPolygons = () => {
        if (!geoJsonData || !geoJsonData.features) return null;

        return geoJsonData.features
            .filter((feature: any) => feature.geometry && feature.geometry.type === 'Polygon')
            .map((feature: any, index: number) => {
                const paths = feature.geometry.coordinates[0].map((coord: [number, number]) => ({
                    lat: coord[1],
                    lng: coord[0],
                }));
                
                const properties = feature.properties || {};
                const polygonId = Object.keys(properties).find(k => k.startsWith('L')) || `polygon-${index}`;


                return (
                    <Polygon
                        key={polygonId}
                        paths={paths}
                        options={{
                            fillColor: "#4A90E2",
                            fillOpacity: 0.15,
                            strokeColor: "#4A90E2",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                        }}
                        onClick={() => setActiveInfoWindow(polygonId)}
                    />
                );
            });
    };

    const renderHealthHotspots = () => {
        return agronomistLogs
            .filter(log => log.type === 'Sanidad' && log.latitude && log.longitude)
            .map((log, index) => {
                const color = getHotspotColor(log.product || '');
                return (
                    <Circle
                        key={`hotspot-${log.id || index}`}
                        center={{ lat: log.latitude!, lng: log.longitude! }}
                        radius={4}
                        options={{
                            fillColor: color,
                            fillOpacity: 0.6,
                            strokeColor: color,
                            strokeOpacity: 1,
                            strokeWeight: 2,
                        }}
                        onClick={() => setActiveInfoWindow(`hotspot-${log.id || index}`)}
                    />
                );
            });
    };
    
    const renderInfoWindows = () => {
        if (!activeInfoWindow) return null;

        // Case 1: Hotspot InfoWindow
        if (activeInfoWindow.startsWith('hotspot-')) {
            const logId = activeInfoWindow.replace('hotspot-', '');
            const log = agronomistLogs.find(l => (l.id === logId) || (`${agronomistLogs.indexOf(l)}` === logId));
            
            if (!log || !log.latitude || !log.longitude) return null;

            return (
                <InfoWindow
                    position={{ lat: log.latitude, lng: log.longitude }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                >
                    <div className="p-2 max-w-[240px] text-foreground">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-1 rounded bg-destructive/10 text-destructive">
                                <AlertTriangle className="h-4 w-4" />
                             </div>
                             <h4 className="font-bold text-sm">Alerta Sanitaria</h4>
                        </div>
                        <div className="space-y-2">
                            <p className="font-bold text-xs uppercase text-muted-foreground">Observación</p>
                            <p className="text-sm font-semibold">{log.product}</p>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Fecha</p>
                                    <p className="text-xs">{format(new Date(log.date), "dd/MM/yyyy")}</p>
                                </div>
                                {log.batchId && (
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Lote</p>
                                        <p className="text-xs">{log.batchId}</p>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs bg-muted p-2 rounded italic">
                                "{log.notes}"
                            </p>
                        </div>
                    </div>
                </InfoWindow>
            );
        }

        // Case 2: Lot (Polygon) InfoWindow
        if (!geoJsonData || !geoJsonData.features) return null;

        const activeFeature = geoJsonData.features.find((feature: any) => {
             const properties = feature.properties || {};
             const polygonId = Object.keys(properties).find(k => k.startsWith('L'));
             return polygonId === activeInfoWindow;
        });

        if (!activeFeature || activeFeature.geometry.type !== 'Polygon') return null;

        const paths = activeFeature.geometry.coordinates[0].map((coord: [number, number]) => ({
            lat: coord[1],
            lng: coord[0],
        }));

        const centerOfPolygon = paths.reduce(
            (acc: { lat: number, lng: number }, curr: { lat: number, lng: number }) => {
                return { lat: acc.lat + curr.lat, lng: acc.lng + curr.lng };
            }, { lat: 0, lng: 0 }
        );
        centerOfPolygon.lat /= paths.length;
        centerOfPolygon.lng /= paths.length;

        const lotHarvests = harvests.filter(h => h.batchNumber === activeInfoWindow);
        const lotAgronomistLogs = agronomistLogs.filter(l => !l.batchId || l.batchId === activeInfoWindow);
        const lotPhenologyLogs = phenologyLogs.filter(p => !p.batchId || p.batchId === activeInfoWindow);
        const totalKilos = lotHarvests.reduce((sum, h) => sum + h.kilograms, 0);

        return (
             <InfoWindow
                position={centerOfPolygon}
                onCloseClick={() => setActiveInfoWindow(null)}
            >
                <div className="p-1 max-w-xs text-foreground">
                    <h4 className="font-bold text-base mb-2">Lote: {activeInfoWindow}</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-full">
                          <Weight className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">{totalKilos.toLocaleString('es-ES')} kg</p>
                            <p className="text-xs text-muted-foreground">{lotHarvests.length} cosechas</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-full">
                          <Leaf className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">{lotAgronomistLogs.length}</p>
                            <p className="text-xs text-muted-foreground">Actividades Agronómicas</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-full">
                            <Notebook className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">{lotPhenologyLogs.length}</p>
                            <p className="text-xs text-muted-foreground">Registros Fenológicos</p>
                        </div>
                      </div>
                    </div>
                </div>
            </InfoWindow>
        )
    }

    const renderMarkers = () => {
         if (!geoJsonData || !geoJsonData.features) return null;

         return geoJsonData.features
            .filter((feature: any) => feature.geometry && feature.geometry.type === 'Point')
            .map((feature: any, index: number) => {
                const [lng, lat] = feature.geometry.coordinates;
                const title = feature.properties?.name || `Punto de interés ${index + 1}`;
                
                 return (
                    <Marker
                        key={`marker-${index}`}
                        position={{ lat, lng }}
                        title={title}
                    />
                 );
            });
    }

    if (loadError) {
        return <div>Error al cargar el mapa. Verifique la clave de API.</div>;
    }

    if (!isLoaded) {
        return <div>Cargando mapa...</div>;
    }

    return (
        <GoogleMap
            mapContainerStyle={{
                width: '100%',
                height: '100%',
            }}
            center={center}
            zoom={17}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                mapTypeId: 'satellite',
                geolocation: false,
            }}
        >
            {renderPolygons()}
            {renderInfoWindows()}
            {renderMarkers()}
            {renderHealthHotspots()}

            {!isOnline && (
                <div className="absolute inset-x-0 bottom-12 flex justify-center z-[100] pointer-events-none">
                    <div className="bg-background/95 backdrop-blur-md border border-border shadow-2xl px-6 py-4 rounded-2xl flex flex-col items-center gap-2 max-w-[280px] pointer-events-auto">
                        <div className="bg-destructive/10 p-2 rounded-full text-destructive">
                            <WifiOff className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm">Modo Offline</h3>
                            <p className="text-[10px] text-muted-foreground">La capa satelital puede no cargar. Los datos de lotes y hotspots guardados localmente siguen visibles.</p>
                        </div>
                    </div>
                </div>
            )}
        </GoogleMap>
    );
};

export default MapComponent;
