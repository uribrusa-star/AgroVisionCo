'use client';

import React, { useContext, useTransition, useMemo, useRef } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import { summarizeAgronomistReport } from '@/ai/flows/summarize-agronomist-report';
import { FileDown, Sparkles } from 'lucide-react';


// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}


export function AgronomistReportGenerator() {
  const [isPending, startTransition] = useTransition();
  const { agronomistLogs, phenologyLogs, currentUser, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';

  const logoRef = useRef<HTMLDivElement>(null);
  
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
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4'}) as jsPDFWithAutoTable;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        let logoPngDataUri = '';

        if (logoRef.current) {
            const canvas = await html2canvas(logoRef.current, {backgroundColor: null, scale: 3});
            logoPngDataUri = canvas.toDataURL('image/png');
        }
        
        let yPos = 40;
        const addPageFooter = (docInstance: jsPDF) => {
            const pageCount = docInstance.internal.getNumberOfPages();
            docInstance.setFont('helvetica', 'normal');
            docInstance.setFontSize(9);
            docInstance.setTextColor(150);
            for(let i = 1; i <= pageCount; i++) {
                docInstance.setPage(i);
                docInstance.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right'});
                docInstance.text(`Informe Técnico Agronómico - AgroVision`, 15, pageHeight - 10);
            }
        };
        
        const addPageHeader = (docInstance: jsPDF) => {
            if (logoPngDataUri) {
              docInstance.addImage(logoPngDataUri, 'PNG', 15, 12, 15, 15);
            }
            docInstance.setFont('helvetica', 'bold');
            docInstance.setFontSize(16);
            docInstance.setTextColor(40);
            docInstance.text("Informe Técnico Agronómico", pageWidth / 2, 22, { align: 'center' });
            docInstance.setDrawColor(180);
            docInstance.line(15, 30, pageWidth - 15, 30);
            docInstance.setFont('helvetica', 'normal');
            docInstance.setFontSize(10);
            docInstance.setTextColor(80);
        };
        
        const checkAndAddPage = () => {
            if (yPos > pageHeight - 25) {
                doc.addPage();
                addPageHeader(doc);
                yPos = 40;
            }
        };

        const addSection = (title: string, content: string) => {
            checkAndAddPage();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text(title, 15, yPos);
            yPos += 8;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80);
            
            const splitContent = doc.splitTextToSize(content, pageWidth - 30);
            splitContent.forEach((line: string) => {
                checkAndAddPage();
                doc.text(line, 15, yPos, { align: 'justify' });
                yPos += 5;
            });
            yPos += 10;
        };

        // --- PDF GENERATION ---
        
        if (logoPngDataUri) {
          doc.addImage(logoPngDataUri, 'PNG', pageWidth / 2 - 15, pageHeight / 3 - 10, 30, 30);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(40);
        doc.text('Informe Técnico Agronómico', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha del Informe: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
        doc.text(establishmentData.producer, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

        const aiInput = {
            agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 50)),
            phenologyLogs: JSON.stringify(phenologyLogs.slice(0, 20)),
        };
        const aiResult = await summarizeAgronomistReport(aiInput);

        doc.addPage();
        addPageHeader(doc);
        
        addSection("Análisis Técnico (IA)", aiResult.technicalAnalysis);
        addSection("Conclusiones y Recomendaciones (IA)", aiResult.conclusionsAndRecommendations);
        
        addPageFooter(doc);
        
        doc.save('Informe_Tecnico_Agronomico.pdf');
        
        toast({
            title: '¡Informe Generado!',
            description: 'El archivo PDF se ha descargado exitosamente.',
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
            <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
              <div ref={logoRef} style={{width: '64px', height: '64px'}}>
                 <Image src="/logo.png" alt="AgroVision Logo" width={64} height={64} />
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
