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

// Helper to generate aesthetic SVG pins
const getCustomPinIcon = (color: string) => {
    const svg = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C8.26801 2 2 8.26801 2 16C2 25.5 16 38 16 38C16 38 30 25.5 30 16C30 8.26801 23.732 2 16 2Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="16" cy="15" r="5.5" fill="#FFFFFF"/>
    </svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(32, 40),
        anchor: new google.maps.Point(16, 38)
    };
};

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
            {/* Top Selector Dock - Compact on Mobile */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200/80 dark:border-stone-800 p-0.5 sm:p-1 flex gap-0.5 sm:gap-1 max-w-[90%] overflow-x-auto">
                <button 
                    onClick={() => setMapMode('pins')}
                    className={`px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shrink-0 ${mapMode === 'pins' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Building className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span>Establecimientos</span>
                </button>
                <button 
                    onClick={() => setMapMode('heatmap')}
                    className={`px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shrink-0 ${mapMode === 'heatmap' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span>Calor</span>
                </button>
                <button 
                    onClick={() => setMapMode('pests')}
                    className={`px-2 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shrink-0 ${mapMode === 'pests' ? 'bg-[#2d4a22] text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                    <Bug className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span>Radar Plagas</span>
                </button>
            </div>

            {/* Top Right Mini KPI Overlay */}
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

            {/* Bottom Left Map Color Legend */}
            <div className="hidden sm:block absolute bottom-6 left-4 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-xl shadow-md border border-stone-200/80 dark:border-stone-800 p-2.5 text-[11px] space-y-1.5 text-stone-700 dark:text-stone-300">
                <p className="font-bold text-[10px] uppercase text-stone-500 dark:text-stone-400 tracking-wider">Leyenda de Pines</p>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] inline-block shadow-sm" />
                    <span>Activo + Sello BPA</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] inline-block shadow-sm" />
                    <span>Activo (En Proceso)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shadow-sm" />
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
                    mapTypeId: 'terrain',
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                }}
                onClick={() => setActiveInfoWindow(null)}
            >
                {/* Heatmap placeholder for completeness if heatmap data logic is added later */}
                {/* mapMode === 'heatmap' && heatmapData.map(...) */}

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
                            icon={getCustomPinIcon(hotspot.severity === 'Alta' ? '#dc2626' : '#f59e0b')}
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
                    const hexColor = isActive ? (est.hasGoodPracticesSeal ? '#16a34a' : '#2563eb') : '#ef4444';
                    const iconConfig = getCustomPinIcon(hexColor);

                    return (
                        <Marker
                            key={est.id}
                            position={{ lat, lng }}
                            icon={iconConfig}
                            onClick={() => handleSelectEstablishment(est.id, lat, lng)}
                        >
                            {activeInfoWindow === est.id && (
                                <InfoWindow position={{ lat, lng }} onCloseClick={() => setActiveInfoWindow(null)}>
                                    <div className="p-1.5 max-w-[210px] sm:max-w-[250px] text-stone-900 space-y-1.5">
                                        <div>
                                            <h3 className="font-bold text-sm text-stone-900 leading-tight">{est.producer}</h3>
                                            <div className="flex items-center gap-1 text-[11px] text-stone-600 mt-0.5">
                                                <MapPin className="h-3 w-3 text-stone-500 shrink-0" />
                                                <span className="truncate text-stone-700">{est.location.locality}, {est.location.province}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-100 text-stone-800 text-[11px]">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1 text-stone-600"><Sprout className="h-3 w-3 text-emerald-600 shrink-0" /> Superficie:</span>
                                                <span className="font-bold text-stone-900">{est.area?.strawberry || 0} ha</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1 text-stone-600"><Building className="h-3 w-3 text-blue-600 shrink-0" /> Sistema:</span>
                                                <span className="font-medium text-stone-800 truncate max-w-[100px]">{est.system || 'N/A'}</span>
                                            </div>
                                            {est.technicalManager && (
                                                <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                                                    <span className="flex items-center gap-1 text-stone-600"><UserIcon className="h-3 w-3 text-amber-600 shrink-0" /> Técnico:</span>
                                                    <span className="font-medium text-stone-800 truncate max-w-[100px]">{est.technicalManager}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {isActive ? 'Activo' : 'Suspendido'}
                                            </span>
                                            {est.hasGoodPracticesSeal && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                                    <ShieldCheck className="h-3 w-3" /> Sello BPA
                                                </span>
                                            )}
                                        </div>

                                        <div className="pt-1">
                                            <Button 
                                                size="sm" 
                                                className="w-full h-7 text-xs bg-[#2d4a22] hover:bg-[#1a2d13] text-white flex items-center justify-center gap-1 rounded-lg shadow-sm px-2"
                                                onClick={() => router.push(`/admin/${est.id}`)}
                                            >
                                                <span>Ver Establecimiento</span>
                                                <ExternalLink className="h-3 w-3" />
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
