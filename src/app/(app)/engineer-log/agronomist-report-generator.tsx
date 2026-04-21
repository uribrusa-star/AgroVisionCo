'use client';

import React, { useContext, useTransition, useMemo } from 'react';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import { summarizeAgronomistReport } from '@/ai/flows/summarize-agronomist-report';
import { FileDown, Sparkles } from 'lucide-react';





export function AgronomistReportGenerator() {
  const [isPending, startTransition] = useTransition();
  const { agronomistLogs, phenologyLogs, currentUser, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();

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

        const aiInput = {
            agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 50)),
            phenologyLogs: JSON.stringify(phenologyLogs.slice(0, 20)),
            establishmentData: JSON.stringify(establishmentData),
        };
        const aiResult = await summarizeAgronomistReport(aiInput);

        const { generateAgronomistReportPDF } = await import('@/lib/pdf-generator');
        
        generateAgronomistReportPDF(
            establishmentData,
            currentUser.name,
            aiResult,
            logoPngDataUri
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
                El informe compilará y analizará las últimas entradas de las bitácoras para ofrecer conclusiones y recomendaciones.
            </p>
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
