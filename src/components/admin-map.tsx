'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import type { EstablishmentData, DiagnosisLog } from '@/lib/types';
import { Building, MapPin, Activity, Sprout, Layers, Bug, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type AdminMapProps = {
    establishments: EstablishmentData[];
    pestLogs?: DiagnosisLog[];
};

const libraries: ("drawing" | "geometry")[] = ["geometry"];

export function AdminMap({ establishments, pestLogs = [] }: AdminMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
    const [mapMode, setMapMode] = useState<'pins' | 'heatmap' | 'pests'>('pins');

    const pestHotspots = React.useMemo(() => {
        if (!pestLogs || pestLogs.length === 0) return [];
        
        const grouped = pestLogs.reduce((acc, log) => {
            const estId = log.establishmentId;
            if (!estId) return acc;
            if (!acc[estId]) {
                acc[estId] = { count: 0, pests: new Set<string>(), highestProb: 0 };
            }
            acc[estId].count += 1;
            acc[estId].pests.add(log.result.diagnosticoPrincipal);
            
            const prob = log.result.posiblesDiagnosticos?.[0]?.probabilidad || 0;
            if (prob > acc[estId].highestProb) {
                acc[estId].highestProb = prob;
            }
            return acc;
        }, {} as Record<string, { count: number, pests: Set<string>, highestProb: number }>);
        
        return Object.entries(grouped).map(([estId, data]) => {
            const est = establishments.find(e => e.id === estId);
            if (!est || !est.location?.coordinates) return null;
            
            const [lat, lng] = est.location.coordinates.split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const severity = (data.highestProb > 70 || data.count > 2) ? 'Alta' : 'Media';
            // Derive radius from the establishment's actual productive area so the
            // circle covers roughly the same footprint as the field.
            const areaSqM = (est.area?.strawberry || est.area?.total || 1) * 10000;
            const radius = Math.max(60, Math.round(Math.sqrt(areaSqM / Math.PI)));
            
            return {
                id: `pest-${estId}`,
                lat,
                lng,
                radius,
                pest: Array.from(data.pests).join(', '),
                count: data.count, // In this real data context, count is "Number of Reports"
                severity
            };
        }).filter(Boolean) as { id: string, lat: number, lng: number, radius: number, pest: string, count: number, severity: string }[];
    }, [pestLogs, establishments]);

    const fitMapToBounds = React.useCallback(() => {
        if (!mapInstance || establishments.length === 0) return;

        let hasBounds = false;
        const bounds = new window.google.maps.LatLngBounds();

        establishments.forEach((est) => {
            if (est.location && est.location.coordinates) {
                const [lat, lng] = est.location.coordinates.split(',').map(s => parseFloat(s.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    bounds.extend({ lat, lng });
                    hasBounds = true;
                }
            }
        });

        if (hasBounds) {
            mapInstance.fitBounds(bounds);
        }
    }, [establishments, mapInstance]);

    const heatmapData = React.useMemo(() => {
        return establishments.map(est => {
            if (!est.location || !est.location.coordinates) return null;
            const [lat, lng] = est.location.coordinates.split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            return {
                lat,
                lng,
                weight: est.area?.strawberry || 1
            };
        }).filter(Boolean) as { lat: number, lng: number, weight: number }[];
    }, [establishments]);

    useEffect(() => {
        fitMapToBounds();
    }, [fitMapToBounds]);

    if (loadError) return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">Error cargando Google Maps. Verifique su API Key o conexión de red.</div>;
    if (!isLoaded) return <div className="p-4 text-center text-muted-foreground animate-pulse bg-muted/20 rounded-lg">Cargando motor geoespacial...</div>;

    const defaultCenter = { lat: -31.970220, lng: -60.916853 }; // Coronda default

    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-lg shadow-md border border-stone-200 dark:border-stone-800 p-1 flex gap-1">
                <button 
                    onClick={() => setMapMode('pins')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'pins' ? 'bg-[#2d4a22] text-white' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Building className="h-3.5 w-3.5" /> Establecimientos
                </button>
                <button 
                    onClick={() => setMapMode('heatmap')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'heatmap' ? 'bg-[#2d4a22] text-white' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Layers className="h-3.5 w-3.5" /> Calor
                </button>
                <button 
                    onClick={() => setMapMode('pests')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'pests' ? 'bg-[#2d4a22] text-white' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Bug className="h-3.5 w-3.5" /> Radar Plagas
                </button>
            </div>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '0.75rem' }}
                center={defaultCenter}
                zoom={8}
                onLoad={setMapInstance}
                onUnmount={() => setMapInstance(null)}
                options={{
                    mapTypeId: 'satellite',
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                }}
                onClick={() => setActiveInfoWindow(null)}
            >
                {mapMode === 'heatmap' && heatmapData.map((data, idx) => (
                    <Circle
                        key={`heat-${idx}`}
                        center={{ lat: data.lat, lng: data.lng }}
                        radius={Math.max(60, Math.round(Math.sqrt((data.weight * 10000) / Math.PI)))}
                        options={{
                            fillColor: '#ef4444',
                            fillOpacity: Math.min(0.2 + (data.weight / 30), 0.75),
                            strokeColor: '#ef4444',
                            strokeOpacity: 0.5,
                            strokeWeight: 1,
                            clickable: false
                        }}
                    />
                ))}

                {mapMode === 'pests' && pestHotspots.map((hotspot) => (
                    <React.Fragment key={hotspot.id}>
                        <Circle
                            center={{ lat: hotspot.lat, lng: hotspot.lng }}
                            radius={hotspot.radius}
                            options={{
                                fillColor: hotspot.severity === 'Alta' ? '#EF4444' : '#F59E0B',
                                fillOpacity: 0.35,
                                strokeColor: hotspot.severity === 'Alta' ? '#DC2626' : '#D97706',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                            }}
                            onClick={() => setActiveInfoWindow(hotspot.id)}
                        />
                        <Marker 
                            position={{ lat: hotspot.lat, lng: hotspot.lng }} 
                            icon={{
                                url: `https://maps.google.com/mapfiles/ms/icons/${hotspot.severity === 'Alta' ? 'red' : 'yellow'}-dot.png`
                            }}
                            onClick={() => setActiveInfoWindow(hotspot.id)}
                        />
                        {activeInfoWindow === hotspot.id && (
                            <InfoWindow position={{ lat: hotspot.lat, lng: hotspot.lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                <div className="p-2 max-w-[200px] text-stone-900">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bug className={`h-4 w-4 ${hotspot.severity === 'Alta' ? 'text-red-600' : 'text-amber-600'}`} />
                                        <h3 className="font-bold text-sm text-stone-900">Alerta Fitosanitaria</h3>
                                    </div>
                                    <p className="text-xs text-stone-700 mb-1">
                                        <strong className="text-stone-900">Plaga:</strong> {hotspot.pest}
                                    </p>
                                    <p className="text-xs text-stone-700 mb-2">
                                        <strong className="text-stone-900">Reportes en lote:</strong> {hotspot.count}
                                    </p>
                                    <Badge variant={hotspot.severity === 'Alta' ? "destructive" : "default"} className="text-[10px]">
                                        Gravedad {hotspot.severity}
                                    </Badge>
                                </div>
                            </InfoWindow>
                        )}
                    </React.Fragment>
                ))}

                {mapMode === 'pins' && establishments.map((est) => {
                    if (!est.location || !est.location.coordinates) return null;
                    const [lat, lng] = est.location.coordinates.split(',').map(s => parseFloat(s.trim()));
                    if (isNaN(lat) || isNaN(lng)) return null;

                    const isActive = est.isActive !== false;
                    const markerColor = isActive ? (est.hasGoodPracticesSeal ? 'green' : 'blue') : 'red';
                    const iconUrl = `https://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`;

                    return (
                        <Marker
                            key={est.id}
                            position={{ lat, lng }}
                            icon={iconUrl}
                            onClick={() => setActiveInfoWindow(est.id)}
                        >
                            {activeInfoWindow === est.id && (
                                <InfoWindow position={{ lat, lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                    <div className="p-1 max-w-[250px] text-stone-900">
                                        <h3 className="font-bold text-sm mb-1 text-stone-900">{est.producer}</h3>
                                        <div className="flex items-center gap-1 text-xs text-stone-600 mb-2">
                                            <MapPin className="h-3 w-3 text-stone-500" />
                                            <span className="truncate text-stone-700">{est.location.locality}, {est.location.province}</span>
                                        </div>
                                        
                                        <div className="space-y-1 mb-3 text-stone-800">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="text-stone-800"><strong className="text-stone-900">{est.area?.strawberry || 0} ha</strong> Frutilla</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Building className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-stone-800">{est.system || 'N/A'}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {isActive ? 'Activo' : 'Suspendido'}
                                            </span>
                                            {est.hasGoodPracticesSeal && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 flex items-center gap-0.5">
                                                    <ShieldCheck className="h-3 w-3" /> Sello BPA
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </Marker>
                    );
                })}
            </GoogleMap>
        </div>
    );
}
