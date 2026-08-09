import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Batch, Harvest, AgronomistLog, PhenologyLog, EstablishmentData } from './types';
import type { SummarizeAgronomistReportOutput } from '@/ai/flows/summarize-agronomist-report';
import type { SummarizeHarvestDataOutput } from '@/ai/flows/summarize-harvest-data';

export const generateTraceabilityPDF = (
  batch: Batch,
  harvests: Harvest[],
  agronomistLogs: AgronomistLog[],
  phenologyLogs: PhenologyLog[],
  establishment: EstablishmentData | null,
  logoDataUri?: string,
  aiSummary?: string
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const darkGreen = [20, 83, 45];   // #14532D
  const mediumGreen = [34, 197, 94]; // #22C55E
  const lightGreen = [240, 253, 244]; // #F0FDF4
  const techGrey = [75, 85, 99];     // #4B5563

  const addHeader = (isCover = false) => {
    if (!isCover) {
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, 0, pageWidth, 20, 'F');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 10, 4, 12, 12);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE TRAZABILIDAD INTEGRAL', 25, 12);
      doc.setFont('helvetica', 'normal');
      doc.text(establishment?.producer || 'AgroVista', 25, 16);
      doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 10, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text('AgroVista AI - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Trazabilidad Oficial', pageWidth - 10, pageHeight - 7, { align: 'right' });
    }
  };

  // --- PORTADA ---
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setDrawColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.setLineWidth(2);
  doc.line(20, 40, 20, 250);
  
  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 25, 60, 50, 50);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE', 30, 140);
  doc.text('TRAZABILIDAD', 30, 155);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.text('LOTE IDENTIFICADO', 30, 180);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(`LOTE #${batch.id}`, 30, 192);

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(`Variedad: ${batch.varieties?.map(v => v.name).join(', ') || 'N/A'}`, 30, 202);
  doc.text(`Establecimiento: ${establishment?.producer || 'N/A'}`, 30, 208);
  doc.text(`Fecha de Inicio: ${format(new Date(batch.preloadedDate), "dd 'de' MMMM, yyyy", { locale: es })}`, 30, 214);

  // --- DETALLES ---
  doc.addPage();
  addHeader();
  let yPos = 35;

  if (aiSummary) {
    let finalY = 35;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text('SÍNTESIS DE LA CAMPAÑA (IA)', 15, finalY);
    finalY += 12;

    const renderMarkdown = (text: string, startX: number, startY: number, maxW: number) => {
      let currentY = startY;
      let normalized = text.replace(/(\d+\.\s\*\*)/g, '\n$1');
      normalized = normalized.replace(/\n{3,}/g, '\n\n').trim();
      const paragraphs = normalized.split('\n');

      paragraphs.forEach(paragraph => {
        if (!paragraph.trim()) {
          currentY += 4;
          return;
        }

        if (currentY > pageHeight - 30) {
          doc.addPage();
          addHeader();
          doc.setTextColor(30, 30, 30);
          currentY = 35;
        }

        const parts = paragraph.split('**');
        let currentX = startX;
        let lineHeight = 5;

        parts.forEach((part, index) => {
          if (!part) return;
          const isBold = index % 2 === 1;
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');
          
          const words = part.split(/(\s+)/);
          words.forEach(word => {
            if (!word) return;
            const wordWidth = doc.getTextWidth(word + ' ');
            
            if (currentX + wordWidth > startX + maxW && word.trim() !== '') {
              currentY += lineHeight;
              currentX = startX;
              if (currentY > pageHeight - 30) {
                doc.addPage();
                addHeader();
                doc.setTextColor(30, 30, 30);
                currentY = 35;
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
              }
              if (word.trim() === '') return;
            }
            
            doc.text(word, currentX, currentY);
            currentX += wordWidth;
          });
        });
        currentY += lineHeight + 4;
      });
      return currentY;
    };

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    yPos = renderMarkdown(aiSummary, 15, finalY, pageWidth - 30) + 15;
    
    // Forzar siempre una nueva página después del resumen de la IA para que la tabla no quede cortada
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('INFORMACIÓN DEL LOTE', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Dato', 'Detalle']],
    body: [
      ['Estado Actual', batch.status === 'completed' ? 'Finalizado' : 'En curso'],
      ['Certificación BPA / G.A.P.', 'CUMPLIDO - Carencia PHI 0 y Buenas Prácticas Verificadas (BPA/GAP)'],
      ['Variedades y Cantidad', batch.varieties?.map(v => v.plantCount ? `${v.name} (${v.plantCount})` : v.name).join(', ') || 'N/A'],
      ['Fecha de Siembra/Inicio', format(new Date(batch.preloadedDate), 'dd/MM/yyyy')],
      ['Productor', establishment?.producer || 'N/A'],
      ['Ubicación', `${establishment?.location.locality || 'N/A'}, ${establishment?.location.province || 'N/A'}`],
    ],
    headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGreen },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', textColor: [20, 83, 45] },
      1: { cellWidth: 'auto', textColor: [31, 41, 55] }
    },
    styles: { cellPadding: 4, overflow: 'linebreak', fontSize: 10 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('CRONOLOGÍA DE EVENTOS', 15, yPos);
  yPos += 10;

  const events = [
    ...phenologyLogs.map(p => ({ date: new Date(p.date), type: 'Fenología', desc: p.developmentState, notes: p.notes })),
    ...agronomistLogs.map(a => ({ 
      date: new Date(a.date), 
      type: `Bitácora: ${a.type}`, 
      desc: (a.supplies && a.supplies.length > 0 
        ? a.supplies.map(s => `${s.name} (${s.quantity})`).join(', ') 
        : (a.product ? `${a.product} (${a.quantityUsed})` : '-')) + (a.dissolution ? ` [Prep: ${a.dissolution}]` : ''), 
      notes: a.notes 
    })),
    ...harvests.map(h => ({ date: new Date(h.date), type: 'Cosecha', desc: `${h.kilograms} kg`, notes: `ID: ${h.traceabilityId}` })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Tipo de Evento', 'Descripción', 'Notas']],
    body: events.map(e => [
      format(e.date, 'dd/MM/yyyy'),
      e.type,
      e.desc,
      e.notes || '-'
    ]),
    headStyles: { fillColor: darkGreen, textColor: 255 },
    alternateRowStyles: { fillColor: lightGreen },
    styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 60 }
    }
  });



  addFooter();
  doc.save(`Trazabilidad_Lote_${batch.id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateMonthlyProductionPDF = (
  harvests: Harvest[],
  month: Date,
  establishment: EstablishmentData | null,
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const monthName = format(month, 'MMMM yyyy', { locale: es });
  
  // Colors
  const darkBlue = [30, 58, 138];   // #1E3A8A
  const mediumBlue = [59, 130, 246]; // #3B82F6
  const lightBlue = [239, 246, 255]; // #EFF6FF

  const addHeader = (isCover = false) => {
    if (!isCover) {
      doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.rect(0, 0, pageWidth, 20, 'F');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 10, 4, 12, 12);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE PRODUCCIÓN MENSUAL', 25, 12);
      doc.setFont('helvetica', 'normal');
      doc.text(establishment?.producer || 'AgroVista', 25, 16);
      doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 10, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text('AgroVista AI - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Producción Certificada', pageWidth - 10, pageHeight - 7, { align: 'right' });
    }
  };

  // --- PORTADA ---
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setDrawColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.setLineWidth(2);
  doc.line(20, 40, 20, 250);
  
  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 25, 60, 50, 50);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE', 30, 140);
  doc.text('PRODUCCIÓN', 30, 155);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.text('PERIODO MENSUAL', 30, 180);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(monthName.toUpperCase(), 30, 192);

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(`Establecimiento: ${establishment?.producer || 'N/A'}`, 30, 202);
  doc.text(`Total Cosechado: ${harvests.reduce((acc, h) => acc + h.kilograms, 0).toFixed(2)} kg`, 30, 208);
  doc.text(`Fecha de Emisión: ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}`, 30, 214);

  // --- DETALLE ---
  doc.addPage();
  addHeader();
  let yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('RESUMEN DEL PERIODO', 15, yPos);
  yPos += 10;

  const totalKg = harvests.reduce((acc, h) => acc + h.kilograms, 0);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Cosechado (kg)', totalKg.toFixed(2)],
      ['Cantidad de Ingresos', harvests.length.toString()],
      ['Establecimiento', establishment?.producer || 'N/A'],
    ],
    headStyles: { fillColor: darkBlue, textColor: 255 },
    alternateRowStyles: { fillColor: lightBlue },
    styles: { cellPadding: 4 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('DETALLE DE COSECHAS', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Lote', 'Variedad', 'Kilos', 'Recolector', 'ID Trazabilidad']],
    body: harvests.map(h => [
      format(new Date(h.date), 'dd/MM/yyyy'),
      h.batchNumber,
      'Frutilla',
      `${h.kilograms} kg`,
      h.collector.name,
      h.traceabilityId
    ]),
    headStyles: { fillColor: darkBlue, textColor: 255 },
    alternateRowStyles: { fillColor: lightBlue },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  addFooter();
  doc.save(`Produccion_Mensual_${format(month, 'yyyy_MM')}.pdf`);
};

export const generateAgronomistReportPDF = (
  establishment: EstablishmentData,
  agronomistName: string,
  reportData: SummarizeAgronomistReportOutput,
  chartImages?: {
    phenology: string;
    monthlyHarvest: string;
    batchYield: string;
  },
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  const darkGreen = [20, 83, 45];
  const mediumGreen = [34, 197, 94];
  const lightGreen = [240, 253, 244];
  const techGrey = [75, 85, 99];
  const alertRed = [220, 38, 38];
  const alertYellow = [234, 179, 8];

  const addHeader = (isCover = false) => {
    if (!isCover) {
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, 0, pageWidth, 20, 'F');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 10, 4, 12, 12);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORME TÉCNICO AGRONÓMICO', 25, 12);
      doc.setFont('helvetica', 'normal');
      doc.text(establishment.producer, 25, 16);
      doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 10, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text('AgroVista - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Confidencial', pageWidth - 10, pageHeight - 7, { align: 'right' });
    }
  };

  // --- PORTADA (Página 1) ---
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setDrawColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.setLineWidth(2);
  doc.line(20, 40, 20, 250);
  
  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 25, 60, 50, 50);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME TÉCNICO', 30, 140);
  doc.text('AGRONÓMICO', 30, 155);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.text('ESTABLECIMIENTO', 30, 180);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(establishment.producer.toUpperCase(), 30, 192);

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(`Ubicación: ${establishment.location.locality}, ${establishment.location.province}`, 30, 202);
  doc.text(`Sistema: ${establishment.system}`, 30, 208);
  doc.text(`Fecha: ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}`, 30, 214);

  doc.setFontSize(14);
  doc.setTextColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.text('PROFESIONAL RESPONSABLE', 30, 240);
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(agronomistName.toUpperCase(), 30, 250);

  // --- DASHBOARD & ALERTAS (Página 2) ---
  doc.addPage();
  addHeader();
  let yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('DASHBOARD EJECUTIVO', 15, yPos);
  yPos += 10;

  const cardWidth = (pageWidth - 45) / 4;
  
  const drawKpiCard = (title: string, value: string, riskLevel: string | number, xPos: number) => {
    let color = darkGreen;
    if (riskLevel === 'Medio' || riskLevel === 'Atención' || riskLevel === 'Alerta') color = alertYellow;
    if (riskLevel === 'Alto' || riskLevel === 'Riesgo' || riskLevel === 'Crítico' || (typeof riskLevel === 'number' && riskLevel > 0)) color = alertRed;

    doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.roundedRect(xPos, yPos, cardWidth, 20, 2, 2, 'FD');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    doc.text(title, xPos + 5, yPos + 6);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(color[0], color[1], color[2]);
    const valText = doc.splitTextToSize(String(value).toUpperCase(), cardWidth - 10);
    doc.text(valText, xPos + 5, yPos + 14);
  };

  drawKpiCard('ESTADO', reportData.executiveSummary.generalStatus, reportData.executiveSummary.generalStatus, 15);
  drawKpiCard('CLIMA', reportData.executiveSummary.climateRisk, reportData.executiveSummary.climateRisk, 15 + cardWidth + 5);
  drawKpiCard('SANIDAD', reportData.technicalAnalysis.health.risk, reportData.technicalAnalysis.health.risk, 15 + (cardWidth + 5) * 2);
  drawKpiCard('STOCK CRÍTICO', `${reportData.executiveSummary.criticalAlertsCount} ALERTAS`, reportData.executiveSummary.criticalAlertsCount, 15 + (cardWidth + 5) * 3);

  yPos += 28;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('RESUMEN Y RECOMENDACIÓN', 15, yPos);
  yPos += 6;

  const summaryText = reportData.executiveSummary.conclusions.join(" ") + " " + reportData.executiveSummary.mainRecommendation;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 30);
  doc.text(summaryLines, 15, yPos);
  yPos += (summaryLines.length * 5) + 8;

  // ALERTAS CRITICAS
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(alertRed[0], alertRed[1], alertRed[2]);
  doc.text('ALERTAS CRÍTICAS E INVENTARIO', 15, yPos);
  yPos += 8;

  if (reportData.alerts.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Evento Detectado', 'Nivel Riesgo', 'Acción Sugerida']],
      body: reportData.alerts.map(a => [a.date, a.event, a.risk, a.recommendation]),
      headStyles: { fillColor: alertRed, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { width: 22 },
        1: { width: 45 },
        2: { width: 22, fontStyle: 'bold' },
        3: { width: 85 }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    doc.text('No se detectaron alertas críticas operativas o de inventario.', 15, yPos);
    yPos += 10;
  }

  // --- ANÁLISIS DE CAMPO Y FENOLOGÍA (Página 3) ---
  doc.addPage();
  addHeader();
  yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('ANÁLISIS AGRONÓMICO DE CAMPO', 15, yPos);
  yPos += 10;

  const renderFieldAnalysis = (title: string, desc: string, x: number, w: number) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(title, x, yPos);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(desc, w);
    doc.text(lines, x, yPos + 6);
    return (lines.length * 4) + 12;
  };

  const halfWidth = (pageWidth - 40) / 2;
  let maxH1 = Math.max(
    renderFieldAnalysis('Clima', reportData.technicalAnalysis.climate.desc, 15, halfWidth),
    renderFieldAnalysis('Manejo', reportData.technicalAnalysis.management.desc, 15 + halfWidth + 10, halfWidth)
  );
  yPos += maxH1;

  let maxH2 = Math.max(
    renderFieldAnalysis('Fenología', reportData.technicalAnalysis.phenology.desc, 15, halfWidth),
    renderFieldAnalysis('Sanidad', reportData.technicalAnalysis.health.desc, 15 + halfWidth + 10, halfWidth)
  );
  yPos += maxH2 + 5;

  if (chartImages?.phenology) {
    const props = doc.getImageProperties(chartImages.phenology);
    const scaledHeight = (props.height * 170) / props.width;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evolución Fenológica', 15, yPos);
    yPos += 5;
    
    doc.addImage(chartImages.phenology, 'PNG', 20, yPos, 170, scaledHeight);
    yPos += scaledHeight + 8;
    
    if (reportData.graphicalAnalysis?.phenology) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(reportData.graphicalAnalysis.phenology, 170);
      doc.text(lines, 20, yPos);
    }
  }

  // --- RENDIMIENTOS Y COSECHA (Página 4) ---
  doc.addPage();
  addHeader();
  yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('PERFORMANCE DE COSECHA Y RENDIMIENTO', 15, yPos);
  yPos += 15;

  if (chartImages?.monthlyHarvest) {
    const props1 = doc.getImageProperties(chartImages.monthlyHarvest);
    const h1 = (props1.height * 80) / props1.width;
    doc.addImage(chartImages.monthlyHarvest, 'PNG', 15, yPos, 80, h1);
    
    if (chartImages?.batchYield) {
      const props2 = doc.getImageProperties(chartImages.batchYield);
      const h2 = (props2.height * 80) / props2.width;
      doc.addImage(chartImages.batchYield, 'PNG', 110, yPos, 80, h2);
    }
    yPos += h1 + 10;
  }

  if (reportData.graphicalAnalysis?.monthlyHarvest || reportData.graphicalAnalysis?.batchYield) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Análisis de Rendimiento', 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const txt = [reportData.graphicalAnalysis?.monthlyHarvest, reportData.graphicalAnalysis?.batchYield].filter(Boolean).join(" ");
    const lines = doc.splitTextToSize(txt, pageWidth - 30);
    doc.text(lines, 15, yPos);
    yPos += (lines.length * 5) + 10;
  }

  // --- PLAN DE ACCION E INSIGHT (Misma Pagina 4 si cabe, o Pagina 5) ---
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('PLAN DE ACCIÓN SUGERIDO', 15, yPos);
  yPos += 8;

  reportData.recommendations.forEach((rec) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`• ${rec.title}: `, 15, yPos);
    
    const actionText = `${rec.problem} -> ${rec.action}`;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(actionText, pageWidth - 35);
    doc.text(lines, 20, yPos + 5);
    yPos += (lines.length * 5) + 5;
  });
  
  yPos += 10;

  // Insight
  doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
  doc.setDrawColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  const insightLines = doc.splitTextToSize(reportData.aiInsight, pageWidth - 45);
  const insightHeight = (insightLines.length * 5) + 20;
  doc.roundedRect(15, yPos, pageWidth - 30, insightHeight, 2, 2, 'FD');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('INSIGHT AGROVISION', 20, yPos + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(insightLines, 20, yPos + 18);

  addFooter();
  doc.save(`Reporte_AgroVista_${establishment.producer.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateProducerHarvestReportPDF = (
  establishment: EstablishmentData,
  reportData: SummarizeHarvestDataOutput,
  stats: {
    totalProduction: number;
    farmArea: number;
    totalCost: number;
    totalIncome: number;
    costByCategory: {[key: string]: number};
  },
  charts: {
    monthlyHarvest: string;
    costDistribution: string;
    batchYield: string;
    profitabilityTrend: string;
    monthlyIncome: string;
  },
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const darkBlue = [30, 58, 138];   // #1E3A8A (Brand Primary)
  const mediumBlue = [59, 130, 246]; // #3B82F6
  const lightBlue = [239, 246, 255]; // #EFF6FF
  const techGrey = [75, 85, 99];     // #4B5563

  const addHeader = (isCover = false) => {
    if (!isCover) {
      doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.rect(0, 0, pageWidth, 20, 'F');
      if (logoDataUri) {
        doc.addImage(logoDataUri, 'PNG', 10, 4, 12, 12);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORME DE PRODUCCIÓN Y COSTOS', 25, 12);
      doc.setFont('helvetica', 'normal');
      doc.text(establishment.producer, 25, 16);
      doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 10, 12, { align: 'right' });
    }
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text('AgroVista AI - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Confidencial', pageWidth - 10, pageHeight - 7, { align: 'right' });
    }
  };

  const renderRichMarkdown = (text: string, startX: number, startY: number, maxW: number) => {
    let currentY = startY;
    let normalized = text.replace(/(\d+\.\s\*\*)/g, '\n$1');
    normalized = normalized.replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = normalized.split('\n');

    paragraphs.forEach(paragraph => {
      if (!paragraph.trim()) {
        currentY += 4;
        return;
      }

      if (currentY > pageHeight - 30) {
        doc.addPage();
        addHeader();
        doc.setTextColor(30, 30, 30);
        currentY = 35;
      }

      const parts = paragraph.split('**');
      let currentX = startX;
      let lineHeight = 5;

      parts.forEach((part, index) => {
        if (!part) return;
        const isBold = index % 2 === 1;
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const words = part.split(/(\s+)/);
        words.forEach(word => {
          if (!word) return;
          const wordWidth = doc.getTextWidth(word + ' ');
          
          if (currentX + wordWidth > startX + maxW && word.trim() !== '') {
            currentY += lineHeight;
            currentX = startX;
            if (currentY > pageHeight - 30) {
              doc.addPage();
              addHeader();
              doc.setTextColor(30, 30, 30);
              currentY = 35;
              doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            }
            if (word.trim() === '') return;
          }
          
          doc.text(word, currentX, currentY);
          currentX += wordWidth;
        });
      });
      currentY += lineHeight + 4;
    });
    return currentY;
  };

  // --- PORTADA ---
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setDrawColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.setLineWidth(2);
  doc.line(20, 40, 20, 250);
  
  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 25, 60, 50, 50);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME DE', 30, 140);
  doc.text('PRODUCCIÓN', 30, 155);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.text('ESTABLECIMIENTO', 30, 180);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(establishment.producer.toUpperCase(), 30, 192);

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(`Ubicación: ${establishment.location.locality}, ${establishment.location.province}`, 30, 202);
  doc.text(`Sistema: ${establishment.system}`, 30, 208);
  doc.text(`Fecha de Emisión: ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}`, 30, 214);

  doc.setFontSize(14);
  doc.setTextColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.text('ANÁLISIS DE CAMPAÑA', 30, 240);
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('PRODUCCIÓN Y RENDIMIENTO', 30, 250);

  // --- RESUMEN DE DATOS ---
  doc.addPage();
  addHeader();
  let yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('DATOS DEL ESTABLECIMIENTO', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Productor', 'Localidad', 'Superficie (ha)', 'Variedad']],
    body: [[establishment.producer, `${establishment.location.locality}, ${establishment.location.province}`, establishment.area.strawberry, establishment.planting.variety]],
    headStyles: { fillColor: darkBlue, textColor: 255 },
    alternateRowStyles: { fillColor: lightBlue },
    styles: { cellPadding: 5 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const executiveLines = doc.splitTextToSize(reportData.executiveSummary, pageWidth - 40);
  const executiveHeight = (executiveLines.length * 4.2) + 8;

  if (yPos + 8 + executiveHeight > pageHeight - 20) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('RESUMEN EJECUTIVO (IA)', 15, yPos);
  yPos += 8;



  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, executiveHeight, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(executiveLines, 20, yPos + 8);

  yPos += executiveHeight + 15;

  // Key Stats Cards
  const cardWidth = (pageWidth - 40) / 3;
  
  const renderStatCard = (title: string, val: string, sub: string, x: number, y: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, y, cardWidth, 30, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    doc.text(title.toUpperCase(), x + 5, y + 8);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.text(val, x + 5, y + 18);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    doc.text(sub, x + 5, y + 25);
  };

  renderStatCard('Producción Total', `${stats.totalProduction.toLocaleString('es-ES')} kg`, 'Volumen acumulado', 15, yPos);
  renderStatCard('Rendimiento', `${(stats.totalProduction / stats.farmArea).toLocaleString('es-ES', {maximumFractionDigits: 0})} kg/ha`, 'Eficiencia por Ha', pageWidth / 2 - cardWidth / 2, yPos);
  renderStatCard('Margen Bruto', `$${(stats.totalIncome - stats.totalCost).toLocaleString('es-AR', {maximumFractionDigits: 0})}`, 'Ingresos - Costos', pageWidth - cardWidth - 15, yPos);

  yPos += 45;

  // --- ANÁLISIS E INTERPRETACIÓN ---
  if (yPos > pageHeight - 40) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('ANÁLISIS E INTERPRETACIÓN (IA)', 15, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  yPos = renderRichMarkdown(reportData.analysisAndInterpretation, 15, yPos, pageWidth - 30);

  yPos += 15;

  // --- ANÁLISIS GRÁFICO ---
  doc.addPage();
  addHeader();
  yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('ANÁLISIS GRÁFICO', 15, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const noteLines = doc.splitTextToSize('Nota: Los siguientes gráficos ilustran la evolución de la cosecha, el rendimiento por lote, la tendencia de rentabilidad, los ingresos mensuales y la distribución de costos.', pageWidth - 30);
  doc.text(noteLines, 15, yPos);
  yPos += (noteLines.length * 5) + 5;

  const renderChart = (title: string, imgData: string, description: string) => {
    const props = doc.getImageProperties(imgData);
    const scaledHeight = (props.height * 170) / props.width;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(description, 170);
    const textHeight = descLines.length * 5 + 5;
    
    if (yPos + scaledHeight + textHeight + 20 > pageHeight - 20) {
      doc.addPage();
      addHeader();
      yPos = 35;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.text(title, 20, yPos);
    yPos += 5;
    
    doc.addImage(imgData, 'PNG', 20, yPos, 170, scaledHeight);
    yPos += scaledHeight + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(descLines, 20, yPos);
    yPos += textHeight + 10;
  };

  renderChart(
    'Evolución de Cosecha Mensual',
    charts.monthlyHarvest,
    `La evolución de cosecha refleja los picos de producción mensuales. Se registraron ${stats.totalProduction.toLocaleString('es-AR')} kg totales en la campaña.`
  );

  renderChart(
    'Rendimiento por Lote',
    charts.batchYield,
    `Rendimiento por lote comparativo. El rendimiento promedio general es de ${(stats.totalProduction / stats.farmArea).toLocaleString('es-AR', {maximumFractionDigits: 0})} kg/ha.`
  );
  
  renderChart(
    'Tendencia de Rentabilidad',
    charts.profitabilityTrend,
    `Evolución histórica de la rentabilidad del cultivo, comparando ingresos versus costos a lo largo de los meses productivos.`
  );

  renderChart(
    'Ingresos Mensuales',
    charts.monthlyIncome,
    `Ingresos brutos generados por la venta de la producción en cada mes de la campaña.`
  );

  const highestCostCategory = Object.entries(stats.costByCategory).sort((a,b) => b[1] - a[1])[0];
  renderChart(
    'Distribución de Costos Operativos',
    charts.costDistribution,
    `Distribución de los $${stats.totalCost.toLocaleString('es-AR')} ARS en gastos operativos. La categoría principal es ${highestCostCategory ? highestCostCategory[0] : 'Insumos'} con un ${highestCostCategory && stats.totalCost > 0 ? ((highestCostCategory[1]/stats.totalCost)*100).toFixed(1) : 0}%.`
  );

  // --- DESGLOSE DE COSTOS ---
  if (yPos > pageHeight - 60) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('DESGLOSE DE COSTOS OPERATIVOS', 15, yPos);
  yPos += 8;

  const costTableBody = Object.entries(stats.costByCategory).map(([category, amount]) => [
    category,
    `$${amount.toLocaleString('es-AR', {maximumFractionDigits: 2})}`
  ]);
  costTableBody.push(['COSTO TOTAL', `$${stats.totalCost.toLocaleString('es-AR', {maximumFractionDigits: 2})}`]);

  autoTable(doc, {
    startY: yPos,
    head: [['Categoría', 'Costo Total (ARS)']],
    body: costTableBody,
    headStyles: { fillColor: darkBlue, textColor: 255 },
    alternateRowStyles: { fillColor: lightBlue },
    styles: { cellPadding: 4 }
  });

  // --- CONCLUSIONES Y RECOMENDACIONES ---
  doc.addPage();
  addHeader();
  yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('CONCLUSIONES Y RECOMENDACIONES (IA)', 15, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  yPos = renderRichMarkdown(reportData.conclusionsAndRecommendations, 15, yPos, pageWidth - 30);

  addFooter();
  doc.save(`Informe_Produccion_${establishment.producer.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateSubscriptionReceiptPDF = (
  producerName: string,
  email: string,
  amount: number,
  status: string,
  expiryDate: string | null,
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm
  
  // Date calculations
  const today = new Date();
  const todayStr = format(today, "dd/MM/yyyy");
  
  // Default to 1 month validity if no expiry
  const expiry = expiryDate ? new Date(expiryDate) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiryStr = format(expiry, "dd/MM/yyyy");
  
  const startBillingStr = todayStr;
  const endBillingStr = expiryStr;
  
  // --- Outer Border (Spans from y=10 to y=275, taking full A4 height) ---
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 265);
  
  // --- Header Section (y=10 to y=45) ---
  doc.line(10, 45, pageWidth - 10, 45); // Line under header
  
  // Left Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgroVista", 12, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Gestión de Precisión", 12, 23);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Razón Social / Nombre:", 12, 30);
  doc.setFont("helvetica", "normal");
  doc.text("Uriel Agustín Brusa", 50, 30);
  
  doc.setFont("helvetica", "bold");
  doc.text("Domicilio Comercial:", 12, 35);
  doc.setFont("helvetica", "normal");
  doc.text("Santa Fe, Argentina", 45, 35);
  
  doc.setFont("helvetica", "bold");
  doc.text("Condición frente al IVA:", 12, 40);
  doc.setFont("helvetica", "normal");
  doc.text("Responsable Monotributo", 49, 40);
  
  // Middle Header Box (C)
  doc.rect(pageWidth / 2 - 8, 10, 16, 16);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("C", pageWidth / 2, 21, { align: "center" });
  doc.setFontSize(6);
  doc.text("COD. 011", pageWidth / 2, 29, { align: "center" });
  doc.line(pageWidth / 2, 26, pageWidth / 2, 45);
  
  // Right Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", pageWidth / 2 + 10, 18);
  
  doc.setFontSize(9);
  doc.text("Punto de Venta:", pageWidth / 2 + 10, 26);
  doc.setFont("helvetica", "normal");
  doc.text("00001", pageWidth / 2 + 38, 26);
  
  doc.setFont("helvetica", "bold");
  doc.text("Comp. Nro:", pageWidth / 2 + 50, 26);
  doc.setFont("helvetica", "normal");
  doc.text(Math.floor(Math.random() * 100000000).toString().padStart(8, '0'), pageWidth / 2 + 70, 26);
  
  doc.setFont("helvetica", "bold");
  doc.text("Fecha de Emisión:", pageWidth / 2 + 10, 31);
  doc.setFont("helvetica", "normal");
  doc.text(todayStr, pageWidth / 2 + 40, 31);
  
  doc.setFont("helvetica", "bold");
  doc.text("CUIT:", pageWidth / 2 + 10, 36);
  doc.setFont("helvetica", "normal");
  doc.text("20-40123456-9", pageWidth / 2 + 20, 36);
  
  doc.setFont("helvetica", "bold");
  doc.text("Ingresos Brutos:", pageWidth / 2 + 45, 36);
  doc.setFont("helvetica", "normal");
  doc.text("20-40123456-9", pageWidth / 2 + 72, 36);
  
  doc.setFont("helvetica", "bold");
  doc.text("Fecha de Inicio de Actividades:", pageWidth / 2 + 10, 41);
  doc.setFont("helvetica", "normal");
  doc.text("01/08/2026", pageWidth / 2 + 60, 41);
  
  // --- Billing Period (y=45 to y=57) ---
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 45, pageWidth - 20, 12, "F");
  doc.setDrawColor(0, 0, 0);
  doc.line(10, 57, pageWidth - 10, 57);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Período Facturado Desde:", 12, 52);
  doc.setFont("helvetica", "normal");
  doc.text(startBillingStr, 53, 52);
  
  doc.setFont("helvetica", "bold");
  doc.text("Hasta:", 80, 52);
  doc.setFont("helvetica", "normal");
  doc.text(endBillingStr, 92, 52);
  
  doc.setFont("helvetica", "bold");
  doc.text("Fecha de Vto. para el Pago:", 125, 52);
  doc.setFont("helvetica", "normal");
  doc.text(expiryStr, 170, 52);
  
  // --- Client Info (y=57 to y=75) ---
  doc.line(10, 75, pageWidth - 10, 75);
  
  doc.setFont("helvetica", "bold");
  doc.text("Apellido y Nombre / Razón Social:", 12, 63);
  doc.setFont("helvetica", "normal");
  doc.text(producerName, 68, 63);
  
  doc.setFont("helvetica", "bold");
  doc.text("Email:", pageWidth / 2 + 10, 63);
  doc.setFont("helvetica", "normal");
  doc.text(email, pageWidth / 2 + 22, 63);
  
  doc.setFont("helvetica", "bold");
  doc.text("Condición frente al IVA:", 12, 70);
  doc.setFont("helvetica", "normal");
  doc.text("Consumidor Final", 50, 70);
  
  doc.setFont("helvetica", "bold");
  doc.text("Condición de Pago:", pageWidth / 2 + 10, 70);
  doc.setFont("helvetica", "normal");
  doc.text("Mercado Pago", pageWidth / 2 + 42, 70);
  
  // --- Table Header (y=75 to y=85) ---
  doc.setFillColor(30, 41, 59); // Dark slate
  doc.rect(10, 75, pageWidth - 20, 10, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Código", 12, 81);
  doc.text("Producto / Servicio", 40, 81);
  doc.text("Cant.", 140, 81);
  doc.text("Precio Unit.", 155, 81);
  doc.text("Subtotal", 182, 81);
  
  // --- Table Body & Vertical Columns (y=85 to y=205) ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  doc.text("SUB-PREM", 12, 93);
  
  doc.setFont("helvetica", "bold");
  doc.text("Suscripción Mensual - AgroVista Premium", 40, 93);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Acceso mensual a la plataforma web AgroVista.", 40, 99);
  doc.text(`Período cubierto: ${startBillingStr} al ${endBillingStr}`, 40, 104);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  doc.text("1,00", 142, 93);
  
  const formattedAmount = amount.toLocaleString("es-AR", { minimumFractionDigits: 2 });
  doc.text(`$ ${formattedAmount}`, 172, 93, { align: "right" });
  doc.text(`$ ${formattedAmount}`, 197, 93, { align: "right" });
  
  // Vertical Column Dividers inside table body
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(35, 75, 35, 205);
  doc.line(135, 75, 135, 205);
  doc.line(150, 75, 150, 205);
  doc.line(175, 75, 175, 205);
  
  // Table Bottom Divider Line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(10, 205, pageWidth - 10, 205);
  
  // --- Totals Section (y=205 to y=230) ---
  doc.line(10, 230, pageWidth - 10, 230);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, 214);
  doc.setFont("helvetica", "normal");
  doc.text(`$ ${formattedAmount}`, 197, 214, { align: "right" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Importe Total:", 140, 224);
  doc.setFontSize(12);
  doc.text(`$ ${formattedAmount}`, 197, 224, { align: "right" });
  
  // --- AFIP / ARCA Footer Section (y=230 to y=275) ---
  // QR Placeholder Box
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, 234, 34, 34, "FD");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "bold");
  doc.text("CÓDIGO QR", 32, 250, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("ARCA / AFIP", 32, 254, { align: "center" });
  
  // Right AFIP Data
  doc.setTextColor(0, 102, 204);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ARCA / AFIP", pageWidth - 12, 243, { align: "right" });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Comprobante Autorizado", pageWidth - 12, 251, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const cae = Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
  doc.text(`CAE N°: ${cae}`, pageWidth - 12, 259, { align: "right" });
  
  // Valid CAE until (+10 days)
  const caeVto = format(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), "dd/MM/yyyy");
  doc.text(`Fecha de Vto. de CAE: ${caeVto}`, pageWidth - 12, 267, { align: "right" });
  
  // --- Disclaimer Footer (y=281, outside outer box) ---
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  const disclaimer = "Nota sobre validez fiscal: Ejemplo de Factura C para Monotributista correspondiente a la plataforma AgroVista emitida vía Web Service / Facturador Integrado (Resolución General 4291/2018 ARCA/AFIP).";
  doc.text(disclaimer, 10, 281, { maxWidth: pageWidth - 20 });
  
  doc.save(`Factura_Suscripcion_${producerName.replace(/\s+/g, "_")}.pdf`);
};

export const generateA4SheetFromImageDataUrl = (
  imageDataUrl: string,
  batchNumber: string | number
) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  
  const labelWidth = 92;
  const labelHeight = 62.56; // 500:340 aspect ratio
  const colX = [10, 108];
  const rowY = [10, 77.5, 145, 212.5];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const lx = colX[c];
      const ly = rowY[r];
      doc.addImage(imageDataUrl, "PNG", lx, ly, labelWidth, labelHeight);
    }
  }

  doc.save(`Planilla_8_Etiquetas_Lote_${batchNumber}.pdf`);
};

export const generateA4TraceabilitySheetPDF = async (
  batchNumber: string | number,
  harvestDate: string,
  traceabilityId: string,
  producerName: string,
  locality?: string,
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  
  const traceUrl = typeof window !== 'undefined' ? `${window.location.origin}/trace/${traceabilityId}` : `https://agrovista.com.ar/trace/${traceabilityId}`;
  
  // Fetch QR Code Data URI
  let qrDataUri = '';
  try {
    const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(traceUrl)}&size=200&margin=1`;
    const res = await fetch(qrApiUrl);
    const blob = await res.blob();
    qrDataUri = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("Could not fetch QR code image for A4 sheet");
  }

  const greenColor: [number, number, number] = [45, 74, 34]; // #2d4a22
  const formattedDate = format(new Date(harvestDate), 'dd/MM/yyyy');

  const labelWidth = 92;
  const labelHeight = 63;
  const colX = [10, 108];
  const rowY = [10, 78, 146, 214];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const lx = colX[c];
      const ly = rowY[r];

      // Outer white card & border
      doc.setFillColor(255, 255, 255);
      doc.rect(lx, ly, labelWidth, labelHeight, "F");
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.4);
      doc.rect(lx, ly, labelWidth, labelHeight, "S");

      // Logo if provided
      if (logoDataUri) {
        try {
          doc.addImage(logoDataUri, "PNG", lx + 6, ly + 6, 8, 8);
        } catch {
          // ignore logo failure
        }
      }

      // Title & Locality
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("AgroVista", logoDataUri ? lx + 16 : lx + 6, ly + 11);

      if (locality) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(locality.toUpperCase(), logoDataUri ? lx + 16 : lx + 6, ly + 15);
      }

      // Establishment & Producer Name
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Establecimiento:", lx + 6, ly + 22);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(producerName || 'AgroVista', lx + 6, ly + 28);

      // Call to action subtitle
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("CONOZCA LA HISTORIA DE SU FRUTILLA", lx + 6, ly + 35);

      // Batch Details
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(`Lote:`, lx + 6, ly + 43);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${batchNumber}`, lx + 16, ly + 43);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(`Fecha:`, lx + 6, ly + 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(formattedDate, lx + 17, ly + 49);

      // ID
      doc.setFontSize(5.5);
      doc.setFont("courier", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(traceabilityId, lx + 6, ly + 56);

      // QR Code Box (Right Side)
      const qx = lx + 59;
      const qy = ly + 10;
      const qSize = 27;

      doc.setDrawColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.setLineWidth(0.5);
      doc.rect(qx, qy, qSize, qSize, "S");

      // Decorative green corners
      const cLen = 2.5;
      doc.line(qx - 0.8, qy - 0.8, qx - 0.8 + cLen, qy - 0.8);
      doc.line(qx - 0.8, qy - 0.8, qx - 0.8, qy - 0.8 + cLen);

      doc.line(qx + qSize + 0.8, qy - 0.8, qx + qSize + 0.8 - cLen, qy - 0.8);
      doc.line(qx + qSize + 0.8, qy - 0.8, qx + qSize + 0.8, qy - 0.8 + cLen);

      doc.line(qx - 0.8, qy + qSize + 0.8, qx - 0.8 + cLen, qy + qSize + 0.8);
      doc.line(qx - 0.8, qy + qSize + 0.8, qx - 0.8, qy + qSize + 0.8 - cLen);

      doc.line(qx + qSize + 0.8, qy + qSize + 0.8, qx + qSize + 0.8 - cLen, qy + qSize + 0.8);
      doc.line(qx + qSize + 0.8, qy + qSize + 0.8, qx + qSize + 0.8, qy + qSize + 0.8 - cLen);

      // Add QR Image if fetched
      if (qrDataUri) {
        try {
          doc.addImage(qrDataUri, "PNG", qx + 1, qy + 1, qSize - 2, qSize - 2);
        } catch {
          // fallback
        }
      }
    }
  }

  doc.save(`Planilla_8_Etiquetas_Lote_${batchNumber}.pdf`);
};

