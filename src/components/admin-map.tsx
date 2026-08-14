'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import type { EstablishmentData, DiagnosisLog } from '@/lib/types';
import { Building, MapPin, Activity, Sprout, Layers, Bug, ShieldCheck, User as UserIcon, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type AdminMapProps = {
    establishments: EstablishmentData[];
    pestLogs?: DiagnosisLog[];
};

const libraries: ("drawing" | "geometry")[] = ["geometry"];

export function AdminMap({ establishments, pestLogs = [] }: AdminMapProps) {
    const router = useRouter();
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
    const [mapMode, setMapMode] = useState<'pins' | 'heatmap' | 'pests'>('pins');

    // Global Stats for Map Overlay
    const totalStrawberryHa = useMemo(() => {
        return establishments.reduce((acc, est) => acc + (est.area?.strawberry || 0), 0);
    }, [establishments]);

    const certifiedCount = useMemo(() => {
        return establishments.filter(e => e.hasGoodPracticesSeal).length;
    }, [establishments]);

    const certifiedPercentage = useMemo(() => {
        if (establishments.length === 0) return 0;
        return Math.round((certifiedCount / establishments.length) * 100);
    }, [certifiedCount, establishments]);

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
            const areaSqM = (est.area?.strawberry || est.area?.total || 1) * 10000;
            const radius = Math.max(60, Math.round(Math.sqrt(areaSqM / Math.PI)));
            
            return {
                id: `pest-${estId}`,
                lat,
                lng,
                radius,
                pest: Array.from(data.pests).join(', '),
                count: data.count,
                severity
            };
        }).filter(Boolean) as { id: string, lat: number, lng: number, radius: number, pest: string, count: number, severity: string }[];
    }, [pestLogs, establishments]);

    const [hasInitialFit, setHasInitialFit] = useState(false);

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

    // Fit map bounds ONLY ONCE on initial load
    useEffect(() => {
        if (mapInstance && !hasInitialFit && establishments.length > 0) {
            fitMapToBounds();
            setHasInitialFit(true);
        }
    }, [mapInstance, hasInitialFit, establishments, fitMapToBounds]);

    // Handle marker click with smooth pan and zoom
    const handleSelectEstablishment = (estId: string, lat: number, lng: number) => {
        setActiveInfoWindow(estId);
        if (mapInstance) {
            mapInstance.panTo({ lat, lng });
            // If current zoom is too far out, zoom in to focus on establishment
            if (mapInstance.getZoom()! < 14) {
                mapInstance.setZoom(14);
            }
        }
    };

    // Handle pest hotspot click with smooth pan and zoom
    const handleSelectPest = (hotspotId: string, lat: number, lng: number) => {
        setActiveInfoWindow(hotspotId);
        if (mapInstance) {
            mapInstance.panTo({ lat, lng });
            if (mapInstance.getZoom()! < 14) {
                mapInstance.setZoom(14);
            }
        }
    };

    if (loadError) return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">Error cargando Google Maps. Verifique su API Key o conexión de red.</div>;
    if (!isLoaded) return <div className="p-4 text-center text-muted-foreground animate-pulse bg-muted/20 rounded-lg">Cargando motor geoespacial...</div>;

    const defaultCenter = { lat: -31.970220, lng: -60.916853 };

    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200/80 dark:border-stone-800 p-1 flex gap-1">
                <button 
                    onClick={() => setMapMode('pins')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${mapMode === 'pins' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Building className="h-3.5 w-3.5" /> Establecimientos
                </button>
                <button 
                    onClick={() => setMapMode('heatmap')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${mapMode === 'heatmap' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Layers className="h-3.5 w-3.5" /> Calor
                </button>
                <button 
                    onClick={() => setMapMode('pests')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${mapMode === 'pests' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Bug className="h-3.5 w-3.5" /> Radar Plagas
                </button>
            </div>

            <div className="hidden sm:flex absolute top-4 right-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200/80 dark:border-stone-800 p-2.5 items-center gap-4 text-xs font-medium text-stone-700 dark:text-stone-200">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <Sprout className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-semibold">Superficie Total</p>
                        <p className="font-bold text-stone-900 dark:text-stone-100">{totalStrawberryHa} ha Frutilla</p>
                    </div>
                </div>
                <div className="h-7 w-px bg-stone-200 dark:bg-stone-800" />
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-semibold">Certificados BPA</p>
                        <p className="font-bold text-stone-900 dark:text-stone-100">{certifiedCount} ({certifiedPercentage}%)</p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200/80 dark:border-stone-800 p-2.5 text-[11px] space-y-1.5 text-stone-700 dark:text-stone-300">
                <p className="font-bold text-[10px] uppercase text-stone-500 dark:text-stone-400 tracking-wider">Leyenda de Pines</p>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-sm" />
                    <span>Activo + Sello BPA</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-sm" />
                    <span>Activo (En Proceso)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm" />
                    <span>Suspendido / Inactivo</span>
                </div>
            </div>

            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '0.75rem' }}
                center={defaultCenter}
                zoom={8}
                onLoad={setMapInstance}
                onUnmount={() => setMapInstance(null)}
                options={{
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
                            onClick={() => handleSelectPest(hotspot.id, hotspot.lat, hotspot.lng)}
                        />
                        <Marker 
                            position={{ lat: hotspot.lat, lng: hotspot.lng }} 
                            icon={{ url: `https://maps.google.com/mapfiles/ms/icons/${hotspot.severity === 'Alta' ? 'red' : 'yellow'}-dot.png` }}
                            onClick={() => handleSelectPest(hotspot.id, hotspot.lat, hotspot.lng)}
                        />
                        {activeInfoWindow === hotspot.id && (
                            <InfoWindow position={{ lat: hotspot.lat, lng: hotspot.lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                <div className="p-2 max-w-[200px] text-stone-900">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bug className={`h-4 w-4 ${hotspot.severity === 'Alta' ? 'text-red-600' : 'text-amber-600'}`} />
                                        <h3 className="font-bold text-sm text-stone-900">Alerta Fitosanitaria</h3>
                                    </div>
                                    <p className="text-xs text-stone-700 mb-1"><strong className="text-stone-900">Plaga:</strong> {hotspot.pest}</p>
                                    <p className="text-xs text-stone-700 mb-2"><strong className="text-stone-900">Reportes:</strong> {hotspot.count}</p>
                                    <Badge variant={hotspot.severity === 'Alta' ? "destructive" : "default"} className="text-[10px]">Gravedad {hotspot.severity}</Badge>
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
                            onClick={() => handleSelectEstablishment(est.id, lat, lng)}
                        >
                            {activeInfoWindow === est.id && (
                                <InfoWindow position={{ lat, lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                    <div className="p-2 max-w-[260px] text-stone-900 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-sm text-stone-900 leading-snug">{est.producer}</h3>
                                                <div className="flex items-center gap-1 text-[11px] text-stone-600 mt-0.5">
                                                    <MapPin className="h-3 w-3 text-stone-500" />
                                                    <span className="truncate text-stone-700">{est.location.locality}, {est.location.province}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-100 text-stone-800">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1.5 text-stone-600"><Sprout className="h-3.5 w-3.5 text-emerald-600" /> Superficie:</span>
                                                <span className="font-bold text-stone-900">{est.area?.strawberry || 0} ha Frutilla</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1.5 text-stone-600"><Building className="h-3.5 w-3.5 text-blue-600" /> Sistema:</span>
                                                <span className="font-medium text-stone-800">{est.system || 'N/A'}</span>
                                            </div>
                                            {est.technicalManager && (
                                                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/60">
                                                    <span className="flex items-center gap-1.5 text-stone-600"><UserIcon className="h-3.5 w-3.5 text-amber-600" /> Técnico:</span>
                                                    <span className="font-medium text-stone-800 truncate max-w-[120px]">{est.technicalManager}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {isActive ? 'Activo' : 'Suspendido'}
                                            </span>
                                            {est.hasGoodPracticesSeal && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                                    <ShieldCheck className="h-3 w-3" /> Sello BPA Certificado
                                                </span>
                                            )}
                                        </div>
                                        <div className="pt-1">
                                            <Button 
                                                size="sm" 
                                                className="w-full h-8 text-xs bg-[#2d4a22] hover:bg-[#1a2d13] text-white flex items-center justify-center gap-1.5 rounded-lg shadow-sm"
                                                onClick={() => router.push(`/admin/${est.id}`)}
                                            >
                                                <span>Ver Detalle del Establecimiento</span>
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
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
