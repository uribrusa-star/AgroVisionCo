'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Circle, Polyline, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, MousePointer2, Save, Trash2, X, Plus, Undo2, LocateFixed, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const libraries: ("drawing" | "geometry")[] = ["drawing", "geometry"];

type LatLng = { lat: number; lng: number };

type BatchBuilderProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (polygonPoints: LatLng[], batchName: string) => void;
  initialCenter?: LatLng;
  existingGeoJson?: any;
};

export function BatchBuilder({ open, onOpenChange, onSave, initialCenter = { lat: -31.953, lng: -60.934 }, existingGeoJson }: BatchBuilderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const { toast } = useToast();
  
  const [mode, setMode] = useState<'idle' | 'draw' | 'gps' | 'coords'>('idle');
  const [currentPoints, setCurrentPoints] = useState<LatLng[]>([]);
  const [drawnPolygon, setDrawnPolygon] = useState<LatLng[] | null>(null);
  
  // Manual Coordinates inputs
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [coordsText, setCoordsText] = useState('');
  const [showBatchCoordsImport, setShowBatchCoordsImport] = useState(false);

  // Real-time GPS tracking state
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const [batchName, setBatchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  // Suggested next batch name (e.g., L003 if L002 exists)
  useEffect(() => {
    if (open && existingGeoJson && existingGeoJson.features) {
      const batchIds = existingGeoJson.features
        .filter((f: any) => f.geometry && f.geometry.type === 'Polygon')
        .map((f: any) => {
          const keys = Object.keys(f.properties || {});
          const id = keys.find(k => k.startsWith('L'));
          if (id) {
            const num = parseInt(id.replace('L', ''), 10);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        });
        
      const maxId = batchIds.length > 0 ? Math.max(...batchIds) : 0;
      const nextId = maxId + 1;
      setBatchName(`L${String(nextId).padStart(3, '0')}`);
    } else if (open) {
      setBatchName('L001');
    }
  }, [open, existingGeoJson]);

  // Real-time GPS tracking listener
  useEffect(() => {
    if (open && mode === 'gps') {
      if (!navigator.geolocation) {
        toast({ title: 'GPS No Soportado', description: 'Su navegador o dispositivo no soporta geolocalización.', variant: 'destructive' });
        return;
      }

      setIsGpsLoading(true);
      toast({ title: 'Iniciando GPS en vivo...', description: 'Espere mientras se estabilizan los satélites.' });

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setGpsAccuracy(pos.coords.accuracy);
          setIsGpsLoading(false);

          if (mapRef.current && !userLocation) {
            mapRef.current.panTo(coords);
            mapRef.current.setZoom(19);
          }
        },
        (err) => {
          console.error("GPS Watch error:", err);
          setIsGpsLoading(false);
          toast({ title: 'Error de GPS', description: 'Asegúrese de activar la ubicación del dispositivo.', variant: 'destructive' });
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setUserLocation(null);
      setGpsAccuracy(null);
      setIsGpsLoading(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [open, mode]);

  // Reset state when opening or closing
  useEffect(() => {
    if (open) {
      setMode('idle');
      setCurrentPoints([]);
      setDrawnPolygon(null);
      setIsSaving(false);
    }
  }, [open]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (mode === 'draw' && e.latLng) {
      const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setCurrentPoints(prev => [...prev, newPoint]);
    }
  }, [mode]);

  const handleCaptureGpsPoint = () => {
    if (!userLocation) {
      toast({ title: 'Esperando señal GPS...', description: 'Obteniendo su posición actual.', variant: 'destructive' });
      return;
    }

    setCurrentPoints(prev => [...prev, { ...userLocation }]);
    if (mapRef.current) {
      mapRef.current.panTo(userLocation);
    }

    const accuracyText = gpsAccuracy ? ` (Precisión: ±${Math.round(gpsAccuracy)}m)` : '';
    toast({ title: `Punto #${currentPoints.length + 1} marcado`, description: `Coordenadas capturadas con éxito${accuracyText}.` });
  };

  const handleAddManualCoordinate = () => {
    const lat = parseFloat(manualLat.trim());
    const lng = parseFloat(manualLng.trim());

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: 'Coordenadas inválidas', description: 'Por favor ingrese valores numéricos válidos para latitud (-90 a 90) y longitud (-180 a 180).', variant: 'destructive' });
      return;
    }

    const newPoint = { lat, lng };
    setCurrentPoints(prev => [...prev, newPoint]);
    if (mapRef.current) {
      mapRef.current.panTo(newPoint);
      mapRef.current.setZoom(18);
    }

    setManualLat('');
    setManualLng('');
    toast({ title: `Punto #${currentPoints.length + 1} añadido`, description: `Coordenada (${lat.toFixed(5)}, ${lng.toFixed(5)}) agregada.` });
  };

  const handleImportBatchCoordinates = () => {
    if (!coordsText.trim()) return;

    const lines = coordsText.split('\n');
    const importedPoints: LatLng[] = [];

    lines.forEach(line => {
      const clean = line.trim();
      if (!clean) return;
      const parts = clean.split(/[,;\s]+/).map(s => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // Soporta tanto lat,lng como lng,lat si lat está en rango [-90, 90]
        let lat = parts[0];
        let lng = parts[1];
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
          // Swap if inverted
          const tmp = lat; lat = lng; lng = tmp;
        }
        importedPoints.push({ lat, lng });
      }
    });

    if (importedPoints.length === 0) {
      toast({ title: 'No se reconocieron coordenadas', description: 'Formato esperado: latitud, longitud (un par por línea).', variant: 'destructive' });
      return;
    }

    setCurrentPoints(prev => [...prev, ...importedPoints]);
    if (mapRef.current && importedPoints.length > 0) {
      mapRef.current.panTo(importedPoints[0]);
    }

    setCoordsText('');
    setShowBatchCoordsImport(false);
    toast({ title: 'Coordenadas importadas', description: `Se añadieron ${importedPoints.length} vértices al lote.` });
  };

  const handleUndoLastPoint = () => {
    if (currentPoints.length === 0) return;
    setCurrentPoints(prev => prev.slice(0, -1));
    toast({ title: 'Punto eliminado', description: 'Se removió el último vértice marcado.' });
  };

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(19);
    } else {
      toast({ title: 'Buscando señal GPS...', description: 'Asegúrese de activar la ubicación.' });
    }
  };

  const handleFinishPoints = () => {
    if (currentPoints.length < 3) {
      toast({ title: 'Faltan puntos', description: 'Un lote debe tener al menos 3 puntos.', variant: 'destructive' });
      return;
    }
    const finalPoints = [...currentPoints, { ...currentPoints[0] }];
    setDrawnPolygon(finalPoints);
    setMode('idle');
  };

  const handleSave = () => {
    if (!drawnPolygon) return;
    if (!batchName.trim()) {
      toast({ title: 'Falta el nombre', description: 'Por favor ingrese un nombre para el lote (ej. L001).', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    onSave(drawnPolygon, batchName);
    onOpenChange(false);
  };

  const handleClear = () => {
    setDrawnPolygon(null);
    setCurrentPoints([]);
    setMode('idle');
  };

  if (!isLoaded) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden border-none bg-background shadow-2xl">
        <DialogTitle className="sr-only">Constructor de Lotes</DialogTitle>
        <DialogDescription className="sr-only">Herramienta para dibujar o marcar lotes mediante GPS.</DialogDescription>
        
        <div className="bg-primary/10 border-b p-4 flex justify-between items-center z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Constructor de Lotes</h2>
            <p className="text-sm text-muted-foreground">Dibuje en el mapa o camine el perímetro con GPS en tiempo real</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
        </div>

        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={initialCenter}
            zoom={16}
            onLoad={(map) => { mapRef.current = map; }}
            onClick={handleMapClick}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              mapTypeId: 'satellite',
              draggableCursor: mode === 'draw' ? 'crosshair' : 'grab'
            }}
          >
            {/* Render existing lots as contextual background */}
            {existingGeoJson?.features?.map((feature: any, idx: number) => {
              if (feature.geometry?.type === 'Polygon') {
                const paths = feature.geometry.coordinates[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                return (
                  <Polygon 
                    key={`existing-${idx}`} 
                    paths={paths} 
                    options={{ fillColor: '#38bdf8', fillOpacity: 0.35, strokeColor: '#0284c7', strokeWeight: 2 }} 
                  />
                );
              }
              return null;
            })}

            {/* Live user GPS Location indicator */}
            {mode === 'gps' && userLocation && (
              <>
                {gpsAccuracy && (
                  <Circle
                    center={userLocation}
                    radius={gpsAccuracy}
                    options={{
                      fillColor: '#3b82f6',
                      fillOpacity: 0.15,
                      strokeColor: '#2563eb',
                      strokeOpacity: 0.5,
                      strokeWeight: 1,
                    }}
                  />
                )}
                <Marker
                  position={userLocation}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                  }}
                  title="Tu Ubicación Actual"
                />
              </>
            )}

            {/* Render in-progress Points and Lines */}
            {(mode === 'draw' || mode === 'gps' || mode === 'coords') && currentPoints.map((pt, i) => (
              <Circle
                key={`point-${i}`}
                center={pt}
                radius={2}
                options={{
                    fillColor: '#f59e0b',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    zIndex: 20
                }}
              />
            ))}
            
            {(mode === 'draw' || mode === 'gps' || mode === 'coords') && currentPoints.length > 1 && (
              <Polyline
                path={currentPoints}
                options={{ strokeColor: '#f59e0b', strokeWeight: 3, zIndex: 15 }}
              />
            )}

            {/* Render completed polygon */}
            {drawnPolygon && (
              <Polygon
                paths={drawnPolygon}
                options={{ fillColor: '#22c55e', fillOpacity: 0.4, strokeColor: '#16a34a', strokeWeight: 3, zIndex: 10 }}
              />
            )}
          </GoogleMap>

          {/* Overlay Controls UI */}
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none z-20">
             <div className="flex flex-col gap-2 pointer-events-auto w-full max-w-lg">
               {!drawnPolygon && mode === 'idle' && (
                 <div className="flex flex-wrap gap-2">
                   <Button onClick={() => setMode('draw')} className="bg-background text-foreground hover:bg-muted shadow-lg border">
                     <MousePointer2 className="h-4 w-4 mr-2" /> Dibujar en Mapa
                   </Button>
                   <Button onClick={() => setMode('gps')} className="bg-background text-foreground hover:bg-muted shadow-lg border">
                     <Navigation className="h-4 w-4 mr-2" /> Usar GPS en Vivo
                   </Button>
                   <Button onClick={() => setMode('coords')} className="bg-background text-foreground hover:bg-muted shadow-lg border">
                     <MapPin className="h-4 w-4 mr-2" /> Ingresar Coordenadas
                   </Button>
                 </div>
               )}

               {mode === 'coords' && (
                 <div className="flex flex-col gap-3 bg-background/95 backdrop-blur-md p-4 rounded-lg shadow-xl border">
                   <div className="flex justify-between items-center border-b pb-2">
                     <div>
                       <span className="font-bold text-foreground">Ingreso por Coordenadas ({currentPoints.length} vértices)</span>
                       <p className="text-xs text-muted-foreground">Ingrese los puntos exactos o pegue una lista completa</p>
                     </div>
                     {currentPoints.length > 0 && (
                       <Button size="sm" variant="outline" onClick={handleUndoLastPoint} className="text-amber-600 border-amber-300">
                         <Undo2 className="h-4 w-4 mr-1" /> Deshacer Último
                       </Button>
                     )}
                   </div>

                   {!showBatchCoordsImport ? (
                     <div className="space-y-3">
                       <div className="grid grid-cols-2 gap-2">
                         <div>
                           <Label className="text-xs">Latitud</Label>
                           <Input 
                             placeholder="Ej. -31.95336" 
                             value={manualLat} 
                             onChange={(e) => setManualLat(e.target.value)} 
                             className="h-9"
                           />
                         </div>
                         <div>
                           <Label className="text-xs">Longitud</Label>
                           <Input 
                             placeholder="Ej. -60.93462" 
                             value={manualLng} 
                             onChange={(e) => setManualLng(e.target.value)} 
                             className="h-9"
                           />
                         </div>
                       </div>
                       
                       <div className="flex gap-2">
                         <Button onClick={handleAddManualCoordinate} className="bg-amber-500 hover:bg-amber-600 text-white flex-1 font-bold h-9">
                           <Plus className="h-4 w-4 mr-1" /> Añadir Punto
                         </Button>
                         <Button variant="outline" onClick={() => setShowBatchCoordsImport(true)} className="h-9 text-xs">
                           Pegar Lista
                         </Button>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Label className="text-xs">Pegar Coordenadas (Latitud, Longitud por línea)</Label>
                       <textarea 
                         rows={4}
                         placeholder={`-31.95336, -60.93462\n-31.95410, -60.93410\n-31.95420, -60.93500`}
                         value={coordsText}
                         onChange={(e) => setCoordsText(e.target.value)}
                         className="w-full text-xs p-2 rounded-md border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                       />
                       <div className="flex gap-2">
                         <Button onClick={handleImportBatchCoordinates} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 font-bold h-8 text-xs">
                           Importar Lista
                         </Button>
                         <Button variant="ghost" onClick={() => setShowBatchCoordsImport(false)} className="h-8 text-xs">
                           Volver
                         </Button>
                       </div>
                     </div>
                   )}

                   <div className="flex gap-2 border-t pt-2 mt-1">
                     {currentPoints.length >= 3 && (
                       <Button onClick={handleFinishPoints} className="bg-green-600 hover:bg-green-700 text-white shadow-md flex-1 font-bold">
                         Terminar Lote
                       </Button>
                     )}
                     <Button variant="destructive" size="sm" onClick={handleClear}>Cancelar</Button>
                   </div>
                 </div>
               )}

               {mode === 'draw' && (
                 <div className="flex flex-col gap-2 bg-background/95 backdrop-blur-md p-3 rounded-lg shadow-xl border">
                   <div className="text-sm font-semibold text-foreground flex justify-between items-center">
                     <span>Trazando Lote en Mapa ({currentPoints.length} puntos)</span>
                     {currentPoints.length > 0 && (
                       <Button size="sm" variant="outline" onClick={handleUndoLastPoint} className="text-amber-600 border-amber-300">
                         <Undo2 className="h-4 w-4 mr-1" /> Deshacer Último
                       </Button>
                     )}
                   </div>
                   <div className="flex gap-2 mt-1">
                     {currentPoints.length >= 3 && (
                       <Button onClick={handleFinishPoints} className="bg-green-600 hover:bg-green-700 text-white shadow-md flex-1">
                         Terminar Lote
                       </Button>
                     )}
                     <Button variant="destructive" size="sm" onClick={handleClear}>Cancelar</Button>
                   </div>
                 </div>
               )}

               {mode === 'gps' && (
                 <div className="flex flex-col gap-2 bg-background/95 backdrop-blur-md p-4 rounded-lg shadow-xl border">
                   <div className="flex justify-between items-center border-b pb-2">
                     <div>
                       <span className="font-bold text-foreground">Modo GPS en Vivo</span>
                       <p className="text-xs text-muted-foreground">
                         {isGpsLoading ? 'Obteniendo señal GPS...' : gpsAccuracy ? `Precisión de señal: ±${Math.round(gpsAccuracy)}m` : 'Ubicación activa'}
                       </p>
                     </div>
                     <Button size="icon" variant="ghost" onClick={handleCenterOnUser} title="Centrar en mi ubicación">
                       <LocateFixed className="h-5 w-5 text-blue-600 animate-pulse" />
                     </Button>
                   </div>

                   <div className="flex items-center gap-2 my-1">
                     <Button onClick={handleCaptureGpsPoint} disabled={!userLocation} className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex-1 h-12 text-base font-bold">
                       <MapPin className="h-5 w-5 mr-2" /> Marcar Posición Actual ({currentPoints.length})
                     </Button>
                     {currentPoints.length > 0 && (
                       <Button size="icon" variant="outline" onClick={handleUndoLastPoint} title="Deshacer último punto" className="h-12 w-12 text-amber-600 border-amber-400">
                         <Undo2 className="h-6 w-6" />
                       </Button>
                     )}
                   </div>

                   <div className="flex gap-2 mt-1">
                     {currentPoints.length >= 3 && (
                       <Button onClick={handleFinishPoints} className="bg-green-600 hover:bg-green-700 text-white shadow-md flex-1 font-bold">
                         Terminar Lote
                       </Button>
                     )}
                     <Button variant="destructive" size="sm" onClick={handleClear}>Cancelar</Button>
                   </div>
                 </div>
               )}
             </div>
          </div>
          
          {/* Bottom Dialog for Naming when completed */}
          {drawnPolygon && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none animate-in slide-in-from-bottom-4 z-30">
               <Card className="p-4 w-full max-w-md pointer-events-auto shadow-xl border-primary">
                  <h3 className="font-bold text-lg mb-2 text-primary">Lote Definido</h3>
                  <p className="text-sm text-muted-foreground mb-4">El polígono se ha trazado correctamente ({currentPoints.length} vértices). Asigne un identificador para guardarlo.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Identificador del Lote</Label>
                      <Input 
                        value={batchName} 
                        onChange={(e) => setBatchName(e.target.value)} 
                        placeholder="Ej. L001" 
                        className="font-bold uppercase"
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                       <Button variant="outline" onClick={handleClear}><Trash2 className="h-4 w-4 mr-2" /> Descartar</Button>
                       <Button onClick={handleSave} disabled={isSaving || !batchName}><Save className="h-4 w-4 mr-2" /> Guardar Lote</Button>
                    </div>
                  </div>
               </Card>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
