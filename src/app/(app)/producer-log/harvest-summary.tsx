
'use client';

import React, { useContext, useTransition, useMemo, useRef } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { summarizeHarvestData } from '@/ai/flows/summarize-harvest-data';
import { useToast } from '@/hooks/use-toast';
import { MonthlyHarvestChart } from '@/app/(app)/monthly-harvest-chart';
import { BatchYieldChart } from '@/app/(app)/engineer-log/batch-yield-chart';
import { CostDistributionChart } from '../dashboard/cost-distribution-chart';


// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}


export function HarvestSummary() {
  const [isPending, startTransition] = useTransition();
  const { harvests, transactions, agronomistLogs, currentUser, establishmentData, collectorPaymentLogs, packagingLogs, culturalPracticeLogs } = useContext(AppDataContext);
  const { toast } = useToast();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';

  const logoRef = useRef<HTMLDivElement>(null);
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const costChartRef = useRef<HTMLDivElement>(null);
  const batchYieldChartRef = useRef<HTMLDivElement>(null);

  const totalProduction = useMemo(() => harvests.reduce((acc, h) => acc + h.kilograms, 0), [harvests]);
  
  const totalHarvestLaborCost = useMemo(() => collectorPaymentLogs.reduce((acc, p) => acc + p.payment, 0), [collectorPaymentLogs]);
  const totalPackagingLaborCost = useMemo(() => packagingLogs.reduce((acc, p) => acc + p.payment, 0), [packagingLogs]);
  const totalCulturalPracticeCost = useMemo(() => culturalPracticeLogs.reduce((acc, p) => acc + p.payment, 0), [culturalPracticeLogs]);
  
  const otherExpenses = useMemo(() => transactions.filter(t => t.type === 'Gasto'), [transactions]);

  const costByCategory = useMemo(() => {
    const costs: {[key: string]: number} = { 
      'Cosecha': totalHarvestLaborCost,
      'Embalaje': totalPackagingLaborCost,
      'Mano de Obra': totalCulturalPracticeCost,
    };
    
    otherExpenses.forEach(transaction => {
        const { category, amount } = transaction;
        if (!costs[category]) {
            costs[category] = 0;
        }
        costs[category] += amount;
    });

    return costs;
  }, [otherExpenses, totalHarvestLaborCost, totalPackagingLaborCost, totalCulturalPracticeCost]);
  
  const totalCost = useMemo(() => Object.values(costByCategory).reduce((acc, amount) => acc + amount, 0), [costByCategory]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  
  // Use establishment data for calculations, with fallbacks
  const farmArea = establishmentData?.area.strawberry || 1; // Default to 1ha to avoid division by zero
  

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
      if (harvests.length === 0) {
        toast({
            title: 'No hay datos',
            description: 'No se puede generar un informe sin datos de cosecha.',
            variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Generando Informe',
        description: 'Por favor espere, estamos compilando los datos y el análisis de IA...',
      });

      try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4'}) as jsPDFWithAutoTable;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        let logoPngDataUri = '';

        // --- Logo Conversion ---
        if (logoRef.current) {
            const canvas = await html2canvas(logoRef.current, {backgroundColor: null, scale: 3});
            logoPngDataUri = canvas.toDataURL('image/png');
        }
        
        // --- PDF HELPER FUNCTIONS ---
        let yPos = 40;
        const addPageFooter = (docInstance: jsPDF) => {
            const pageCount = docInstance.internal.getNumberOfPages();
            docInstance.setFont('helvetica', 'normal');
            docInstance.setFontSize(9);
            docInstance.setTextColor(150);
            for(let i = 1; i <= pageCount; i++) {
                docInstance.setPage(i);
                docInstance.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right'});
                docInstance.text(`Informe de Producción de Frutilla - AgroVision`, 15, pageHeight - 10);
            }
        };
        
        const addPageHeader = (docInstance: jsPDF) => {
            if (logoPngDataUri) {
              docInstance.addImage(logoPngDataUri, 'PNG', 15, 12, 15, 15);
            }
            docInstance.setFont('helvetica', 'bold');
            docInstance.setFontSize(16);
            docInstance.setTextColor(40);
            docInstance.text("Informe de Producción de Frutilla", pageWidth / 2, 22, { align: 'center' });
            docInstance.setDrawColor(180);
            docInstance.line(15, 30, pageWidth - 15, 30);
            // Reset font for content
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

        const addTable = (title: string, head: any, body: any) => {
            checkAndAddPage();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text(title, 15, yPos);
            yPos += 8;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80);

            doc.autoTable({
                head,
                body,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [38, 70, 83], textColor: 255, font: 'helvetica', fontStyle: 'bold', halign: 'center' },
                bodyStyles: { textColor: 80, font: 'helvetica', halign: 'center' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        const addCharts = async () => {
             if (!monthlyChartRef.current || !costChartRef.current || !batchYieldChartRef.current) return;
            
             if (yPos > pageHeight - 90) { // check for chart space
                doc.addPage();
                addPageHeader(doc);
                yPos = 40;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text("Análisis Gráfico", 15, yPos);
            yPos += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80);

            const monthlyCanvas = await html2canvas(monthlyChartRef.current, { scale: 2, backgroundColor: '#fcfcfc' });
            const costCanvas = await html2canvas(costChartRef.current, { scale: 2, backgroundColor: '#fcfcfc' });
            const batchYieldCanvas = await html2canvas(batchYieldChartRef.current, { scale: 2, backgroundColor: '#fcfcfc' });

            const monthlyImgData = monthlyCanvas.toDataURL('image/png');
            const costImgData = costCanvas.toDataURL('image/png');
            const batchYieldImgData = batchYieldCanvas.toDataURL('image/png');
            
            const chartWidth = 85;
            const chartHeight = 70;

            // Row 1: Monthly Harvest and Batch Yield
            doc.addImage(monthlyImgData, 'PNG', 15, yPos, chartWidth, chartHeight);
            doc.addImage(batchYieldImgData, 'PNG', pageWidth - chartWidth - 15, yPos, chartWidth, chartHeight);
            yPos += chartHeight + 10;
            
            // Row 2: Cost Distribution (centered)
            checkAndAddPage();
            doc.addImage(costImgData, 'PNG', (pageWidth / 2) - (chartWidth / 2), yPos, chartWidth, chartHeight);
            yPos += chartHeight + 15;
        }

        // --- PDF GENERATION ---
        
        // --- COVER PAGE ---
        if (logoPngDataUri) {
          doc.addImage(logoPngDataUri, 'PNG', pageWidth / 2 - 15, pageHeight / 3 - 10, 30, 30);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(40);
        doc.text('Informe de Producción de Frutilla', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha del Informe: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
        doc.text(establishmentData.producer, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

        // --- Get AI Content ---
        const formattedCostByCategory = Object.fromEntries(
            Object.entries(costByCategory).map(([key, value]) => [key, `$${value.toLocaleString('es-AR')}`])
        );

        const aiInput = {
            productionData: JSON.stringify({
              "Superficie Cultivada (ha)": farmArea,
              "Producción Total (kg)": totalProduction.toLocaleString('es-ES'),
              "Rendimiento (kg/ha)": (totalProduction / farmArea).toLocaleString('es-ES', {maximumFractionDigits: 0})
            }),
            costData: JSON.stringify({
              "Costo Total (ARS)": `$${totalCost.toLocaleString('es-AR')}`,
              "Costos por Categoría (ARS)": formattedCostByCategory
            }),
            agronomistLogs: JSON.stringify(agronomistLogs.slice(0, 15).map(l => ({type: l.type, product: l.product, notes: l.notes}))),
        };
        const aiResult = await summarizeHarvestData(aiInput);

        // --- REPORT CONTENT ---
        doc.addPage();
        addPageHeader(doc);
        
        // Section: Producer Data
        addTable("Datos Generales del Establecimiento", 
            [['Productor', 'Localidad', 'Superficie (ha)', 'Variedad']],
            [[establishmentData.producer, `${establishmentData.location.locality}, ${establishmentData.location.province}`, establishmentData.area.strawberry, establishmentData.planting.variety]]
        );

        // Section: AI Executive Summary
        addSection("Resumen Ejecutivo (IA)", aiResult.executiveSummary);

        // Section: Data Tables
        addTable("Resumen de Producción y Rendimiento",
            [['Producción Total (kg)', 'Rendimiento (kg/ha)']],
            [[totalProduction.toLocaleString('es-ES'), (totalProduction / farmArea).toLocaleString('es-ES', {maximumFractionDigits: 0})]]
        );
        
        const costTableHead = [['Categoría', 'Costo Total']];
        const costTableBody = Object.entries(costByCategory).map(([category, amount]) => [
            category,
            `$${amount.toLocaleString('es-AR', {maximumFractionDigits: 2})}`
        ]);
        costTableBody.push(['COSTO TOTAL', `$${totalCost.toLocaleString('es-AR', {maximumFractionDigits: 2})}`]);
        addTable("Desglose de Costos Operativos", costTableHead, costTableBody);
        
        addTable("Balance Financiero (Registrado)",
            [['Ingresos Totales', 'Costos Totales', 'Margen Bruto']],
            [[
                `$${totalIncome.toLocaleString('es-AR', {maximumFractionDigits: 2})}`,
                `$${totalCost.toLocaleString('es-AR', {maximumFractionDigits: 2})}`,
                `$${(totalIncome - totalCost).toLocaleString('es-AR', {maximumFractionDigits: 2})}`
            ]]
        );

        // Section: Charts
        await addCharts();

        // Section: AI Analysis & Recommendations
        addSection("Análisis e Interpretación (IA)", aiResult.analysisAndInterpretation);
        addSection("Conclusiones y Recomendaciones (IA)", aiResult.conclusionsAndRecommendations);
        
        addPageFooter(doc);
        
        doc.save('Informe_Produccion_Frutilla.pdf');
        
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
          <CardTitle>Informe de Cosecha en PDF</CardTitle>
          <CardDescription>Genere un informe de producción profesional con análisis de IA, tablas y gráficos.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                El informe se compilará en un documento PDF formal, ideal para análisis y archivo.
            </p>
            {/* Hidden elements for rendering and capturing */}
            <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
              <div ref={logoRef} style={{width: '64px', height: '64px'}}>
                 <Image src="/logo.png" alt="AgroVision Logo" width={64} height={64} />
              </div>
              <div ref={costChartRef} className='p-4 bg-card w-[450px]'>
                 <CostDistributionChart isForPdf={true} />
              </div>
               <div ref={monthlyChartRef} className="p-4 bg-card w-[450px]">
                   <MonthlyHarvestChart harvests={harvests} />
               </div>
               <div ref={batchYieldChartRef} className="p-4 bg-card w-[450px]">
                    <BatchYieldChart />
               </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGeneratePdf} disabled={isPending || !canManage}>
            {isPending ? 'Generando PDF...' : 'Generar Informe PDF'}
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
