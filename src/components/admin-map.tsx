'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { EstablishmentData } from '@/lib/types';
import { Building, MapPin, Activity, Sprout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type AdminMapProps = {
    establishments: EstablishmentData[];
};

const libraries: ("drawing" | "geometry")[] = ["geometry"];

export function AdminMap({ establishments }: AdminMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);

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

    useEffect(() => {
        fitMapToBounds();
    }, [fitMapToBounds]);

    if (loadError) return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">Error cargando Google Maps. Verifique su API Key o conexión de red.</div>;
    if (!isLoaded) return <div className="p-4 text-center text-muted-foreground animate-pulse bg-muted/20 rounded-lg">Cargando motor geoespacial...</div>;

    const defaultCenter = { lat: -31.970220, lng: -60.916853 }; // Coronda default

    return (
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
            {establishments.map((est) => {
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
    );
}
