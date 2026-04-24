'use client';

import React, { useContext, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, 
  FileText, 
  Download, 
  History, 
  Leaf, 
  Sprout, 
  Activity, 
  Calendar,
  Filter,
  ArrowRight
} from 'lucide-react';

import { AppDataContext } from '@/context/app-data-context.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateTraceabilityPDF, generateMonthlyProductionPDF } from '@/lib/pdf-generator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function TraceabilityPage() {
  const { 
    batches, 
    harvests, 
    agronomistLogs, 
    phenologyLogs, 
    establishmentData,
    loading 
  } = useContext(AppDataContext);
  const { toast } = useToast();

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const selectedBatch = useMemo(() => 
    batches.find(b => b.id === selectedBatchId), 
    [batches, selectedBatchId]
  );

  const timelineEvents = useMemo(() => {
    if (!selectedBatchId) return [];

    const batchHarvests = harvests.filter(h => h.batchNumber === selectedBatchId);
    const batchAgLogs = agronomistLogs.filter(l => 
      (l.batchIds && l.batchIds.includes(selectedBatchId)) || (l.batchId === selectedBatchId)
    );
    const batchPhenology = phenologyLogs.filter(p => 
      (p.batchIds && p.batchIds.includes(selectedBatchId)) || (p.batchId === selectedBatchId)
    );

    const events = [
      ...batchPhenology.map(p => ({
        id: p.id,
        date: new Date(p.date),
        type: 'phenology',
        title: p.developmentState,
        description: p.notes,
        icon: Sprout,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50'
      })),
      ...batchAgLogs.map(l => ({
        id: l.id,
        date: new Date(l.date),
        type: 'agronomist',
        title: `${l.type}: ${l.product || ''}`,
        description: l.notes,
        icon: Leaf,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50'
      })),
      ...batchHarvests.map(h => ({
        id: h.id,
        date: new Date(h.date),
        type: 'harvest',
        title: `Cosecha: ${h.kilograms}kg`,
        description: `ID: ${h.traceabilityId}`,
        icon: Activity,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50'
      }))
    ];

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedBatchId, harvests, agronomistLogs, phenologyLogs]);

  const handleExportTraceability = async () => {
    if (!selectedBatch) return;
    
    toast({
      title: 'Generando Reporte',
      description: 'Estamos preparando el historial de trazabilidad...',
    });

    try {
      let logoPngDataUri = '';
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        logoPngDataUri = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Error loading logo:", e);
      }

      const batchHarvests = harvests.filter(h => h.batchNumber === selectedBatchId);
      const batchAgLogs = agronomistLogs.filter(l => 
        (l.batchIds && l.batchIds.includes(selectedBatchId)) || (l.batchId === selectedBatchId)
      );
      const batchPhenology = phenologyLogs.filter(p => 
        (p.batchIds && p.batchIds.includes(selectedBatchId)) || (p.batchId === selectedBatchId)
      );

      generateTraceabilityPDF(selectedBatch, batchHarvests, batchAgLogs, batchPhenology, establishmentData, logoPngDataUri);
      
      toast({
        title: 'Reporte Generado',
        description: 'El PDF de trazabilidad se ha descargado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el reporte PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleExportMonthly = async () => {
    toast({
      title: 'Exportando Mes',
      description: 'Generando reporte de producción mensual...',
    });

    try {
      let logoPngDataUri = '';
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        logoPngDataUri = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Error loading logo:", e);
      }

      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1);
      const monthlyHarvests = harvests.filter(h => {
          const hDate = new Date(h.date);
          return hDate.getFullYear() === year && hDate.getMonth() === month - 1;
      });

      generateMonthlyProductionPDF(monthlyHarvests, date, establishmentData, logoPngDataUri);

      toast({
        title: 'Mes Exportado',
        description: 'El reporte de producción mensual está listo.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar el reporte mensual.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trazabilidad y Reportes</h1>
          <p className="text-muted-foreground italic">Historial completo del cultivo y exportación de datos oficiales.</p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Seleccionar Mes" />
                </SelectTrigger>
                <SelectContent>
                    {/* Generar últimos 6 meses */}
                    {Array.from({ length: 6 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        const val = format(d, 'yyyy-MM');
                        return (
                            <SelectItem key={val} value={val}>
                                {format(d, 'MMMM yyyy', { locale: es }).charAt(0).toUpperCase() + format(d, 'MMMM yyyy', { locale: es }).slice(1)}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportMonthly}>
                <Download className="mr-2 h-4 w-4" /> Exportar Mes
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Selector and Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Seleccionar Lote
              </CardTitle>
              <CardDescription>Visualiza la trazabilidad por sector.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un lote..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>Lote {b.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBatch && (
                <div className="pt-4 space-y-4">
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Variedades</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBatch.varieties?.map((v, i) => (
                        <Badge key={i} variant="secondary">{v.name} ({v.plantCount})</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Estado</p>
                      <p className={cn("capitalize font-bold", selectedBatch.status === 'completed' ? 'text-emerald-600' : 'text-blue-600')}>
                        {selectedBatch.status === 'completed' ? 'Finalizado' : 'Activo'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Inicio</p>
                      <p>{format(new Date(selectedBatch.preloadedDate), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleExportTraceability}>
                    <FileText className="mr-2 h-4 w-4" /> Generar PDF Lote {selectedBatch.id}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm">Consejo de Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La trazabilidad completa permite identificar el origen de cada gramo cosechado. 
                Asegúrate de registrar los estados fenológicos regularmente para un historial perfecto.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Cronología del Cultivo
                </CardTitle>
                <CardDescription>Eventos ordenados por fecha.</CardDescription>
              </div>
              {selectedBatchId && (
                <Badge variant="outline" className="bg-primary/5">
                  {timelineEvents.length} Eventos
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {!selectedBatchId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="bg-muted p-4 rounded-full">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="max-w-[250px]">
                    <p className="font-medium text-lg text-muted-foreground">Sin selección</p>
                    <p className="text-sm text-muted-foreground">Selecciona un lote para ver su historial de trazabilidad.</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="relative space-y-8 ml-4 mr-2 pb-4">
                    {/* Vertical line */}
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border -ml-[1px]" />
                    
                    {timelineEvents.map((event, index) => (
                      <div key={event.id} className="relative pl-8">
                        {/* Dot */}
                        <div className={cn(
                          "absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center shadow-sm z-10",
                          event.bgColor
                        )}>
                          <event.icon className={cn("h-4 w-4", event.color)} />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              {format(event.date, "dd 'de' MMMM, yyyy", { locale: es })}
                            </span>
                            <Badge variant="secondary" className="text-[9px] h-5 py-0 px-2">
                                {event.type === 'phenology' ? 'Fenología' : event.type === 'harvest' ? 'Cosecha' : 'Bitácora'}
                            </Badge>
                          </div>
                          <h4 className="text-sm md:text-base font-semibold leading-tight">{event.title}</h4>
                          {event.description && (
                            <p className="text-xs md:text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Start event */}
                    <div className="relative pl-8">
                         <div className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-background bg-slate-900 flex items-center justify-center shadow-sm z-10">
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                             <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              {format(new Date(selectedBatch.preloadedDate), "dd 'de' MMMM, yyyy", { locale: es })}
                            </span>
                            <h4 className="text-sm md:text-base font-semibold">Inicio del Ciclo de Lote</h4>
                            <p className="text-xs md:text-sm text-muted-foreground">Lote precargado en el sistema.</p>
                        </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
