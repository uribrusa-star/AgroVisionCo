'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Circle, Polyline } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, MousePointer2, Save, Trash2, X, Plus } from 'lucide-react';
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
  
  const [mode, setMode] = useState<'idle' | 'draw' | 'gps'>('idle');
  const [currentPoints, setCurrentPoints] = useState<LatLng[]>([]);
  const [drawnPolygon, setDrawnPolygon] = useState<LatLng[] | null>(null);
  
  const [batchName, setBatchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);

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

  // Reset state when opening
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
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Su dispositivo no soporta geolocalización.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Obteniendo ubicación...', description: 'Por favor espere.' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentPoints(prev => [...prev, newPoint]);
        
        if (mapRef.current) {
          mapRef.current.panTo(newPoint);
          mapRef.current.setZoom(19); // Zoom in close for GPS points
        }
        
        toast({ title: 'Punto guardado', description: 'Coordenada capturada con éxito.' });
      },
      (error) => {
        toast({ title: 'Error de GPS', description: 'No se pudo obtener la ubicación. Verifique los permisos.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFinishPoints = () => {
    if (currentPoints.length < 3) {
      toast({ title: 'Faltan puntos', description: 'Un lote debe tener al menos 3 puntos.', variant: 'destructive' });
      return;
    }
    // Close the polygon
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
            <p className="text-sm text-muted-foreground">Dibuje en el mapa o camine el perímetro con GPS</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
        </div>

        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={initialCenter}
            zoom={16}
            onLoad={(map) => { mapRef.current = map; }}
            mapTypeId="terrain"
            onClick={handleMapClick}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              draggableCursor: mode === 'draw' ? 'crosshair' : 'grab'
            }}
          >
            {/* Render existing lots as contextual background */}
            {existingGeoJson?.features?.map((feature: any, idx: number) => {
              if (feature.geometry?.type === 'Polygon') {
                const paths = feature.geometry.coordinates[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                const name = Object.keys(feature.properties || {}).find(k => k.startsWith('L')) || `Lote ${idx}`;
                return (
                  <Polygon 
                    key={`existing-${idx}`} 
                    paths={paths} 
                    options={{ fillColor: '#94a3b8', fillOpacity: 0.2, strokeColor: '#cbd5e1', strokeWeight: 1 }} 
                  />
                );
              }
              return null;
            })}

            {/* Render in-progress Points and Lines for both modes */}
            {(mode === 'draw' || mode === 'gps') && currentPoints.map((pt, i) => (
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
            
            {(mode === 'draw' || mode === 'gps') && currentPoints.length > 1 && (
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

          {/* Overlay UI */}
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
             <div className="flex gap-2 pointer-events-auto">
               {!drawnPolygon && mode === 'idle' && (
                 <>
                   <Button onClick={() => setMode('draw')} className="bg-background text-foreground hover:bg-muted shadow-lg border">
                     <MousePointer2 className="h-4 w-4 mr-2" /> Dibujar en Mapa
                   </Button>
                   <Button onClick={() => setMode('gps')} className="bg-background text-foreground hover:bg-muted shadow-lg border">
                     <Navigation className="h-4 w-4 mr-2" /> Usar GPS
                   </Button>
                 </>
               )}
               {mode === 'draw' && (
                 <div className="flex flex-col gap-2">
                   <div className="bg-background px-4 py-2 rounded-md shadow-lg border text-sm text-center mb-2 font-semibold">
                      Haga clic en el mapa para añadir vértices ({currentPoints.length})
                   </div>
                   <div className="flex gap-2">
                     {currentPoints.length >= 3 && (
                       <Button onClick={handleFinishPoints} className="bg-green-600 hover:bg-green-700 text-white shadow-lg flex-1">
                         Terminar Lote
                       </Button>
                     )}
                     <Button variant="destructive" onClick={handleClear} className="shadow-lg">Cancelar</Button>
                   </div>
                 </div>
               )}
               {mode === 'gps' && (
                 <div className="flex flex-col gap-2">
                   <Button onClick={handleCaptureGpsPoint} className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg h-12 px-6">
                     <MapPin className="h-5 w-5 mr-2" /> Marcar Posición Actual ({currentPoints.length})
                   </Button>
                   <div className="flex gap-2">
                     {currentPoints.length >= 3 && (
                       <Button onClick={handleFinishPoints} className="bg-green-600 hover:bg-green-700 text-white shadow-lg flex-1">
                         Terminar Lote
                       </Button>
                     )}
                     <Button variant="destructive" onClick={handleClear} className="shadow-lg">Cancelar</Button>
                   </div>
                 </div>
               )}
             </div>
          </div>
          
          {/* Bottom Dialog for Naming when completed */}
          {drawnPolygon && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none animate-in slide-in-from-bottom-4">
               <Card className="p-4 w-full max-w-md pointer-events-auto shadow-xl border-primary">
                  <h3 className="font-bold text-lg mb-2 text-primary">Lote Definido</h3>
                  <p className="text-sm text-muted-foreground mb-4">El polígono se ha trazado correctamente. Asigne un identificador para guardarlo.</p>
                  
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
