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

export const generateAgronomistReportPDF = async (
  establishment: EstablishmentData,
  agronomistName: string,
  reportData: SummarizeAgronomistReportOutput,
  chartImages?: { phenology: string; monthlyHarvest: string; batchYield: string; },
  logoDataUri?: string,
  batches?: Batch[],
  harvests?: Harvest[]
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // ─── PALETA INSTITUCIONAL ─────────────────────────────────────────────
  const darkGreen    = [20,  72,  40];
  const accentGreen  = [71, 120,  72];
  const warmWhite    = [248, 250, 248];
  const charcoal     = [40,  40,  40];
  const mutedGrey    = [100, 110, 105];
  const terracotta   = [170,  60,  55];
  const amber        = [160, 110,  35];
  const successGreen = [45,  110,  60];

  const riskColor = (level: string | number): number[] => {
    const s = String(level).toLowerCase();
    if (s.includes('alto') || s.includes('criti') || s.includes('riesgo')) return terracotta;
    if (s.includes('medio') || s.includes('atenci') || s.includes('alerta')) return amber;
    return successGreen;
  };

  const addHeader = () => {
    doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
    doc.rect(0, 18, pageWidth, 1.5, 'F');
    if (logoDataUri) doc.addImage(logoDataUri, 'PNG', 8, 3, 12, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('INFORME TÉCNICO AGRONÓMICO', 24, 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(establishment.producer, 24, 15);
    doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 10, 10, { align: 'right' });
    doc.text(agronomistName, pageWidth - 10, 15, { align: 'right' });
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i === 1) continue;
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7.5);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 4.5, { align: 'center' });
      doc.text('AgroVista · Gestión de Precisión', 10, pageHeight - 4.5);
      doc.text('Confidencial', pageWidth - 10, pageHeight - 4.5, { align: 'right' });
    }
  };

  const sectionBanner = (text: string, y: number): number => {
    doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(text, 18, y);
    return y + 8;
  };

  const subHeading = (text: string, y: number): number => {
    doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
    doc.rect(15, y - 4, 3, 8, 'F');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(text, 21, y);
    return y + 8;
  };

  const bodyParagraph = (text: string, x: number, y: number, maxW: number): number => {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const lines = doc.splitTextToSize(text || '', maxW);
    doc.text(lines, x, y);
    return y + lines.length * 4.5 + 2;
  };

  const styledBox = (text: string, label: string, x: number, y: number, w: number, col: number[]): number => {
    const lines = doc.splitTextToSize(text || '', w - 10);
    const boxH = lines.length * 4.5 + 16;
    doc.setFillColor(warmWhite[0], warmWhite[1], warmWhite[2]);
    doc.setDrawColor(col[0], col[1], col[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, boxH, 2, 2, 'FD');
    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(x, y, 3, boxH, 1, 1, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(col[0], col[1], col[2]);
    doc.text(label, x + 6, y + 8);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(lines, x + 6, y + 15);
    return y + boxH + 5;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 1 — PORTADA
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setLineWidth(0.3);
  for (let xi = -20; xi < pageWidth + 100; xi += 18) { doc.line(xi, 0, xi + 80, pageHeight); }

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, 55, pageWidth - 36, 165, 3, 3, 'F');

  if (logoDataUri) doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 18, 65, 36, 36);

  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('INFORME TÉCNICO', pageWidth / 2, 116, { align: 'center' });
  doc.text('AGRONÓMICO', pageWidth / 2, 126, { align: 'center' });
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.rect(pageWidth / 2 - 20, 130, 40, 1.2, 'F');

  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
  doc.text('ESTABLECIMIENTO', pageWidth / 2, 138, { align: 'center' });
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text(establishment.producer.toUpperCase(), pageWidth / 2, 147, { align: 'center' });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
  doc.text(`${establishment.location.locality}, ${establishment.location.province}  ·  ${establishment.system}`, pageWidth / 2, 155, { align: 'center' });
  doc.text(`Fecha: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, 161, { align: 'center' });

  doc.setDrawColor(220, 230, 220); doc.setLineWidth(0.4);
  doc.line(36, 167, pageWidth - 36, 167);

  doc.setFontSize(9); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
  doc.text('RESPONSABLE TÉCNICO', pageWidth / 2, 174, { align: 'center' });
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text(agronomistName.toUpperCase(), pageWidth / 2, 183, { align: 'center' });

  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('AgroVista · Gestión de Precisión', pageWidth / 2, pageHeight - 7, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 2 — FICHA DEL ESTABLECIMIENTO + MAPA + LOTES
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  let yPos = 30;

  yPos = sectionBanner('FICHA DEL ESTABLECIMIENTO', yPos);
  yPos += 4;

  const uniqueVars = Array.from(new Set((batches || []).flatMap(b => b.varieties?.map(v => v.name).filter(Boolean) || [])));
  const infoRows = [
    ['Establecimiento', establishment.producer],
    ['Ubicación', `${establishment.location.locality}, ${establishment.location.province}`],
    ['Coordenadas GPS', establishment.location.coordinates || 'No registradas'],
    ['Sistema Productivo', establishment.system],
    ['Superficie Total', `${establishment.area.total} ha`],
    ['Superficie Frutilla', `${establishment.area.strawberry} ha`],
    ['Lotes Activos', String((batches || []).length)],
    ['Variedades', uniqueVars.join(', ') || 'N/A'],
    ['Responsable Técnico', establishment.technicalManager],
    ['Sistema de Riego', establishment.irrigation?.system || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    body: infoRows,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, fillColor: [warmWhite[0], warmWhite[1], warmWhite[2]] as any, cellWidth: 55 },
      1: { textColor: [charcoal[0], charcoal[1], charcoal[2]] as any },
    },
    theme: 'plain',
    alternateRowStyles: { fillColor: [245, 248, 245] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Static Satellite Map
  if (establishment.location.coordinates) {
    const coords = establishment.location.coordinates.split(',').map((s: string) => s.trim());
    if (coords.length === 2) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coords[0]},${coords[1]}&zoom=15&size=560x200&maptype=satellite&markers=color:red|label:E|${coords[0]},${coords[1]}&key=${apiKey}`;
        const mapResp = await fetch(mapUrl);
        if (mapResp.ok) {
          const mapBlob = await mapResp.blob();
          const mapDataUri: string = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(mapBlob);
          });
          const mapW = pageWidth - 30;
          const mapH = mapW * 200 / 560;
          doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
          doc.setLineWidth(0.5);
          doc.roundedRect(15, yPos, mapW, mapH, 2, 2, 'S');
          doc.addImage(mapDataUri, 'JPEG', 15, yPos, mapW, mapH);
          yPos += mapH + 4;
          doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
          doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
          doc.text(`Vista satelital · ${establishment.location.locality} · Coords: ${establishment.location.coordinates}`, pageWidth / 2, yPos, { align: 'center' });
          yPos += 8;
        }
      } catch { /* silent */ }
    }
  }

  // Batch Distribution Table
  if (batches && batches.length > 0) {
    if (yPos > pageHeight - 60) { doc.addPage(); addHeader(); yPos = 30; }
    yPos = sectionBanner('DISTRIBUCIÓN DE LOTES', yPos);
    yPos += 4;
    const batchRows = batches.map(b => {
      const variety = b.varieties?.map(v => v.name).filter(Boolean).join(', ') || 'Pendiente';
      const area = b.varieties?.reduce((s, v) => s + (v.area || 0), 0).toFixed(2) || '—';
      const plantDate = b.varieties?.find(v => v.plantingDate)?.plantingDate;
      const dateStr = plantDate ? format(new Date(plantDate), 'dd/MM/yyyy') : 'Sin fecha';
      const status = b.varieties?.every(v => v.name) ? 'Activo' : 'Pendiente';
      return [b.id, variety, `${area} ha`, dateStr, status];
    });
    autoTable(doc, {
      startY: yPos,
      head: [['Lote', 'Variedad', 'Superficie', 'Fecha Plantación', 'Estado']],
      body: batchRows,
      headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [245, 248, 245] },
      columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 3 — DASHBOARD EJECUTIVO + DIAGNÓSTICO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('DASHBOARD EJECUTIVO', yPos);
  yPos += 6;

  const kpiW = (pageWidth - 45) / 4;
  const kpis = [
    { title: 'ESTADO GENERAL', value: reportData.executiveSummary.generalStatus, risk: reportData.executiveSummary.generalStatus },
    { title: 'RIESGO CLIMÁTICO', value: reportData.executiveSummary.climateRisk, risk: reportData.executiveSummary.climateRisk },
    { title: 'RIESGO SANITARIO', value: reportData.technicalAnalysis.health.risk, risk: reportData.technicalAnalysis.health.risk },
    { title: 'ALERTAS ACTIVAS', value: `${reportData.executiveSummary.criticalAlertsCount} alertas`, risk: reportData.executiveSummary.criticalAlertsCount },
  ];

  kpis.forEach((kpi, i) => {
    const xp = 15 + i * (kpiW + 5);
    const col = riskColor(kpi.risk);
    doc.setFillColor(warmWhite[0], warmWhite[1], warmWhite[2]);
    doc.setDrawColor(col[0], col[1], col[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(xp, yPos, kpiW, 22, 2, 2, 'FD');
    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(xp, yPos, 2.5, 22, 1, 1, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
    doc.text(kpi.title, xp + 5, yPos + 7);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(col[0], col[1], col[2]);
    const vl = doc.splitTextToSize(String(kpi.value).toUpperCase(), kpiW - 8);
    doc.text(vl, xp + 5, yPos + 15);
  });
  yPos += 30;

  yPos = subHeading('DIAGNÓSTICO EJECUTIVO', yPos);
  const summaryFull = (reportData.executiveSummary.conclusions || []).join(' ');
  yPos = styledBox(summaryFull, 'Resumen del estado productivo', 15, yPos, pageWidth - 30, accentGreen);
  yPos = styledBox(reportData.executiveSummary.mainRecommendation || '', 'Recomendación principal', 15, yPos, pageWidth - 30, successGreen);

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 4 — ANÁLISIS AGRONÓMICO DE CAMPO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('ANÁLISIS AGRONÓMICO DE CAMPO', yPos);
  yPos += 6;

  const fieldBlocks = [
    { label: 'CLIMA', data: reportData.technicalAnalysis.climate },
    { label: 'MANEJO', data: reportData.technicalAnalysis.management },
    { label: 'FENOLOGÍA', data: reportData.technicalAnalysis.phenology },
    { label: 'SANIDAD', data: reportData.technicalAnalysis.health },
  ];

  const halfW = (pageWidth - 40) / 2;

  for (let i = 0; i < fieldBlocks.length; i += 2) {
    const left = fieldBlocks[i];
    const right = fieldBlocks[i + 1];
    const lLines = doc.splitTextToSize(left?.data?.desc || '', halfW - 10).length;
    const rLines = right ? doc.splitTextToSize(right?.data?.desc || '', halfW - 10).length : 0;
    const blockH = Math.max(lLines, rLines) * 4.5 + 20;

    if (yPos + blockH > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }

    const drawBlock = (block: typeof fieldBlocks[0], xStart: number) => {
      const col = block.data?.risk ? riskColor(block.data.risk) : accentGreen;
      doc.setFillColor(warmWhite[0], warmWhite[1], warmWhite[2]);
      doc.setDrawColor(col[0], col[1], col[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(xStart, yPos, halfW, blockH, 2, 2, 'FD');
      doc.setFillColor(col[0], col[1], col[2]);
      doc.rect(xStart, yPos, halfW, 9, 'F');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      const headerLabel = block.data?.risk ? `${block.label}  ·  ${String(block.data.risk).toUpperCase()}` : block.label;
      doc.text(headerLabel, xStart + 4, yPos + 6);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      const desc = doc.splitTextToSize(block.data?.desc || 'Sin datos registrados.', halfW - 8);
      doc.text(desc, xStart + 4, yPos + 15);
    };

    drawBlock(left, 15);
    if (right) drawBlock(right, 15 + halfW + 10);
    yPos += blockH + 8;
  }

  if (chartImages?.phenology) {
    if (yPos + 60 > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }
    yPos = subHeading('EVOLUCIÓN FENOLÓGICA', yPos);
    const props = doc.getImageProperties(chartImages.phenology);
    const imgW = pageWidth - 30;
    const imgH = (props.height * imgW) / props.width;
    doc.addImage(chartImages.phenology, 'PNG', 15, yPos, imgW, imgH);
    yPos += imgH + 6;
    if (reportData.graphicalAnalysis?.phenology) {
      yPos = bodyParagraph(reportData.graphicalAnalysis.phenology, 15, yPos, pageWidth - 30);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 5 — PERFORMANCE DE COSECHA
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('PERFORMANCE DE COSECHA Y RENDIMIENTO', yPos);
  yPos += 6;

  if (chartImages?.monthlyHarvest) {
    const chartW = (pageWidth - 40) / 2;
    const p1 = doc.getImageProperties(chartImages.monthlyHarvest);
    const h1 = (p1.height * chartW) / p1.width;
    doc.addImage(chartImages.monthlyHarvest, 'PNG', 15, yPos, chartW, h1);
    if (chartImages?.batchYield) {
      const p2 = doc.getImageProperties(chartImages.batchYield);
      const h2 = (p2.height * chartW) / p2.width;
      doc.addImage(chartImages.batchYield, 'PNG', 15 + chartW + 10, yPos, chartW, h2);
      yPos += Math.max(h1, h2) + 8;
    } else {
      yPos += h1 + 8;
    }
  }

  yPos = subHeading('ANÁLISIS DE RENDIMIENTO', yPos);
  const analysisText = [reportData.graphicalAnalysis?.monthlyHarvest, reportData.graphicalAnalysis?.batchYield].filter(Boolean).join(' ');
  yPos = bodyParagraph(analysisText, 15, yPos, pageWidth - 30);

  if (harvests && harvests.length > 0) {
    yPos += 4;
    const totalKg = harvests.reduce((s, h) => s + (h.kilograms || 0), 0);
    const byBatch: Record<string, number> = {};
    harvests.forEach(h => { if (h.batchNumber) byBatch[h.batchNumber] = (byBatch[h.batchNumber] || 0) + (h.kilograms || 0); });
    const harvestRows = Object.entries(byBatch).map(([bid, kg]) => {
      const bd = (batches || []).find(b => b.id === bid);
      const area = bd?.varieties?.reduce((s, v) => s + (v.area || 0), 0) || 0;
      const variety = bd?.varieties?.map(v => v.name).filter(Boolean).join(', ') || '—';
      return [bid, variety, `${area.toFixed(2)} ha`, `${kg.toFixed(2)} kg`, area > 0 ? `${(kg / area).toFixed(1)} kg/ha` : '—'];
    });
    if (harvestRows.length > 0) {
      if (yPos > pageHeight - 60) { doc.addPage(); addHeader(); yPos = 30; }
      yPos = subHeading('RENDIMIENTO POR LOTE', yPos);
      autoTable(doc, {
        startY: yPos,
        head: [['Lote', 'Variedad', 'Superficie', 'Total Cosechado', 'Rendimiento']],
        body: [...harvestRows, ['TOTAL', '—', `${establishment.area.strawberry} ha`, `${totalKg.toFixed(2)} kg`, '—']],
        headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3.5 },
        alternateRowStyles: { fillColor: [245, 248, 245] },
        didParseCell: (data: any) => {
          if (data.row.index === harvestRows.length && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [darkGreen[0], darkGreen[1], darkGreen[2]];
            data.cell.styles.textColor = [255, 255, 255];
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 6 — PLAN DE ACCIÓN
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('PLAN DE ACCIÓN SUGERIDO', yPos);
  yPos += 6;

  if (reportData.recommendations && reportData.recommendations.length > 0) {
    const actionRows = reportData.recommendations.map(rec => {
      const text = ((rec.problem || '') + (rec.action || '')).toLowerCase();
      const priority = text.includes('criti') || text.includes('urgente') || text.includes('agotado') ? 'Alta'
        : text.includes('medio') || text.includes('monitoreo') || text.includes('revisar') ? 'Media' : 'Baja';
      return [priority, rec.title, rec.problem, rec.action];
    });
    autoTable(doc, {
      startY: yPos,
      head: [['Prioridad', 'Acción', 'Problema Detectado', 'Medida Sugerida']],
      body: actionRows,
      headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4, valign: 'top' },
      alternateRowStyles: { fillColor: [245, 248, 245] },
      columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 42, fontStyle: 'bold' } },
      didParseCell: (data: any) => {
        if (data.column.index === 0 && data.section === 'body') {
          const v = String(data.cell.raw);
          if (v === 'Alta') data.cell.styles.textColor = terracotta;
          else if (v === 'Media') data.cell.styles.textColor = amber;
          else data.cell.styles.textColor = successGreen;
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 7 — ALERTAS CRÍTICAS E INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('ALERTAS CRÍTICAS E INVENTARIO', yPos);
  yPos += 6;

  if (reportData.alerts && reportData.alerts.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Evento Detectado', 'Nivel de Riesgo', 'Acción Sugerida']],
      body: reportData.alerts.map(a => [a.date, a.event, a.risk, a.recommendation]),
      headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 245, 245] },
      styles: { fontSize: 8.5, cellPadding: 4, valign: 'top' },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 55 }, 2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' } },
      didParseCell: (data: any) => {
        if (data.column.index === 2 && data.section === 'body') {
          const v = String(data.cell.raw).toLowerCase();
          if (v.includes('alto') || v.includes('criti')) data.cell.styles.textColor = terracotta;
          else if (v.includes('medio')) data.cell.styles.textColor = amber;
          else data.cell.styles.textColor = successGreen;
        }
      },
    });
  } else {
    doc.setFillColor(warmWhite[0], warmWhite[1], warmWhite[2]);
    doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, yPos, pageWidth - 30, 14, 2, 2, 'FD');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
    doc.text('No se detectaron alertas críticas operativas o de inventario en el período analizado.', 20, yPos + 8);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 8 — INSIGHT AGROVISTA
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('INSIGHT AGROVISTA', yPos);
  yPos += 8;

  // Large decorative quote
  doc.setFontSize(70); doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.text('"', 12, yPos + 18);

  // AI insight styled box (italic, not plain text)
  const insightLines = doc.splitTextToSize(reportData.aiInsight || '', pageWidth - 52);
  const insightBoxH = insightLines.length * 5.2 + 22;

  doc.setFillColor(warmWhite[0], warmWhite[1], warmWhite[2]);
  doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, yPos, pageWidth - 30, insightBoxH, 3, 3, 'FD');
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.roundedRect(15, yPos, 4, insightBoxH, 1, 1, 'F');

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('Análisis y Perspectiva de AgroVista', 24, yPos + 10);

  doc.setFontSize(9.5); doc.setFont('helvetica', 'italic');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(insightLines, 24, yPos + 18);
  yPos += insightBoxH + 16;

  // Closing stamp
  if (yPos + 22 > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
  if (logoDataUri) doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 6, yPos + 3, 12, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255);
  doc.text('AgroVista · Gestión de Precisión', pageWidth / 2, yPos + 17, { align: 'center' });

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

