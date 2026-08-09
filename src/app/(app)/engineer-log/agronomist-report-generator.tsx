'use client';

import React, { useContext, useTransition, useRef } from 'react';
import Image from 'next/image';


import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import { summarizeAgronomistReport } from '@/ai/flows/summarize-agronomist-report';
import { getRelevantKnowledge } from '@/ai/knowledge/strawberry-knowledge';
import { FileDown, Sparkles } from 'lucide-react';

import { PhenologyEvolutionChart } from './phenology-evolution-chart';
import { MonthlyHarvestChart } from '@/app/(app)/monthly-harvest-chart';
import { BatchYieldChart } from '@/app/(app)/engineer-log/batch-yield-chart';





export function AgronomistReportGenerator() {
  const [isPending, startTransition] = useTransition();
  const { agronomistLogs, phenologyLogs, currentUser, establishmentData, harvests, batches, supplies } = useContext(AppDataContext);
  const { toast } = useToast();

  const phenologyRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';
  
  const handleGeneratePdf = () => {
    startTransition(async () => {
      if (!establishmentData) {
        toast({
            title: 'Datos no disponibles',
            description: 'No se pueden cargar los datos del establecimiento para generar el informe.',
            variant: 'destructive',
        });
        return;
      }
      if (agronomistLogs.length === 0 && phenologyLogs.length === 0) {
        toast({
            title: 'No hay datos',
            description: 'No se puede generar un informe sin registros en las bitácoras.',
            variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Generando Informe Técnico',
        description: 'Por favor espere, la IA está analizando las bitácoras...',
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

        const uniqueVarieties = Array.from(new Set(batches.flatMap(b => b.varieties?.map(v => v.name) || [])));
        const varietyKnowledge = getRelevantKnowledge(uniqueVarieties);

        const batchesData = batches.map(b => ({
            id: b.id,
            status: b.status,
            varieties: b.varieties?.map(v => `${v.name} (${v.area || 0} ha)`).join(', ') || 'N/A'
        }));

        const suppliesData = supplies.map(s => ({
            name: s.name,
            type: s.type,
            activeIngredient: s.info.activeIngredient,
            stock: s.stock,
            recommendedDose: s.info.dose
        }));

        const aiInput = {
            agronomistLogs: JSON.stringify(agronomistLogs),
            phenologyLogs: JSON.stringify(phenologyLogs),
            harvestLogs: JSON.stringify(harvests.map(h => ({ date: h.date, kg: h.kilograms, batch: h.batchNumber }))),
            establishmentData: JSON.stringify(establishmentData),
            batchesData: JSON.stringify(batchesData),
            suppliesData: JSON.stringify(suppliesData),
            varietyKnowledge: varietyKnowledge,
        };
        const aiResult = await summarizeAgronomistReport(aiInput);

        const captureChart = async (ref: React.RefObject<HTMLDivElement>) => {
            if (!ref.current) return '';
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(ref.current, { scale: 3, backgroundColor: '#ffffff' });
            return canvas.toDataURL('image/png');
        };

        const [phenologyImg, monthlyHarvestImg, batchYieldImg] = await Promise.all([
            captureChart(phenologyRef),
            captureChart(monthlyRef),
            captureChart(batchRef)
        ]);

        const { generateAgronomistReportPDF } = await import('@/lib/pdf-generator');
        
        await generateAgronomistReportPDF(
            establishmentData,
            currentUser.name,
            aiResult,
            {
                phenology: phenologyImg,
                monthlyHarvest: monthlyHarvestImg,
                batchYield: batchYieldImg
            },
            logoPngDataUri,
            batches,
            harvests
        );
        
        toast({
            title: '¡Informe Generado!',
            description: 'El archivo PDF profesional se ha descargado exitosamente.',
        });

      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
          title: 'Error al Generar Informe',
          description: 'No se pudo generar el resumen con IA o compilar el PDF.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Informe Técnico Agronómico
            </CardTitle>
          <CardDescription>Genere un informe técnico en PDF con un análisis de IA sobre las bitácoras del agrónomo y de fenología.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                El informe compilará y analizará las últimas entradas de las bitácoras para ofrecer conclusiones y recomendaciones, junto con un análisis gráfico.
            </p>
            {/* Elementos ocultos para la captura PDF con html2canvas */}
            <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
              <div ref={phenologyRef} className="p-4 bg-card w-[600px]">
                  <PhenologyEvolutionChart />
              </div>
              <div ref={monthlyRef} className="p-4 bg-card w-[600px]">
                  <MonthlyHarvestChart harvests={harvests} />
              </div>
              <div ref={batchRef} className="p-4 bg-card w-[600px]">
                  <BatchYieldChart />
              </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGeneratePdf} disabled={isPending || !canManage}>
            <FileDown className="mr-2 h-4 w-4" />
            {isPending ? 'Generando Informe...' : 'Generar Informe PDF'}
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
