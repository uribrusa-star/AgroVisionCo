
'use client';
import React, { useContext, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";

import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Droplet, Map, MapPin, Sprout, User, Wind, Briefcase, ChevronRight, Plus, Mountain, TrendingUp, Sun, Ruler, CheckCircle, Pencil, Trash2, Image as ImageIcon, Eye, ExternalLink, Trash } from 'lucide-react';
import { BatchBuilder } from '@/components/batch-builder';
import { Skeleton } from "@/components/ui/skeleton";
import { AppDataContext } from "@/context/app-data-context.tsx";
import type { EstablishmentData, UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const MapComponent = dynamic(() => import('@/components/map'), { ssr: false });

const generalSchema = z.object({
  producer: z.string().min(1, "El nombre del productor es requerido."),
  technicalManager: z.string().min(1, "El responsable técnico es requerido."),
  locality: z.string().min(1, "La localidad es requerida."),
  province: z.string().min(1, "La provincia es requerida."),
  coordinates: z.string().min(1, "Las coordenadas son requeridas."),
});

const areaSchema = z.object({
  total: z.coerce.number().min(0, "La superficie debe ser un número positivo."),
  strawberry: z.coerce.number().min(0, "La superficie debe ser un número positivo."),
  system: z.string().min(1, "El sistema productivo es requerido."),
});

const soilSchema = z.object({
  type: z.string().min(1, "El tipo de suelo es requerido."),
  analysis: z.boolean(),
  mulching: z.string().min(1, "El tipo de cobertura es requerido."),
});

const plantingSchema = z.object({
  variety: z.string().min(1, "Las variedades son requeridas."),
  date: z.string().min(1, "La fecha de plantación es requerida."),
  origin: z.string().min(1, "El origen es requerido."),
  density: z.string().min(1, "La densidad es requerida."),
});

const irrigationSchema = z.object({
  system: z.string().min(1, "El sistema de riego es requerido."),
  flowRate: z.string().min(1, "El caudal es requerido."),
  frequency: z.string().min(1, "La frecuencia es requerida."),
  waterAnalysis: z.boolean(),
});

const managementSchema = z.object({
    weeds: z.string().min(1, "El control de malezas es requerido."),
    sanitaryPlan: z.string().min(1, "El plan sanitario es requerido."),
    period: z.string().min(1, "El período de cosecha es requerido."),
    frequency: z.string().min(1, "La frecuencia de cosecha es requerida."),
});

const commercializationSchema = z.object({
    destination: z.string().min(1, "El destino es requerido."),
    objective: z.string().min(1, "El objetivo económico es requerido."),
});

const geoJsonSchema = z.object({
  geoJsonData: z.string().refine(
    (val) => {
      if (!val) return true; // Allow empty string
      try {
        const parsed = JSON.parse(val);
        // Basic GeoJSON validation
        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },
    { message: "El texto ingresado debe ser un objeto GeoJSON válido con un 'type': 'FeatureCollection'." }
  ).optional(),
});


const InfoCard = ({ title, icon: Icon, children, onEdit, editableBy }: { title: string, icon: React.ElementType, children: React.ReactNode, onEdit?: () => void, editableBy?: UserRole[] }) => {
  const { currentUser } = useContext(AppDataContext);
  if (!currentUser) return null;
  const canEdit = editableBy ? editableBy.includes(currentUser.role) : false;

  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">{title}</CardTitle>
            </div>
            {canEdit && onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                  <Pencil className="h-4 w-4" />
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-1 pt-0">
            {children}
        </CardContent>
    </Card>
  )
};

const InfoItem = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between py-3 border-b border-border/50 last:border-0 gap-1 xl:gap-4">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <div className="text-sm xl:text-right font-semibold text-foreground xl:max-w-[60%] break-words">{value}</div>
    </div>
);

const EditDialog = ({ open, onOpenChange, title, description, schema, defaultValues, onSubmit, children }: { open: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, schema: any, defaultValues: any, onSubmit: (values: any) => void, children: React.ReactNode }) => {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: defaultValues,
    });
    
    React.useEffect(() => {
        if(open) {
            form.reset(defaultValues);
        }
    }, [open, defaultValues, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar {title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {children(form)}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


export default function EstablishmentPage() {
  const { loading, establishmentData, updateEstablishmentData, addBatch, deleteBatch, currentUser, batches } = useContext(AppDataContext);
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isBatchBuilderOpen, setIsBatchBuilderOpen] = useState(false);

  // Auto-calculate total strawberry surface from all batch areas
  const totalBatchStrawberryArea = React.useMemo(() => {
    if (!batches || batches.length === 0) return null;
    const total = batches.reduce((sum, batch) => {
      const batchArea = (batch.varieties || []).reduce((s, v) => s + (v.area || 0), 0);
      return sum + batchArea;
    }, 0);
    return total > 0 ? parseFloat(total.toFixed(2)) : null;
  }, [batches]);

  // Sync auto-calculated area to Firestore when it changes
  React.useEffect(() => {
    if (totalBatchStrawberryArea !== null && establishmentData && totalBatchStrawberryArea !== establishmentData.area.strawberry) {
      updateEstablishmentData({ area: { ...establishmentData.area, strawberry: totalBatchStrawberryArea } });
    }
  }, [totalBatchStrawberryArea]);

  const geoJsonForm = useForm<z.infer<typeof geoJsonSchema>>({
    resolver: zodResolver(geoJsonSchema),
    defaultValues: {
      geoJsonData: establishmentData?.geoJsonData || "",
    },
  });

  React.useEffect(() => {
    if (editingSection === 'geoJson') {
      geoJsonForm.reset({ geoJsonData: establishmentData?.geoJsonData || "" });
    }
  }, [editingSection, establishmentData, geoJsonForm]);


  const handleEdit = (section: string) => {
    setEditingSection(section);
  }

  const handleCloseDialog = () => {
    setEditingSection(null);
  }

  const handleSubmit = async (section: keyof EstablishmentData | 'general' | 'area' | 'commercialization' | 'management' | 'geoJson', values: any) => {
      if (!establishmentData) return;
      
      let updatedData: Partial<EstablishmentData> = {};
      
      if(section === 'general') {
        updatedData = {
          producer: values.producer,
          technicalManager: values.technicalManager,
          location: {
            ...establishmentData.location,
            locality: values.locality,
            province: values.province,
            coordinates: values.coordinates,
          }
        }
      } else if (section === 'area') {
        updatedData = {
          area: { total: values.total, strawberry: values.strawberry },
          system: values.system
        }
      } else if (section === 'soil') {
        updatedData = {
          soil: { type: values.type, analysis: values.analysis },
          planting: {...establishmentData.planting, mulching: values.mulching}
        };
      } else if(section === 'commercialization') {
        updatedData = {
            harvest: { ...establishmentData.harvest, destination: values.destination },
            economics: { ...establishmentData.economics, objective: values.objective }
        }
      } else if (section === 'management') {
         updatedData = {
             management: { weeds: values.weeds, sanitaryPlan: values.sanitaryPlan },
             harvest: { ...establishmentData.harvest, period: values.period, frequency: values.frequency }
         };
      } else if (section === 'planting' || section === 'irrigation') {
          updatedData = { [section]: values };
      } else if (section === 'geoJson') {
          updatedData = { geoJsonData: values.geoJsonData || '' };
      }

      try {
        await updateEstablishmentData(updatedData);
        toast({ title: "¡Éxito!", description: "Los datos del establecimiento han sido actualizados."});
        handleCloseDialog();
      } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar los datos.", variant: "destructive"});
      }
  };
  
  const handleBatchBuilderSave = async (points: {lat: number, lng: number}[], batchName: string) => {
      if (!establishmentData) return;
      try {
          const currentGeoJson = parsedGeoJson || { type: "FeatureCollection", features: [] };
          const newFeature = {
              type: "Feature",
              properties: { [batchName]: `Lote ${batchName}` },
              geometry: {
                  type: "Polygon",
                  coordinates: [ points.map(p => [p.lng, p.lat]) ]
              }
          };
          
          const updatedGeoJson = {
              ...currentGeoJson,
              features: [...(currentGeoJson.features || []), newFeature]
          };
          
          await updateEstablishmentData({ geoJsonData: JSON.stringify(updatedGeoJson) });
          
          // Calcular el area automaticamente usando Google Maps Geometry Library
          let calculatedArea: number | undefined = undefined;
          if (window.google?.maps?.geometry?.spherical) {
              const path = points.map(p => new window.google.maps.LatLng(p.lat, p.lng));
              const areaSqMeters = window.google.maps.geometry.spherical.computeArea(path);
              calculatedArea = parseFloat((areaSqMeters / 10000).toFixed(2));
          }
          
          // Add the batch to the data entry list as well
          addBatch({ 
             id: batchName, 
             status: 'pending',
             varieties: calculatedArea ? [{ name: '', area: calculatedArea, plantCount: undefined, plantingDate: '' }] : []
          });
          
          toast({ title: "¡Lote Creado!", description: `El lote ${batchName} ha sido guardado exitosamente con ${calculatedArea ? calculatedArea + ' ha' : 'superficie pendiente'}.`});
      } catch (error) {
          toast({ title: "Error", description: "No se pudo guardar el lote.", variant: "destructive"});
      }
  };

  const handleDeleteBatch = async (batchName: string) => {
      if (!establishmentData || !parsedGeoJson) return;
      
      if (!confirm(`¿Está seguro que desea eliminar el lote ${batchName}?`)) return;

      try {
          const updatedFeatures = parsedGeoJson.features.filter((f: any) => {
             const name = Object.keys(f.properties || {}).find(k => k.startsWith('L'));
             return name !== batchName;
          });
          
          const updatedGeoJson = {
              ...parsedGeoJson,
              features: updatedFeatures
          };
          
          await updateEstablishmentData({ geoJsonData: JSON.stringify(updatedGeoJson) });
          
          // Remove from data entry
          deleteBatch(batchName);
          
          toast({ title: "Lote Eliminado", description: `El lote ${batchName} ha sido eliminado.`});
      } catch (error) {
          toast({ title: "Error", description: "No se pudo eliminar el lote.", variant: "destructive"});
      }
  };
  
  const parsedGeoJson = useMemo(() => {
      try {
          return establishmentData?.geoJsonData ? JSON.parse(establishmentData.geoJsonData) : null;
      } catch {
          return null;
      }
  }, [establishmentData?.geoJsonData]);

  const mapCenter = useMemo(() => {
    if (parsedGeoJson && parsedGeoJson.features && parsedGeoJson.features.length > 0) {
      const firstFeature = parsedGeoJson.features[0];
      if (firstFeature.geometry) {
        if (firstFeature.geometry.type === 'Point') {
          const [lng, lat] = firstFeature.geometry.coordinates;
          return { lat, lng };
        }
        if (firstFeature.geometry.type === 'Polygon') {
          const coords = firstFeature.geometry.coordinates[0];
          if (!coords || coords.length === 0) return { lat: -31.953363, lng: -60.9346299 }; // Fallback
          
          let lat = 0, lng = 0;
          coords.forEach(([coordLng, coordLat]: [number, number]) => {
            lat += coordLat;
            lng += coordLng;
          });
          return { lat: lat / coords.length, lng: lng / coords.length };
        }
      }
    }
    // Fallback to location coordinates or default
    if (establishmentData?.location.coordinates) {
      const [lat, lng] = establishmentData.location.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return { lat: -31.953363, lng: -60.9346299 }; // Default center Coronda
  }, [parsedGeoJson, establishmentData]);


  if (loading || !establishmentData) {
    return (
        <>
            <PageHeader
                title="Perfil del Establecimiento"
                description="Información detallada sobre la finca, el cultivo y las prácticas de manejo."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
                <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
                <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
            </div>
        </>
    );
  }
  
  const producerAccess: UserRole[] = ['Productor'];
  const agronomistAccess: UserRole[] = ['Productor', 'Ingeniero Agronomo'];

  return (
    <>
      <PageHeader
        title="Perfil del Establecimiento"
        description="Información detallada sobre la finca, el cultivo y las prácticas de manejo."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        
        {/* Mapa ocupando 2 columnas al principio */}
        <div className="md:col-span-2 lg:col-span-2">
            <InfoCard title="Mapa del Establecimiento" icon={Map} onEdit={() => handleEdit('geoJson')} editableBy={agronomistAccess}>
                <div className="h-[280px] w-full rounded-xl overflow-hidden z-0 bg-muted/30 border relative">
                   <MapComponent center={mapCenter} geoJsonData={parsedGeoJson} />
                   {agronomistAccess.includes(currentUser?.role as UserRole) && (
                     <Button 
                        onClick={() => setIsBatchBuilderOpen(true)} 
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 shadow-lg"
                     >
                       <Plus className="h-4 w-4 mr-2" /> Añadir Nuevo Lote
                     </Button>
                   )}
                </div>
                {parsedGeoJson?.features?.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lotes Registrados en el Mapa</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedGeoJson.features.map((feature: any, idx: number) => {
                        const name = Object.keys(feature.properties || {}).find(k => k.startsWith('L')) || `Lote ${idx}`;
                        if (feature.geometry?.type !== 'Polygon') return null;
                        
                        return (
                          <div key={name} className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm border shadow-sm transition-all hover:shadow-md">
                             <MapPin className="h-3 w-3 text-primary" />
                             <span className="font-bold text-foreground">{name}</span>
                             {agronomistAccess.includes(currentUser?.role as UserRole) && (
                               <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteBatch(name)}>
                                 <Trash2 className="h-3.5 w-3.5" />
                               </Button>
                             )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </InfoCard>
        </div>

        <InfoCard title="Datos Generales" icon={Briefcase} onEdit={() => handleEdit('general')} editableBy={producerAccess}>
            <InfoItem label="Establecimiento" value={establishmentData.producer} icon={User} />
            <InfoItem label="Responsable" value={establishmentData.technicalManager} icon={User} />
            <InfoItem label="Localidad" value={`${establishmentData.location.locality}, ${establishmentData.location.province}`} icon={MapPin}/>
            <InfoItem
                label="Coordenadas"
                icon={MapPin}
                value={
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${establishmentData.location.coordinates}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    {establishmentData.location.coordinates}
                </a>
                }
            />
        </InfoCard>

        <InfoCard title="Implantación del Cultivo" icon={Sprout} onEdit={() => handleEdit('planting')} editableBy={agronomistAccess}>
            <InfoItem label="Variedades" value={establishmentData.planting.variety} />
            <InfoItem label="Fecha de Plantación" value={new Date(establishmentData.planting.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} />
            <InfoItem label="Origen de Plantas" value={establishmentData.planting.origin} />
            <InfoItem label="Densidad" value={establishmentData.planting.density} />
        </InfoCard>

        <InfoCard title="Manejo y Cosecha" icon={Wind} onEdit={() => handleEdit('management')} editableBy={agronomistAccess}>
            <InfoItem label="Control de Malezas" value={establishmentData.management.weeds} />
            <InfoItem label="Plan Sanitario" value={establishmentData.management.sanitaryPlan} />
            <InfoItem label="Período de Cosecha" value={establishmentData.harvest.period} />
            <InfoItem label="Frecuencia" value={establishmentData.harvest.frequency} />
        </InfoCard>

        <InfoCard title="Riego y Fertirrigación" icon={Droplet} onEdit={() => handleEdit('irrigation')} editableBy={agronomistAccess}>
            <InfoItem label="Sistema de Riego" value={establishmentData.irrigation.system} />
            <InfoItem label="Caudal por Gotero" value={establishmentData.irrigation.flowRate} />
            <InfoItem label="Frecuencia Base" value={establishmentData.irrigation.frequency} />
            <InfoItem label="Análisis de Agua" value={establishmentData.irrigation.waterAnalysis ? <CheckCircle className="h-5 w-5 text-green-500" /> : 'No'} />
        </InfoCard>

        <InfoCard title="Superficie y Sistema" icon={Ruler} onEdit={() => handleEdit('area')} editableBy={producerAccess}>
            <InfoItem label="Superficie Total" value={`${establishmentData.area.total} ha`} />
            <InfoItem label="Destinada a Frutilla" value={
                <span className="flex items-center gap-1.5">
                  {totalBatchStrawberryArea !== null ? totalBatchStrawberryArea : establishmentData.area.strawberry} ha
                  {totalBatchStrawberryArea !== null && <span className="text-xs font-normal text-muted-foreground">(suma de lotes)</span>}
                </span>
              } />
            <InfoItem label="Sistema Productivo" value={establishmentData.system} />
        </InfoCard>

        <InfoCard title="Suelo y Cobertura" icon={Mountain} onEdit={() => handleEdit('soil')} editableBy={agronomistAccess}>
            <InfoItem label="Tipo de Suelo" value={establishmentData.soil.type} />
            <InfoItem label="Análisis Inicial" value={establishmentData.soil.analysis ? <CheckCircle className="h-5 w-5 text-green-500" /> : 'No'} />
            <InfoItem label="Cobertura (Mulching)" value={establishmentData.planting.mulching} />
        </InfoCard>

        <InfoCard title="Comercialización" icon={TrendingUp} onEdit={() => handleEdit('commercialization')} editableBy={producerAccess}>
             <InfoItem label="Destino Principal" value={establishmentData.harvest.destination} />
             <InfoItem label="Objetivo Económico" value={establishmentData.economics.objective} />
        </InfoCard>

        <InfoCard title="Fotos del Establecimiento" icon={ImageIcon} onEdit={() => handleEdit('gallery')} editableBy={producerAccess}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Imágenes cargadas para la ficha técnica y la historia de trazabilidad pública.</p>
              <div className="grid grid-cols-3 gap-2">
                {(establishmentData.images && establishmentData.images.length > 0 ? establishmentData.images : [
                  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                  'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                ]).slice(0, 3).map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-md overflow-hidden bg-muted border">
                    <img src={url} alt={`Establecimiento ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit('gallery')} className="w-full text-xs font-semibold gap-1.5 mt-2">
                <Pencil className="h-3.5 w-3.5" /> Administrar y Previsualizar ({establishmentData.images?.length || 3})
              </Button>
            </div>
        </InfoCard>

      </div>

       {/* Edit Modals */}
       <EditDialog
          open={editingSection === 'general'}
          onOpenChange={handleCloseDialog}
          title="Datos Generales"
          description="Actualice la información principal del establecimiento."
          schema={generalSchema}
          defaultValues={{ 
            producer: establishmentData.producer, 
            technicalManager: establishmentData.technicalManager,
            locality: establishmentData.location.locality,
            province: establishmentData.location.province,
            coordinates: establishmentData.location.coordinates,
          }}
          onSubmit={(values) => handleSubmit('general', values)}
      >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="producer" render={({ field }) => ( <FormItem> <FormLabel>Nombre del Establecimiento</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="technicalManager" render={({ field }) => ( <FormItem> <FormLabel>Responsable Técnico</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="locality" render={({ field }) => ( <FormItem> <FormLabel>Localidad</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="province" render={({ field }) => ( <FormItem> <FormLabel>Provincia</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="coordinates" render={({ field }) => ( <FormItem> <FormLabel>Coordenadas</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </>
          )}
      </EditDialog>

       <EditDialog
          open={editingSection === 'area'}
          onOpenChange={handleCloseDialog}
          title="Superficie y Sistema"
          description="Defina las hectáreas totales y las dedicadas al cultivo."
          schema={areaSchema}
          defaultValues={{ 
              total: establishmentData.area.total,
              strawberry: establishmentData.area.strawberry,
              system: establishmentData.system
           }}
          onSubmit={(values) => handleSubmit('area', values)}
      >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="total" render={({ field }) => ( <FormItem> <FormLabel>Superficie Total (ha)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="strawberry" render={({ field }) => ( <FormItem> <FormLabel>Superficie para Frutilla (ha)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="system" render={({ field }) => ( <FormItem> <FormLabel>Sistema Productivo</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </>
          )}
      </EditDialog>

      <EditDialog
          open={editingSection === 'soil'}
          onOpenChange={handleCloseDialog}
          title="Suelo y Cobertura"
          description="Especifique las características del suelo y el tipo de mulching."
          schema={soilSchema}
          defaultValues={{ type: establishmentData.soil.type, analysis: establishmentData.soil.analysis, mulching: establishmentData.planting.mulching }}
          onSubmit={(values) => handleSubmit('soil', values)}
      >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="type" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Suelo</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="mulching" render={({ field }) => ( <FormItem> <FormLabel>Cobertura (Mulching)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="analysis" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>¿Se realizó análisis de suelo inicial?</FormLabel></div> </FormItem> )} />
              </>
          )}
      </EditDialog>
      
       <EditDialog
          open={editingSection === 'planting'}
          onOpenChange={handleCloseDialog}
          title="Implantación del Cultivo"
          description="Detalles sobre la variedad, fecha y densidad de plantación."
          schema={plantingSchema}
          defaultValues={{ ...establishmentData.planting, date: establishmentData.planting.date.split('T')[0] }}
          onSubmit={(values) => handleSubmit('planting', values)}
      >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="variety" render={({ field }) => ( 
                    <FormItem> 
                      <FormLabel>Variedades</FormLabel> 
                      <FormControl>
                        <>
                          <Input list="known-varieties" placeholder="Ej: San Andreas, Otra" {...field} />
                          <datalist id="known-varieties">
                            <option value="San Andreas" />
                            <option value="Marisma" />
                            <option value="Cleopatra" />
                            <option value="Camarosa" />
                            <option value="Fronteras" />
                            <option value="Monterey" />
                            <option value="Albion" />
                            <option value="Rociera" />
                            <option value="Rábida" />
                          </datalist>
                        </>
                      </FormControl> 
                      <FormMessage /> 
                    </FormItem> 
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => ( <FormItem> <FormLabel>Fecha de Plantación</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="origin" render={({ field }) => ( <FormItem> <FormLabel>Origen de Plantas</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="density" render={({ field }) => ( <FormItem> <FormLabel>Densidad</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </>
          )}
      </EditDialog>

        <EditDialog
          open={editingSection === 'irrigation'}
          onOpenChange={handleCloseDialog}
          title="Riego y Fertirrigación"
          description="Información sobre el sistema de riego y la calidad del agua."
          schema={irrigationSchema}
          defaultValues={{ ...establishmentData.irrigation }}
          onSubmit={(values) => handleSubmit('irrigation', values)}
        >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="system" render={({ field }) => ( <FormItem> <FormLabel>Sistema de Riego</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="flowRate" render={({ field }) => ( <FormItem> <FormLabel>Caudal por Gotero</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="frequency" render={({ field }) => ( <FormItem> <FormLabel>Frecuencia Base</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="waterAnalysis" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>¿Se realizó análisis de agua?</FormLabel></div> </FormItem> )} />
              </>
          )}
      </EditDialog>
      
        <EditDialog
          open={editingSection === 'management'}
          onOpenChange={handleCloseDialog}
          title="Manejo y Cosecha"
          description="Defina las estrategias de manejo del cultivo y la logística de cosecha."
          schema={managementSchema}
          defaultValues={{ weeds: establishmentData.management.weeds, sanitaryPlan: establishmentData.management.sanitaryPlan, period: establishmentData.harvest.period, frequency: establishmentData.harvest.frequency }}
          onSubmit={(values) => handleSubmit('management', values)}
        >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="weeds" render={({ field }) => ( <FormItem> <FormLabel>Control de Malezas</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="sanitaryPlan" render={({ field }) => ( <FormItem> <FormLabel>Plan Sanitario</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="period" render={({ field }) => ( <FormItem> <FormLabel>Período de Cosecha</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="frequency" render={({ field }) => ( <FormItem> <FormLabel>Frecuencia de Cosecha</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </>
          )}
      </EditDialog>

      <EditDialog
          open={editingSection === 'commercialization'}
          onOpenChange={handleCloseDialog}
          title="Comercialización"
          description="Establezca el destino de la producción y los objetivos económicos."
          schema={commercializationSchema}
          defaultValues={{ destination: establishmentData.harvest.destination, objective: establishmentData.economics.objective }}
          onSubmit={(values) => handleSubmit('commercialization', values)}
      >
          {(form: any) => (
              <>
                  <FormField control={form.control} name="destination" render={({ field }) => ( <FormItem> <FormLabel>Destino Principal</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="objective" render={({ field }) => ( <FormItem> <FormLabel>Objetivo Económico</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </>
          )}
      </EditDialog>

      <Dialog open={editingSection === 'geoJson'} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Datos GeoJSON (Avanzado)</DialogTitle>
            <DialogDescription>
              Edición manual cruda del GeoJSON. Recomendamos usar el botón "Añadir Nuevo Lote" en el mapa para crearlos visualmente.
            </DialogDescription>
          </DialogHeader>
          <Form {...geoJsonForm}>
            <form onSubmit={geoJsonForm.handleSubmit((data) => handleSubmit('geoJson', data))} className="space-y-4">
              <FormField
                control={geoJsonForm.control}
                name="geoJsonData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido GeoJSON</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[300px] font-mono text-xs"
                        placeholder='{ "type": "FeatureCollection", "features": [ ... ] }'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="submit">Guardar GeoJSON</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <GalleryEditModal
        open={editingSection === 'gallery'}
        onClose={handleCloseDialog}
        initialImages={establishmentData?.images || [
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
        ]}
        onSave={async (newImages) => {
          try {
            await updateEstablishmentData({ images: newImages });
            toast({ title: "¡Galería Actualizada!", description: "Las imágenes del establecimiento han sido guardadas." });
            handleCloseDialog();
          } catch (e) {
            toast({ title: "Error", description: "No se pudieron actualizar las imágenes.", variant: "destructive" });
          }
        }}
        establishmentData={establishmentData}
      />

      <BatchBuilder 
        open={isBatchBuilderOpen}
        onOpenChange={setIsBatchBuilderOpen}
        onSave={handleBatchBuilderSave}
        initialCenter={mapCenter}
        existingGeoJson={parsedGeoJson}
      />
    </>
  );
}

function GalleryEditModal({
  open,
  onClose,
  initialImages,
  onSave,
  establishmentData
}: {
  open: boolean;
  onClose: () => void;
  initialImages: string[];
  onSave: (images: string[]) => Promise<void>;
  establishmentData: any;
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  React.useEffect(() => {
    if (open) {
      setImages(initialImages.length > 0 ? initialImages : []);
      setNewUrlInput('');
      setActivePreviewIdx(0);
    }
  }, [open, initialImages]);

  const handleAddUrl = () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert('Por favor ingrese una URL válida que comience con http:// o https://');
      return;
    }
    setImages(prev => [...prev, trimmed]);
    setNewUrlInput('');
  };

  const handleRemoveUrl = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIdx >= images.length - 1 && activePreviewIdx > 0) {
      setActivePreviewIdx(activePreviewIdx - 1);
    }
  };

  const handleUpdateUrl = (index: number, val: string) => {
    setImages(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ImageIcon className="h-5 w-5 text-primary" />
            Galería del Establecimiento y Previsualización
          </DialogTitle>
          <DialogDescription>
            Cargue las URLs de las imágenes de su establecimiento (`https://i.imgur.com/example.jpeg`) y previsualice cómo se mostrará a los clientes en la historia de trazabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-2">
          {/* Columna Izquierda: Administración de URLs */}
          <div className="space-y-4">
            <div className="bg-muted/30 p-3 rounded-lg border space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" /> Agregar nueva imagen (URL)
              </label>
              <div className="flex gap-2">
                <Input
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  placeholder="https://i.imgur.com/KoI668P.jpeg"
                  className="text-xs font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUrl();
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddUrl} className="shrink-0 text-xs">
                  Agregar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Soporta links de Imgur, Unsplash, Google Drive (directos), o cualquier link de imagen público.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  URLs Cargadas ({images.length})
                </h4>
                {images.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setImages([])} className="text-xs text-destructive h-6 px-2">
                    Limpiar todas
                  </Button>
                )}
              </div>

              {images.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground text-xs">
                  No se han ingresado imágenes aún. Agregue una URL arriba.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                        activePreviewIdx === idx ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'bg-background hover:bg-muted/40'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                      <Input
                        value={url}
                        onChange={(e) => handleUpdateUrl(idx, e.target.value)}
                        className="text-xs font-mono h-8 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setActivePreviewIdx(idx)}
                        className={`h-8 w-8 shrink-0 ${activePreviewIdx === idx ? 'text-primary' : 'text-muted-foreground'}`}
                        title="Ver en previsualizador"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUrl(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        title="Eliminar URL"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Previsualizador interactivo de Trazabilidad */}
          <div className="space-y-3 bg-gradient-to-b from-muted/20 to-muted/60 p-4 rounded-xl border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> Previsualización en Vivo (Trazabilidad QR)
              </h4>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Modo Cliente
              </span>
            </div>

            {/* Simulación Modal Trazabilidad */}
            <div className="bg-background rounded-lg border shadow-sm p-4 space-y-4">
              <div className="space-y-1 border-b pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-foreground">{establishmentData?.producer || 'Quinta Las Fresas'}</h3>
                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full">
                    Sello BPA Verificado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-red-500" />
                  {establishmentData?.location?.locality || 'Coronda'}, {establishmentData?.location?.province || 'Santa Fe'}
                </p>
              </div>

              {/* Visor de Galería estilo trazabilidad */}
              {images.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
                    <img
                      src={images[activePreviewIdx] || images[0]}
                      alt="Previsualización"
                      className="w-full h-full object-cover transition-all duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80');
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-mono">
                      {activePreviewIdx + 1} / {images.length}
                    </div>
                  </div>

                  {/* Miniaturas de selección */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePreviewIdx(i)}
                          className={`relative h-12 w-16 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                            activePreviewIdx === i ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video rounded-lg border border-dashed flex flex-col items-center justify-center p-4 text-center bg-muted/20">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-1" />
                  <p className="text-xs font-medium text-muted-foreground">Sin fotos cargadas</p>
                  <p className="text-[10px] text-muted-foreground/80">Se mostrarán las imágenes por defecto del sistema.</p>
                </div>
              )}

              {/* Ficha técnica rápida */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-2.5 rounded-md border text-muted-foreground">
                <div><span className="font-semibold text-foreground">Sistema:</span> {establishmentData?.system || 'Bajo túnel'}</div>
                <div><span className="font-semibold text-foreground">Agrónomo:</span> {establishmentData?.technicalManager || 'Ing. Agr. Juan Pérez'}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(images.filter(Boolean))}>
            Guardar Galería de Fotos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
