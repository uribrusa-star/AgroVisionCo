'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, HeatmapLayer, Circle } from '@react-google-maps/api';
import type { EstablishmentData } from '@/lib/types';
import { Building, MapPin, Activity, Sprout, Layers, Bug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type AdminMapProps = {
    establishments: EstablishmentData[];
};

const libraries: ("drawing" | "geometry" | "visualization")[] = ["geometry", "visualization"];

export function AdminMap({ establishments }: AdminMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
    const [mapMode, setMapMode] = useState<'pins' | 'heatmap' | 'pests'>('pins');

    const pestHotspots = React.useMemo(() => [
        { id: 'h1', lat: -31.970220, lng: -60.916853, radius: 5000, pest: 'Arañuela Roja', count: 4, severity: 'Alta' },
        { id: 'h2', lat: -31.7333, lng: -60.5333, radius: 8000, pest: 'Trips', count: 2, severity: 'Media' },
        { id: 'h3', lat: -32.9468, lng: -60.6393, radius: 3000, pest: 'Botrytis', count: 1, severity: 'Alta' }
    ], []);

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
        if (!isLoaded || !window.google) return [];
        return establishments.map(est => {
            if (!est.location || !est.location.coordinates) return null;
            const [lat, lng] = est.location.coordinates.split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            return {
                location: new window.google.maps.LatLng(lat, lng),
                weight: est.area?.strawberry || 1
            };
        }).filter(Boolean) as google.maps.visualization.WeightedLocation[];
    }, [establishments, isLoaded]);

    useEffect(() => {
        fitMapToBounds();
    }, [fitMapToBounds]);

    if (loadError) return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">Error cargando Google Maps. Verifique su API Key o conexión de red.</div>;
    if (!isLoaded) return <div className="p-4 text-center text-muted-foreground animate-pulse bg-muted/20 rounded-lg">Cargando motor geoespacial...</div>;

    const defaultCenter = { lat: -31.970220, lng: -60.916853 }; // Coronda default

    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 left-4 z-10 bg-white dark:bg-stone-900 rounded-lg shadow-md border border-stone-200 dark:border-stone-800 p-1 flex gap-1">
                <button 
                    onClick={() => setMapMode('pins')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'pins' ? 'bg-[#2d4a22] text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                    <MapPin className="h-3.5 w-3.5" /> Pines
                </button>
                <button 
                    onClick={() => setMapMode('heatmap')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'heatmap' ? 'bg-[#2d4a22] text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                    <Layers className="h-3.5 w-3.5" /> Calor
                </button>
                <button 
                    onClick={() => setMapMode('pests')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'pests' ? 'bg-[#2d4a22] text-white' : 'text-stone-600 hover:bg-stone-100'}`}
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
                {mapMode === 'heatmap' && heatmapData.length > 0 && (
                    <HeatmapLayer 
                        data={heatmapData}
                        options={{
                            radius: 30,
                            opacity: 0.8,
                            gradient: [
                                'rgba(0, 255, 255, 0)',
                                'rgba(0, 255, 255, 1)',
                                'rgba(0, 191, 255, 1)',
                                'rgba(0, 127, 255, 1)',
                                'rgba(0, 63, 255, 1)',
                                'rgba(0, 0, 255, 1)',
                                'rgba(0, 0, 223, 1)',
                                'rgba(0, 0, 191, 1)',
                                'rgba(0, 0, 159, 1)',
                                'rgba(0, 0, 127, 1)',
                                'rgba(63, 0, 91, 1)',
                                'rgba(127, 0, 63, 1)',
                                'rgba(191, 0, 31, 1)',
                                'rgba(255, 0, 0, 1)'
                            ]
                        }}
                    />
                )}

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
                                url: `http://maps.google.com/mapfiles/ms/icons/${hotspot.severity === 'Alta' ? 'red' : 'yellow'}-dot.png`
                            }}
                            onClick={() => setActiveInfoWindow(hotspot.id)}
                        />
                        {activeInfoWindow === hotspot.id && (
                            <InfoWindow position={{ lat: hotspot.lat, lng: hotspot.lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                <div className="p-2 max-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bug className={`h-4 w-4 ${hotspot.severity === 'Alta' ? 'text-red-600' : 'text-amber-600'}`} />
                                        <h3 className="font-bold text-sm text-slate-800">Alerta Fitosanitaria</h3>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-1">
                                        <strong>Plaga:</strong> {hotspot.pest}
                                    </p>
                                    <p className="text-xs text-slate-600 mb-2">
                                        <strong>Productores en riesgo:</strong> {hotspot.count}
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
                    const iconUrl = `http://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`;

                    return (
                        <Marker
                            key={est.id}
                            position={{ lat, lng }}
                            icon={iconUrl}
                            onClick={() => setActiveInfoWindow(est.id)}
                        >
                            {activeInfoWindow === est.id && (
                                <InfoWindow position={{ lat, lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                    <div className="p-1 max-w-[250px]">
                                        <h3 className="font-bold text-sm mb-1 text-slate-800">{est.producer}</h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{est.location.locality}, {est.location.province}</span>
                                        </div>
                                        
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                                                <span><strong>{est.area?.strawberry || 0} ha</strong> Frutilla</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Building className="h-3.5 w-3.5 text-blue-600" />
                                                <span>{est.system || 'N/A'}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {isActive ? 'Activo' : 'Suspendido'}
                                            </span>
                                            {est.hasGoodPracticesSeal && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" /> Sello BPA
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
