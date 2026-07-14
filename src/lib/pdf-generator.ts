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
  logoDataUri?: string
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
      doc.text(establishment?.producer || 'AgroVision', 25, 16);
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
      doc.text('AgroVision AI - Gestión de Precisión', 10, pageHeight - 7);
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
      ['Certificación BPA / G.A.P.', '🟢 CUMPLIDO - Carencia PHI 0 y Buenas Prácticas Verificadas'],
      ['Variedades y Cantidad', batch.varieties?.map(v => `${v.name} (${v.plantCount})`).join(', ') || 'N/A'],
      ['Fecha de Siembra/Inicio', format(new Date(batch.preloadedDate), 'dd/MM/yyyy')],
      ['Productor', establishment?.producer || 'N/A'],
      ['Ubicación', `${establishment?.location.locality || 'N/A'}, ${establishment?.location.province || 'N/A'}`],
    ],
    headStyles: { fillColor: darkGreen, textColor: 255 },
    alternateRowStyles: { fillColor: lightGreen },
    styles: { cellPadding: 4 }
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
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { width: 25 },
      1: { width: 40 },
      2: { width: 40 },
      3: { width: 70 }
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
      doc.text(establishment?.producer || 'AgroVision', 25, 16);
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
      doc.text('AgroVision AI - Gestión de Precisión', 10, pageHeight - 7);
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
  logoDataUri?: string
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const darkGreen = [20, 83, 45];   // #14532D
  const mediumGreen = [34, 197, 94]; // #22C55E
  const lightGreen = [240, 253, 244]; // #F0FDF4
  const techGrey = [75, 85, 99];     // #4B5563
  const alertRed = [220, 38, 38];    // #DC2626

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
      doc.text('AgroVision AI - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Confidencial', pageWidth - 10, pageHeight - 7, { align: 'right' });
    }
  };

  // --- PORTADA ---
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Decorative lines
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

  // --- RESUMEN EJECUTIVO ---
  doc.addPage();
  addHeader();
  let yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('RESUMEN EJECUTIVO', 15, yPos);
  yPos += 10;

  // Status Cards
  const cardWidth = (pageWidth - 40) / 2;
  
  // General Status
  doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
  doc.roundedRect(15, yPos, cardWidth, 25, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
  doc.text('ESTADO GENERAL', 20, yPos + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(reportData.executiveSummary.generalStatus === 'Óptimo' ? darkGreen[0] : alertRed[0]);
  doc.text(reportData.executiveSummary.generalStatus.toUpperCase(), 20, yPos + 18);

  // Climate Risk
  doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
  doc.roundedRect(pageWidth / 2 + 5, yPos, cardWidth, 25, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
  doc.text('RIESGO CLIMÁTICO', pageWidth / 2 + 10, yPos + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(reportData.executiveSummary.climateRisk === 'Bajo' ? darkGreen[0] : alertRed[0]);
  doc.text(reportData.executiveSummary.climateRisk.toUpperCase(), pageWidth / 2 + 10, yPos + 18);

  yPos += 35;

  // Key Conclusions
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('CONCLUSIONES CLAVE', 15, yPos);
  yPos += 5;

  const conclusionLines: string[][] = reportData.executiveSummary.conclusions.map(c => 
    doc.splitTextToSize(`• ${c}`, pageWidth - 45)
  );
  const totalConclusionHeight = conclusionLines.reduce((acc, lines) => acc + (lines.length * 5), 0) + 15;

  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(15, yPos, pageWidth - 30, totalConclusionHeight, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  let currentConclusionY = yPos + 10;
  conclusionLines.forEach((lines) => {
    doc.text(lines, 20, currentConclusionY);
    currentConclusionY += (lines.length * 5);
  });

  yPos += totalConclusionHeight + 10;

  // Main Recommendation Highlight
  const mainRecText = reportData.executiveSummary.mainRecommendation;
  
  // CRITICAL: Set font state BEFORE splitTextToSize to ensure correct width calculation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const mainRecLines = doc.splitTextToSize(mainRecText, pageWidth - 50); // Using 50 for safer margins
  const mainRecHeight = (mainRecLines.length * 6) + 18;

  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, mainRecHeight, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RECOMENDACIÓN PRINCIPAL', 20, yPos + 8);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(mainRecLines, 20, yPos + 17);

  yPos += mainRecHeight + 15;

  // --- ANÁLISIS TÉCNICO ---
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('ANÁLISIS TÉCNICO', 15, yPos);
  yPos += 10;

  const getTechCardHeight = (desc: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(desc, cardWidth - 10);
    return Math.max(30, (lines.length * 4) + 15); // Minimum 30mm, compact padding
  };

  const renderTechCard = (title: string, data: { desc: string, risk: string }, x: number, y: number, height: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.roundedRect(x, y, cardWidth, height, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(title.toUpperCase(), x + 5, y + 7);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    const lines = doc.splitTextToSize(data.desc, cardWidth - 10);
    doc.text(lines, x + 5, y + 13);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RIESGO: ${data.risk.toUpperCase()}`, x + 5, y + height - 4);
  };

  const h1 = getTechCardHeight(reportData.technicalAnalysis.climate.desc);
  const h2 = getTechCardHeight(reportData.technicalAnalysis.phenology.desc);
  const row1Height = Math.max(h1, h2);

  renderTechCard('Clima', reportData.technicalAnalysis.climate, 15, yPos, row1Height);
  renderTechCard('Fenología', reportData.technicalAnalysis.phenology, pageWidth / 2 + 5, yPos, row1Height);
  
  yPos += row1Height + 5;

  const h3 = getTechCardHeight(reportData.technicalAnalysis.management.desc);
  const h4 = getTechCardHeight(reportData.technicalAnalysis.health.desc);
  const row2Height = Math.max(h3, h4);

  if (yPos + row2Height > pageHeight - 30) {
    doc.addPage();
    addHeader();
    yPos = 35;
    renderTechCard('Manejo', reportData.technicalAnalysis.management, 15, yPos, row2Height);
    renderTechCard('Sanidad', reportData.technicalAnalysis.health, pageWidth / 2 + 5, yPos, row2Height);
    yPos += row2Height + 5;
  } else {
    renderTechCard('Manejo', reportData.technicalAnalysis.management, 15, yPos, row2Height);
    renderTechCard('Sanidad', reportData.technicalAnalysis.health, pageWidth / 2 + 5, yPos, row2Height);
    yPos += row2Height + 5;
  }

  // --- ALERTAS ---
  if (yPos > pageHeight - 50) {
    doc.addPage();
    addHeader();
    yPos = 35;
  } else {
    yPos += 10;
  }
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('ALERTAS CRÍTICAS', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Evento Detectado', 'Nivel Riesgo', 'Acción Sugerida']],
    body: reportData.alerts.map(a => [a.date, a.event, a.risk, a.recommendation]),
    headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGreen },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { width: 25 },
      1: { width: 45 },
      2: { width: 25, fontStyle: 'bold' },
      3: { width: 80 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // --- RECOMENDACIONES ---
  if (yPos > pageHeight - 40) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('PLAN DE ACCIÓN RECOMENDADO', 15, yPos);
  yPos += 10;

  reportData.recommendations.forEach((rec) => {
    const problemLines = doc.splitTextToSize(`Problema: ${rec.problem}`, pageWidth - 45);
    const actionLines = doc.splitTextToSize(`Acción Sugerida: ${rec.action}`, pageWidth - 45);
    const recHeight = (problemLines.length * 4) + (actionLines.length * 5) + 20;

    if (yPos + recHeight > pageHeight - 20) {
      doc.addPage();
      addHeader();
      yPos = 35;
    }
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, yPos, pageWidth - 30, recHeight, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(rec.title.toUpperCase(), 20, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(techGrey[0], techGrey[1], techGrey[2]);
    doc.text(problemLines, 20, yPos + 16);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(actionLines, 20, yPos + 16 + (problemLines.length * 4) + 5);
    
    yPos += recHeight + 10;
  });

  // --- AI INSIGHT ---
  const insightLines = doc.splitTextToSize(reportData.aiInsight, pageWidth - 45);
  const insightHeight = (insightLines.length * 5) + 20;

  if (yPos + insightHeight > pageHeight - 20) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }
  
  doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
  doc.setDrawColor(mediumGreen[0], mediumGreen[1], mediumGreen[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, insightHeight, 2, 2, 'FD');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('INSIGHT DE INTELIGENCIA ARTIFICIAL', 20, yPos + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(insightLines, 20, yPos + 18);

  addFooter();
  doc.save(`Reporte_AgroVision_${establishment.producer.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
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
      doc.text('AgroVision AI - Gestión de Precisión', 10, pageHeight - 7);
      doc.text('Confidencial', pageWidth - 10, pageHeight - 7, { align: 'right' });
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

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('RESUMEN EJECUTIVO (IA)', 15, yPos);
  yPos += 8;

  const executiveLines = doc.splitTextToSize(reportData.executiveSummary, pageWidth - 30);
  const executiveHeight = (executiveLines.length * 5) + 10;

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
  if (yPos > pageHeight - 60) {
    doc.addPage();
    addHeader();
    yPos = 35;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('ANÁLISIS E INTERPRETACIÓN (IA)', 15, yPos);
  yPos += 8;

  const analysisLines = doc.splitTextToSize(reportData.analysisAndInterpretation, pageWidth - 30);
  const analysisHeight = (analysisLines.length * 5) + 10;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, yPos, pageWidth - 30, analysisHeight, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(analysisLines, 20, yPos + 8);

  yPos += analysisHeight + 15;

  // --- ANÁLISIS GRÁFICO ---
  doc.addPage();
  addHeader();
  yPos = 35;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('ANÁLISIS GRÁFICO', 15, yPos);
  yPos += 10;

  const chartImgWidth = (pageWidth - 40) / 2;
  const chartImgHeight = 60;

  doc.addImage(charts.monthlyHarvest, 'PNG', 15, yPos, chartImgWidth, chartImgHeight);
  doc.addImage(charts.batchYield, 'PNG', pageWidth / 2 + 5, yPos, chartImgWidth, chartImgHeight);
  
  yPos += chartImgHeight + 10;
  
  doc.addImage(charts.costDistribution, 'PNG', pageWidth / 2 - chartImgWidth / 2, yPos, chartImgWidth, chartImgHeight);

  yPos += chartImgHeight + 20;

  // --- DESGLOSE DE COSTOS ---
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
  yPos += 10;

  const recLines = doc.splitTextToSize(reportData.conclusionsAndRecommendations, pageWidth - 30);
  const recHeight = (recLines.length * 5) + 10;

  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.setDrawColor(mediumBlue[0], mediumBlue[1], mediumBlue[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, recHeight, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(recLines, 20, yPos + 8);

  addFooter();
  doc.save(`Informe_Produccion_${establishment.producer.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
