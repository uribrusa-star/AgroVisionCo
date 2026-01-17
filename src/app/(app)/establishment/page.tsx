
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
import { Droplet, MapPin, Milestone, Mountain, Sprout, Wind, TrendingUp, Sun, Ruler, CheckCircle, Pencil, User, Briefcase, Map } from 'lucide-react';
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
  if (!currentUser) return null; // Guard clause
  const canEdit = editableBy ? editableBy.includes(currentUser.role) : false;

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            <div className="flex items-center gap-2">
              {canEdit && onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-6 w-6">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Icon className="h-6 w-6 text-primary" />
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
  )
};

const InfoItem = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex justify-between items-start py-2 border-b border-dashed">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <div className="text-sm text-right font-semibold text-foreground max-w-[60%] break-words">{value}</div>
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
  const { loading, establishmentData, updateEstablishmentData, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna 1 */}
        <div className="space-y-6">
            <InfoCard title="Datos Generales" icon={Briefcase} onEdit={() => handleEdit('general')} editableBy={producerAccess}>
               <InfoItem label="Productor" value={establishmentData.producer} icon={User} />
               <InfoItem label="Responsable Técnico" value={establishmentData.technicalManager} icon={User} />
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

            <InfoCard title="Mapa del Establecimiento (GeoJSON)" icon={Map} onEdit={() => handleEdit('geoJson')} editableBy={agronomistAccess}>
                <div className="h-64 w-full rounded-md overflow-hidden z-0 bg-muted">
                   <MapComponent center={mapCenter} geoJsonData={parsedGeoJson} />
                </div>
            </InfoCard>
        </div>

        {/* Columna 2 */}
        <div className="space-y-6">
            <InfoCard title="Superficie y Sistema" icon={Ruler} onEdit={() => handleEdit('area')} editableBy={producerAccess}>
               <InfoItem label="Superficie Total" value={`${establishmentData.area.total} ha`} />
               <InfoItem label="Destinada a Frutilla" value={`${establishmentData.area.strawberry} ha`} />
               <InfoItem label="Sistema Productivo" value={establishmentData.system} />
            </InfoCard>
            
            <InfoCard title="Suelo y Cobertura" icon={Mountain} onEdit={() => handleEdit('soil')} editableBy={agronomistAccess}>
               <InfoItem label="Tipo de Suelo" value={establishmentData.soil.type} />
               <InfoItem label="Análisis Inicial" value={establishmentData.soil.analysis ? <CheckCircle className="h-5 w-5 text-green-500" /> : 'No'} />
               <InfoItem label="Cobertura (Mulching)" value={establishmentData.planting.mulching} />
            </InfoCard>

            <InfoCard title="Manejo y Cosecha" icon={Wind} onEdit={() => handleEdit('management')} editableBy={agronomistAccess}>
                <InfoItem label="Control de Malezas" value={establishmentData.management.weeds} />
                <InfoItem label="Plan Sanitario" value={establishmentData.management.sanitaryPlan} />
                <InfoItem label="Período de Cosecha" value={establishmentData.harvest.period} />
                <InfoItem label="Frecuencia" value={establishmentData.harvest.frequency} />
            </InfoCard>

        </div>

        {/* Columna 3 */}
        <div className="space-y-6">
            <InfoCard title="Implantación del Cultivo" icon={Sprout} onEdit={() => handleEdit('planting')} editableBy={agronomistAccess}>
                <InfoItem label="Variedades" value={establishmentData.planting.variety} />
                <InfoItem label="Fecha de Plantación" value={new Date(establishmentData.planting.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} />
                <InfoItem label="Origen de Plantas" value={establishmentData.planting.origin} />
                <InfoItem label="Densidad" value={establishmentData.planting.density} />
            </InfoCard>

            <InfoCard title="Riego y Fertirrigación" icon={Droplet} onEdit={() => handleEdit('irrigation')} editableBy={agronomistAccess}>
                <InfoItem label="Sistema de Riego" value={establishmentData.irrigation.system} />
                <InfoItem label="Caudal por Gotero" value={establishmentData.irrigation.flowRate} />
                <InfoItem label="Frecuencia Base" value={establishmentData.irrigation.frequency} />
                <InfoItem label="Análisis de Agua" value={establishmentData.irrigation.waterAnalysis ? <CheckCircle className="h-5 w-5 text-green-500" /> : 'No'} />
            </InfoCard>

            <InfoCard title="Comercialización" icon={TrendingUp} onEdit={() => handleEdit('commercialization')} editableBy={producerAccess}>
                 <InfoItem label="Destino Principal" value={establishmentData.harvest.destination} />
                 <InfoItem label="Objetivo Económico" value={establishmentData.economics.objective} />
            </InfoCard>
        </div>
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
                  <FormField control={form.control} name="producer" render={({ field }) => ( <FormItem> <FormLabel>Nombre del Productor</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
                  <FormField control={form.control} name="variety" render={({ field }) => ( <FormItem> <FormLabel>Variedades</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
          onSubmit={(values) => handleSubmit('management', { ...establishmentData.management, weeds: values.weeds, sanitaryPlan: values.sanitaryPlan, harvest: { ...establishmentData.harvest, period: values.period, frequency: values.frequency } })}
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
            <DialogTitle>Editar Datos GeoJSON</DialogTitle>
            <DialogDescription>
              Pegue aquí el contenido de su archivo GeoJSON para definir los lotes y puntos de interés en el mapa. Asegúrese de que cada lote (polígono) tenga una propiedad "name" con su ID (ej. "L001").
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

    </>
  );
}
