import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Batch, Harvest, AgronomistLog, PhenologyLog, EstablishmentData } from './types';
import type { SummarizeAgronomistReportOutput } from '@/ai/flows/summarize-agronomist-report';

export const generateTraceabilityPDF = (
  batch: Batch,
  harvests: Harvest[],
  agronomistLogs: AgronomistLog[],
  phenologyLogs: PhenologyLog[],
  establishment: EstablishmentData | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(34, 197, 94); // Green-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('AgroVision - Reporte de Trazabilidad', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`, 15, 33);

  // Establishment Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Establecimiento', 15, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const estInfo = [
    `Productor: ${establishment?.producer || 'N/A'}`,
    `Ubicación: ${establishment?.location.locality || 'N/A'}, ${establishment?.location.province || 'N/A'}`,
    `Sistema: ${establishment?.system || 'N/A'}`,
  ];
  estInfo.forEach((text, i) => doc.text(text, 15, 57 + (i * 5)));

  // Batch Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Detalles del Lote: ${batch.id}`, 110, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const batchInfo = [
    `Estado: ${batch.status === 'completed' ? 'Finalizado' : 'En curso'}`,
    `Variedades: ${batch.varieties?.map(v => `${v.name} (${v.plantCount})`).join(', ') || 'N/A'}`,
    `Fecha de Inicio: ${format(new Date(batch.preloadedDate), 'dd/MM/yyyy')}`,
  ];
  batchInfo.forEach((text, i) => doc.text(text, 110, 57 + (i * 5)));

  // Timeline Header
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 75, pageWidth - 15, 75);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('Cronología de Eventos', 15, 85);

  // Combine all events
  const events = [
    ...phenologyLogs.map(p => ({ date: new Date(p.date), type: 'Fenología', desc: p.developmentState, notes: p.notes })),
    ...agronomistLogs.map(a => ({ date: new Date(a.date), type: `Bitácora: ${a.type}`, desc: a.product || '-', notes: a.notes })),
    ...harvests.map(h => ({ date: new Date(h.date), type: 'Cosecha', desc: `${h.kilograms} kg`, notes: `ID: ${h.traceabilityId}` })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  autoTable(doc, {
    startY: 90,
    head: [['Fecha', 'Tipo de Evento', 'Descripción', 'Notas']],
    body: events.map(e => [
      format(e.date, 'dd/MM/yyyy'),
      e.type,
      e.desc,
      e.notes
    ]),
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 15, right: 15 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`AgroVision - Reporte de Trazabilidad Lote ${batch.id} - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`Trazabilidad_Lote_${batch.id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateMonthlyProductionPDF = (
  harvests: Harvest[],
  month: Date,
  establishment: EstablishmentData | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const monthName = format(month, 'MMMM yyyy', { locale: es });

  // Header
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('AgroVision - Producción Mensual', 15, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mes: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, 15, 33);

  // Summary Card
  const totalKg = harvests.reduce((acc, h) => acc + h.kilograms, 0);
  const totalHarvests = harvests.length;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del Mes', 15, 55);
  
  autoTable(doc, {
    startY: 60,
    body: [
      ['Total Cosechado', `${totalKg.toFixed(2)} kg`],
      ['Cantidad de Cosechas', totalHarvests.toString()],
      ['Establecimiento', establishment?.producer || 'N/A'],
    ],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 50 } },
  });

  // Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Cosechas', 15, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Fecha', 'Lote', 'Variedad', 'Kilos', 'Recolector', 'ID Trazabilidad']],
    body: harvests.map(h => [
      format(new Date(h.date), 'dd/MM/yyyy'),
      h.batchNumber,
      'Frutilla', // In a real app we'd link to the variety
      `${h.kilograms} kg`,
      h.collector.name,
      h.traceabilityId
    ]),
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
  });

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
  const mainRecText = reportData.executiveSummary.mainRecommendation.toUpperCase();
  const mainRecLines = doc.splitTextToSize(mainRecText, pageWidth - 45);
  const mainRecHeight = (mainRecLines.length * 6) + 15;

  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, mainRecHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('RECOMENDACIÓN PRINCIPAL', 20, yPos + 8);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(mainRecLines, 20, yPos + 16);

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
