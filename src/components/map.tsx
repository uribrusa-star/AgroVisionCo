
'use client';

import React, { useContext, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow, Circle, OverlayView } from '@react-google-maps/api';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Leaf, Notebook, Weight, AlertTriangle, Activity, Thermometer, FlaskConical, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';
import { getBatchPhiStatus } from '@/lib/phi-utils';

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
    
    const { harvests, agronomistLogs, phenologyLogs, batches } = useContext(AppDataContext);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

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
                const phiStatus = getBatchPhiStatus(polygonId, agronomistLogs);

                return (
                    <Polygon
                        key={polygonId}
                        paths={paths}
                        options={{
                            fillColor: phiStatus.isBlocked ? "#EF4444" : "#4A90E2",
                            fillOpacity: phiStatus.isBlocked ? 0.35 : 0.15,
                            strokeColor: phiStatus.isBlocked ? "#EF4444" : "#4A90E2",
                            strokeOpacity: 0.9,
                            strokeWeight: phiStatus.isBlocked ? 3 : 2,
                        }}
                        onClick={() => {
                            setActiveInfoWindow(polygonId);
                            if (mapRef.current) {
                                const center = paths.reduce(
                                    (acc: { lat: number, lng: number }, curr: { lat: number, lng: number }) => {
                                        return { lat: acc.lat + curr.lat, lng: acc.lng + curr.lng };
                                    }, { lat: 0, lng: 0 }
                                );
                                center.lat /= paths.length;
                                center.lng /= paths.length;
                                mapRef.current.panTo(center);
                                mapRef.current.setZoom(17);
                            }
                        }}
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

    const renderBatchLabels = () => {
        if (!geoJsonData || !geoJsonData.features) return null;
        return geoJsonData.features
            .filter((feature: any) => feature.geometry && feature.geometry.type === 'Polygon')
            .map((feature: any, index: number) => {
                const properties = feature.properties || {};
                const polygonId = Object.keys(properties).find(k => k.startsWith('L')) || `Lote ${index + 1}`;
                
                const paths = feature.geometry.coordinates[0];
                const center = paths.reduce(
                    (acc: any, curr: any) => ({ lat: acc.lat + curr[1], lng: acc.lng + curr[0] }), 
                    { lat: 0, lng: 0 }
                );
                center.lat /= paths.length;
                center.lng /= paths.length;

                return (
                    <OverlayView
                        key={`label-${polygonId}`}
                        position={center}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                        <div 
                            className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-[8px] sm:text-[10px] font-extrabold text-gray-800 shadow-sm border border-gray-200/50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center min-w-[40px] w-max"
                        >
                            {polygonId}
                        </div>
                    </OverlayView>
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
                                {(log.batchIds && log.batchIds.length > 0) ? (
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Lotes</p>
                                        <p className="text-xs">{log.batchIds.join(', ')}</p>
                                    </div>
                                ) : (log.batchId && (
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Lote</p>
                                        <p className="text-xs">{log.batchId}</p>
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs bg-muted p-2 rounded italic">
                                "{log.notes}"
                            </p>
                        </div>
                    </div>
                </InfoWindow>
            );
        }
        return null;
    }

    const renderHUD = () => {
        if (!activeInfoWindow || activeInfoWindow.startsWith('hotspot-')) return null;

        const lotHarvests = harvests.filter(h => h.batchNumber === activeInfoWindow || h.batchNumber.split(',').map(s => s.trim()).includes(activeInfoWindow!));
        const lotAgronomistLogs = agronomistLogs.filter(l => 
          (l.batchIds && l.batchIds.includes(activeInfoWindow)) || (l.batchId === activeInfoWindow)
        );
        const lotSanityLogs = lotAgronomistLogs.filter(l => l.type === 'Sanidad');
        const lotPhenologyLogs = phenologyLogs.filter(p => 
          (p.batchIds && p.batchIds.includes(activeInfoWindow)) || (p.batchId === activeInfoWindow)
        );
        const totalKilos = lotHarvests.reduce((sum, h) => sum + h.kilograms, 0);
        const phiStatus = getBatchPhiStatus(activeInfoWindow!, agronomistLogs);

        let variedad = 'N/A';
        let densidad = 'N/A';
        let hectareas = 'N/A';

        const activeBatch = (batches || []).find(b => b.id === activeInfoWindow);
        if (activeBatch && activeBatch.varieties && activeBatch.varieties.length > 0) {
            variedad = activeBatch.varieties.map(v => v.name).join(', ');
            const totalDensidad = activeBatch.varieties.reduce((sum, v) => sum + (v.plantCount || 0), 0);
            densidad = totalDensidad > 0 ? totalDensidad.toLocaleString('es-ES') : 'N/A';
            const totalHectareas = activeBatch.varieties.reduce((sum, v) => sum + (v.area || 0), 0);
            hectareas = totalHectareas > 0 ? totalHectareas.toLocaleString('es-ES') : 'N/A';
        }

        return (
            <div className="absolute inset-0 pointer-events-none flex flex-col sm:flex-row justify-between p-4 z-10">
                {/* Left Panel */}
                <div className="w-full sm:w-64 flex flex-col gap-4 pointer-events-auto mb-4 sm:mb-0">
                    <div className="bg-white/90 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 transition-all animate-in slide-in-from-left">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-foreground">Lote: {activeInfoWindow}</h3>
                            <button onClick={() => {
                                setActiveInfoWindow(null);
                                if (mapRef.current) {
                                    mapRef.current.panTo(center);
                                    mapRef.current.setZoom(19);
                                }
                            }} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs uppercase text-muted-foreground font-bold mb-2">Rendimiento</h4>
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
                                        <Weight className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{totalKilos.toLocaleString('es-ES')} kg</p>
                                        <p className="text-xs text-muted-foreground">{lotHarvests.length} cosechas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Variedad</p>
                                    <p className="text-sm font-semibold">{variedad}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Densidad</p>
                                    <p className="text-sm font-semibold">{densidad}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Superficie</p>
                                    <p className="text-sm font-semibold">{hectareas} ha.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-full sm:w-72 flex flex-col gap-4 pointer-events-auto">
                    {phiStatus.isBlocked && (
                        <div className="bg-red-500/90 backdrop-blur-md text-white border border-red-600 shadow-xl rounded-xl p-4 transition-all animate-in slide-in-from-right">
                            <div className="flex items-center gap-2 font-bold text-sm uppercase mb-2">
                                <AlertTriangle className="h-5 w-5 animate-pulse" />
                                BLOQUEADO (PHI)
                            </div>
                            <p className="text-sm font-medium">{phiStatus.productName}</p>
                            <p className="text-xs mt-2 opacity-90">
                                Liberación: <span className="font-bold">{phiStatus.unlockDate?.toLocaleDateString('es-ES')}</span> 
                            </p>
                            <p className="text-[10px] mt-1 opacity-80">
                                Restan: {phiStatus.remainingDays || 0}d / {phiStatus.remainingHours || 0}hs
                            </p>
                        </div>
                    )}

                    {lotSanityLogs.length > 0 && (
                        <div className="bg-white/90 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 transition-all animate-in slide-in-from-right overflow-y-auto max-h-48">
                            <h4 className="text-xs uppercase text-red-600 font-bold mb-3 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" /> Alertas Sanitarias
                            </h4>
                            <div className="space-y-3">
                                {lotSanityLogs.map((log, idx) => (
                                    <div key={idx} className="bg-red-50/50 border border-red-100 p-2 rounded-lg">
                                        <p className="text-xs font-semibold text-red-800">{log.product}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-[10px] text-gray-600 line-clamp-1 flex-1" title={log.notes}>{log.notes}</p>
                                            <p className="text-[10px] text-red-600/80 font-medium ml-2">{format(new Date(log.date), "dd/MM")}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white/90 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 transition-all animate-in slide-in-from-right">
                        <h4 className="text-xs uppercase text-muted-foreground font-bold mb-3">Historial</h4>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-500/10 text-blue-600 p-2 rounded-lg mt-0.5">
                                    <Leaf className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{lotAgronomistLogs.length} Registros</p>
                                    <p className="text-xs text-muted-foreground">Actividades Sanitarias y Nutricionales</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="bg-green-500/10 text-green-600 p-2 rounded-lg mt-0.5">
                                    <Notebook className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{lotPhenologyLogs.length} Fases</p>
                                    <p className="text-xs text-muted-foreground">Estados Fenológicos Registrados</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
        <div className="relative w-full h-full">
            <GoogleMap
                mapContainerStyle={{
                    width: '100%',
                    height: '100%',
                }}
                center={center}
                zoom={19}
                onLoad={(map) => { mapRef.current = map; }}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    mapTypeId: 'satellite',
                    geolocation: false,
                }}
            >
                {renderPolygons()}
                {renderBatchLabels()}
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
            {renderHUD()}
        </div>
    );
};

export default MapComponent;
