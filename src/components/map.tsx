
'use client';

import React, { useContext, useState } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow } from '@react-google-maps/api';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Leaf, Notebook, Weight } from 'lucide-react';

type MapProps = {
    center: {
        lat: number;
        lng: number;
    };
    geoJsonData?: any;
};

const MapComponent = ({ center, geoJsonData }: MapProps) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });
    
    const { harvests, agronomistLogs, phenologyLogs } = useContext(AppDataContext);
    const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);

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
                            fillOpacity: 0.35,
                            strokeColor: "#4A90E2",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                        }}
                        onClick={() => setActiveInfoWindow(polygonId)}
                    />
                );
            });
    };
    
    const renderInfoWindows = () => {
        if (!activeInfoWindow || !geoJsonData || !geoJsonData.features) return null;

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
        const lotAgronomistLogs = agronomistLogs.filter(l => l.batchId === activeInfoWindow);
        const lotPhenologyLogs = phenologyLogs.filter(p => p.batchId === activeInfoWindow);
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
        </GoogleMap>
    );
};

export default MapComponent;
