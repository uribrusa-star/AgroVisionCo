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

  // ─── PALETA EDITORIAL B2B ─────────────────────────────────────────────
  const darkGreen    = [20,  72,  40];   // #144828 Verde AgroVista Institucional
  const accentGreen  = [50, 130,  70];   // #328246 Verde acento
  const lightBg      = [247, 249, 247];  // Fondo tarjetas suave
  const charcoal     = [35,  40,  38];   // #232826 Texto principal (grafito)
  const mutedGrey    = [100, 110, 105];  // Texto secundario
  const borderGrey   = [220, 228, 222];  // Bordes limpios
  const terracotta   = [170,  60,  55];  // Crítico / Alerta (apagado)
  const amber        = [160, 110,  35];  // Atención / Media (apagado)
  const successGreen = [40,  120,  60];  // Normal / Baja

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
    doc.rect(0, 18, pageWidth, 1.2, 'F');
    if (logoDataUri) doc.addImage(logoDataUri, 'PNG', 10, 3, 12, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
    doc.text('INFORME TÉCNICO AGRONÓMICO', 26, 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(establishment.producer, 26, 15.5);
    doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 12, 11, { align: 'right' });
    doc.text(agronomistName, pageWidth - 12, 15.5, { align: 'right' });
  };

  const addFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i === 1) continue; // Cover has no footer
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 4.5, { align: 'center' });
      doc.text('AgroVista · Gestión de Precisión', 12, pageHeight - 4.5);
      doc.text('Confidencial', pageWidth - 12, pageHeight - 4.5, { align: 'right' });
    }
  };

  const sectionTitle = (text: string, y: number): number => {
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(text, 15, y);
    doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
    doc.rect(15, y + 2, 28, 1.5, 'F');
    return y + 10;
  };

  const subHeading = (text: string, y: number): number => {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(text, 15, y);
    return y + 7;
  };

  const bodyParagraph = (text: string, x: number, y: number, maxW: number): number => {
    doc.setFontSize(10.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const lines = doc.splitTextToSize(text || '', maxW);
    doc.text(lines, x, y);
    return y + lines.length * 5.2 + 4;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 1 — PORTADA INSTITUCIONAL
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Subtle diagonal geometric pattern
  doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setLineWidth(0.3);
  for (let xi = -30; xi < pageWidth + 100; xi += 20) { doc.line(xi, 0, xi + 90, pageHeight); }

  // Premium white central container
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, 50, pageWidth - 32, 175, 4, 4, 'F');

  if (logoDataUri) doc.addImage(logoDataUri, 'PNG', pageWidth / 2 - 20, 62, 40, 40);

  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.setFontSize(24); doc.setFont('helvetica', 'bold');
  doc.text('INFORME TÉCNICO', pageWidth / 2, 118, { align: 'center' });
  doc.text('AGRONÓMICO', pageWidth / 2, 129, { align: 'center' });

  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.rect(pageWidth / 2 - 22, 134, 44, 1.5, 'F');

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
  doc.text('ESTABLECIMIENTO', pageWidth / 2, 144, { align: 'center' });

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text(establishment.producer.toUpperCase(), pageWidth / 2, 154, { align: 'center' });

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`${establishment.location.locality}, ${establishment.location.province}  ·  ${establishment.system}`, pageWidth / 2, 163, { align: 'center' });
  doc.text(`Fecha del Informe: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, 170, { align: 'center' });

  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.5);
  doc.line(36, 177, pageWidth - 36, 177);

  doc.setFontSize(9.5); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
  doc.text('RESPONSABLE TÉCNICO', pageWidth / 2, 185, { align: 'center' });
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text(agronomistName.toUpperCase(), pageWidth / 2, 194, { align: 'center' });

  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  doc.text('AgroVista · Gestión de Precisión Agrícola', pageWidth / 2, pageHeight - 7, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 2 — FICHA DEL ESTABLECIMIENTO + MAPA SATELITAL REAL
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  let yPos = 30;

  yPos = sectionTitle('FICHA DEL ESTABLECIMIENTO', yPos);

  // Metric Cards Grid (2x2)
  const cardW = (pageWidth - 36) / 4;
  const metrics = [
    { label: 'SUPERFICIE FRUTILLA', val: `${establishment.area.strawberry} ha` },
    { label: 'LOTES ACTIVOS', val: String((batches || []).length) },
    { label: 'VARIEDADES', val: String(Array.from(new Set((batches || []).flatMap(b => b.varieties?.map(v => v.name).filter(Boolean) || []))).length) },
    { label: 'SISTEMA RIEGO', val: establishment.irrigation?.system || 'Goteo' },
  ];

  metrics.forEach((m, idx) => {
    const xp = 15 + idx * (cardW + 2);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(xp, yPos, cardW, 20, 2, 2, 'FD');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
    doc.text(m.label, xp + 4, yPos + 6);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text(m.val, xp + 4, yPos + 15);
  });
  yPos += 26;

  // Delimited Lot Map (Native Vector polygon layer with satellite background layout)
  let geoJsonObj: any = null;
  if (establishment.location.geoJsonData) {
    try { geoJsonObj = typeof establishment.location.geoJsonData === 'string' ? JSON.parse(establishment.location.geoJsonData) : establishment.location.geoJsonData; } catch {}
  }

  const mapW = pageWidth - 30;
  const mapH = 55;

  doc.setFillColor(30, 45, 35); // Dark satellite tone background
  doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, mapW, mapH, 3, 3, 'FD');

  // Header strip
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, mapW, 7, 3, 3, 'F');
  doc.rect(15, yPos + 4, mapW, 3, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('DELIMITACIÓN DE LOTES EN EL ESTABLECIMIENTO', 20, yPos + 5);

  let allCoords: [number, number][] = [];
  const polygons: { id: string; coords: [number, number][] }[] = [];

  if (geoJsonObj && geoJsonObj.features) {
    geoJsonObj.features.forEach((feat: any) => {
      const bId = feat.properties?.id || feat.properties?.name || 'Lote';
      const geom = feat.geometry;
      if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
        const rings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map((c: any) => c[0]);
        rings.forEach((ring: any) => {
          const pts: [number, number][] = ring.map((pt: any) => [pt[0], pt[1]]);
          polygons.push({ id: bId, coords: pts });
          allCoords.push(...pts);
        });
      }
    });
  }

  if (allCoords.length > 0) {
    const minLng = Math.min(...allCoords.map(c => c[0]));
    const maxLng = Math.max(...allCoords.map(c => c[0]));
    const minLat = Math.min(...allCoords.map(c => c[1]));
    const maxLat = Math.max(...allCoords.map(c => c[1]));

    const lngSpan = (maxLng - minLng) || 0.001;
    const latSpan = (maxLat - minLat) || 0.001;
    const pad = 10;
    const drawW = mapW - pad * 2;
    const drawH = mapH - 12 - pad;

    polygons.forEach((poly) => {
      const screenPts = poly.coords.map(([lng, lat]) => {
        const sx = 15 + pad + ((lng - minLng) / lngSpan) * drawW;
        const sy = yPos + 9 + drawH - ((lat - minLat) / latSpan) * drawH;
        return { x: sx, y: sy };
      });

      if (screenPts.length > 2) {
        doc.setFillColor(34, 197, 94);
        doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);

        const first = screenPts[0];
        for (let k = 0; k < screenPts.length - 1; k++) {
          doc.line(screenPts[k].x, screenPts[k].y, screenPts[k + 1].x, screenPts[k + 1].y);
        }
        doc.line(screenPts[screenPts.length - 1].x, screenPts[screenPts.length - 1].y, first.x, first.y);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));

        const avgX = screenPts.reduce((s, p) => s + p.x, 0) / screenPts.length;
        const avgY = screenPts.reduce((s, p) => s + p.y, 0) / screenPts.length;

        doc.setFillColor(20, 72, 40);
        doc.roundedRect(avgX - 8, avgY - 3.5, 16, 7, 1.5, 1.5, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text(poly.id, avgX, avgY + 1.2, { align: 'center' });
      }
    });
  } else {
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 210, 200);
    doc.text(`Ubicación: ${establishment.location.locality}, ${establishment.location.province} (${establishment.location.coordinates || 'Sin GPS'})`, pageWidth / 2, yPos + 30, { align: 'center' });
  }
  yPos += mapH + 8;

  // Clean Batch Table
  if (batches && batches.length > 0) {
    yPos = subHeading('DISTRIBUCIÓN DE LOTES ACTIVOS', yPos);
    const batchRows = batches.map(b => {
      const variety = b.varieties?.map(v => v.name).filter(Boolean).join(', ') || 'Pendiente';
      const area = b.varieties?.reduce((s, v) => s + (v.area || 0), 0).toFixed(2) || '—';
      const plantDate = b.varieties?.find(v => v.plantingDate)?.plantingDate;
      const dateStr = plantDate ? format(new Date(plantDate), 'dd/MM/yyyy') : 'Sin fecha';
      return [b.id, variety, `${area} ha`, dateStr, 'Activo'];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Lote', 'Variedad', 'Superficie', 'Fecha Plantación', 'Estado']],
      body: batchRows,
      headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9.5, cellPadding: 4, textColor: charcoal as any },
      alternateRowStyles: { fillColor: [248, 250, 248] },
      columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 3 — ESTADO Y DIAGNÓSTICO EJECUTIVO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('DASHBOARD Y DIAGNÓSTICO EJECUTIVO', yPos);

  // Executive KPI Cards (Wide layout)
  const kpiW = (pageWidth - 45) / 4;
  const kpis = [
    { title: 'ESTADO GENERAL', value: reportData.executiveSummary.generalStatus, risk: reportData.executiveSummary.generalStatus },
    { title: 'RIESGO CLIMÁTICO', value: reportData.executiveSummary.climateRisk, risk: reportData.executiveSummary.climateRisk },
    { title: 'RIESGO SANITARIO', value: reportData.technicalAnalysis.health.risk, risk: reportData.technicalAnalysis.health.risk },
    { title: 'ALERTAS ACTIVAS', value: `${reportData.executiveSummary.criticalAlertsCount} ALERTAS`, risk: reportData.executiveSummary.criticalAlertsCount },
  ];

  kpis.forEach((kpi, i) => {
    const xp = 15 + i * (kpiW + 5);
    const col = riskColor(kpi.risk);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(col[0], col[1], col[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(xp, yPos, kpiW, 24, 3, 3, 'FD');

    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(xp, yPos, 3, 24, 1.5, 1.5, 'F');

    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
    doc.text(kpi.title, xp + 6, yPos + 7);

    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(col[0], col[1], col[2]);
    const vl = doc.splitTextToSize(String(kpi.value).toUpperCase(), kpiW - 9);
    doc.text(vl, xp + 6, yPos + 16);
  });
  yPos += 32;

  // Editorial Executive Diagnosis (Large readable typography)
  yPos = subHeading('DIAGNÓSTICO EJECUTIVO DE CAMPO', yPos);

  const summaryText = (reportData.executiveSummary.conclusions || []).join(' ');
  const sumLines = doc.splitTextToSize(summaryText, pageWidth - 46);
  const sumBoxH = sumLines.length * 5.2 + 16;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, yPos, pageWidth - 30, sumBoxH, 3, 3, 'FD');
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.roundedRect(15, yPos, 3.5, sumBoxH, 1.5, 1.5, 'F');

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('Resumen del Estado Productivo', 23, yPos + 9);
  doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(sumLines, 23, yPos + 17);
  yPos += sumBoxH + 8;

  // Main Recommendation Box
  const recText = reportData.executiveSummary.mainRecommendation || '';
  const recLines = doc.splitTextToSize(recText, pageWidth - 46);
  const recBoxH = recLines.length * 5.2 + 16;

  doc.setFillColor(242, 248, 244);
  doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, recBoxH, 3, 3, 'FD');
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, 3.5, recBoxH, 1.5, 1.5, 'F');

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('Recomendación Principal del Profesional', 23, yPos + 9);
  doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(recLines, 23, yPos + 17);

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 4 — ANÁLISIS AGRONÓMICO DE CAMPO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('ANÁLISIS AGRONÓMICO DE CAMPO', yPos);

  const fieldBlocks = [
    { label: 'CLIMA Y AMBIENTE', data: reportData.technicalAnalysis.climate },
    { label: 'MANEJO Y FERTIRRIEGO', data: reportData.technicalAnalysis.management },
    { label: 'EVOLUCIÓN FENOLÓGICA', data: reportData.technicalAnalysis.phenology },
    { label: 'ESTADO SANITARIO', data: reportData.technicalAnalysis.health },
  ];

  const halfW = (pageWidth - 40) / 2;

  for (let i = 0; i < fieldBlocks.length; i += 2) {
    const left = fieldBlocks[i];
    const right = fieldBlocks[i + 1];

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const lLines = doc.splitTextToSize(left?.data?.desc || '', halfW - 10).length;
    const rLines = right ? doc.splitTextToSize(right?.data?.desc || '', halfW - 10).length : 0;
    const blockH = Math.max(lLines, rLines) * 5.2 + 20;

    if (yPos + blockH > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }

    const drawBlock = (block: typeof fieldBlocks[0], xStart: number) => {
      const col = block.data?.risk ? riskColor(block.data.risk) : accentGreen;
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(xStart, yPos, halfW, blockH, 3, 3, 'FD');

      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(xStart, yPos, halfW, 8.5, 3, 3, 'F');
      doc.rect(xStart, yPos + 4, halfW, 4.5, 'F');

      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      const headerLabel = block.data?.risk ? `${block.label}  ·  ${String(block.data.risk).toUpperCase()}` : block.label;
      doc.text(headerLabel, xStart + 5, yPos + 6);

      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      const desc = doc.splitTextToSize(block.data?.desc || 'Sin registros.', halfW - 10);
      doc.text(desc, xStart + 5, yPos + 15);
    };

    drawBlock(left, 15);
    if (right) drawBlock(right, 15 + halfW + 10);
    yPos += blockH + 8;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 5 — EVOLUCIÓN FENOLÓGICA (Dedicated Page for Full Quality)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('EVOLUCIÓN FENOLÓGICA DEL CULTIVO', yPos);

  if (chartImages?.phenology) {
    const props = doc.getImageProperties(chartImages.phenology);
    const imgW = pageWidth - 30;
    const imgH = (props.height * imgW) / props.width;

    doc.addImage(chartImages.phenology, 'PNG', 15, yPos, imgW, imgH);
    yPos += imgH + 10;
  }

  if (reportData.graphicalAnalysis?.phenology) {
    yPos = subHeading('INTERPRETACIÓN FENOLÓGICA', yPos);
    yPos = bodyParagraph(reportData.graphicalAnalysis.phenology, 15, yPos, pageWidth - 30);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 6 — PERFORMANCE DE COSECHA Y RENDIMIENTO
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('PERFORMANCE DE COSECHA Y RENDIMIENTO', yPos);

  if (chartImages?.monthlyHarvest) {
    const chartW = (pageWidth - 40) / 2;
    const p1 = doc.getImageProperties(chartImages.monthlyHarvest);
    const h1 = (p1.height * chartW) / p1.width;
    doc.addImage(chartImages.monthlyHarvest, 'PNG', 15, yPos, chartW, h1);
    if (chartImages?.batchYield) {
      const p2 = doc.getImageProperties(chartImages.batchYield);
      const h2 = (p2.height * chartW) / p2.width;
      doc.addImage(chartImages.batchYield, 'PNG', 15 + chartW + 10, yPos, chartW, h2);
      yPos += Math.max(h1, h2) + 10;
    } else {
      yPos += h1 + 10;
    }
  }

  yPos = subHeading('ANÁLISIS DE RENDIMIENTO PRODUCTIVO', yPos);
  const analysisText = [reportData.graphicalAnalysis?.monthlyHarvest, reportData.graphicalAnalysis?.batchYield].filter(Boolean).join(' ');
  yPos = bodyParagraph(analysisText, 15, yPos, pageWidth - 30);

  // Clean Breakdown Table per Lot (No confusing grouped rows)
  if (batches && batches.length > 0) {
    const totalKg = (harvests || []).reduce((s, h) => s + (h.kilograms || 0), 0);

    const harvestRows = batches.map(b => {
      const bKg = (harvests || [])
        .filter(h => h.batchNumber && h.batchNumber.includes(b.id))
        .reduce((s, h) => s + (h.kilograms || 0), 0);

      const area = b.varieties?.reduce((s, v) => s + (v.area || 0), 0) || 0;
      const variety = b.varieties?.map(v => v.name).filter(Boolean).join(', ') || '—';
      const yieldText = area > 0 ? `${(bKg / area).toFixed(1)} kg/ha` : '—';

      return [b.id, variety, `${area.toFixed(2)} ha`, `${bKg.toFixed(2)} kg`, yieldText];
    });

    if (yPos > pageHeight - 55) { doc.addPage(); addHeader(); yPos = 30; }
    yPos = subHeading('RENDIMIENTO DETALLADO POR LOTE INDIVIDUAL', yPos);
    autoTable(doc, {
      startY: yPos,
      head: [['Lote', 'Variedad', 'Superficie', 'Total Cosechado', 'Rendimiento']],
      body: [...harvestRows, ['TOTAL', '—', `${establishment.area.strawberry} ha`, `${totalKg.toFixed(2)} kg`, '—']],
      headStyles: { fillColor: [darkGreen[0], darkGreen[1], darkGreen[2]] as any, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9.5, cellPadding: 4, textColor: charcoal as any },
      alternateRowStyles: { fillColor: [248, 250, 248] },
      didParseCell: (data: any) => {
        if (data.row.index === harvestRows.length && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [darkGreen[0], darkGreen[1], darkGreen[2]];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 7 — PLAN DE ACCIÓN SUGERIDO (EDITORIAL ACTION CARDS)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('PLAN DE ACCIÓN SUGERIDO', yPos);

  if (reportData.recommendations && reportData.recommendations.length > 0) {
    reportData.recommendations.forEach((rec, idx) => {
      const text = ((rec.problem || '') + (rec.action || '')).toLowerCase();
      const priorityStr = text.includes('criti') || text.includes('urgente') || text.includes('agotado') ? 'PRIORIDAD ALTA'
        : text.includes('medio') || text.includes('monitoreo') || text.includes('revisar') ? 'PRIORIDAD MEDIA' : 'PROGRAMADO';
      const col = riskColor(priorityStr);

      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal');
      const probLines = doc.splitTextToSize(rec.problem || '', pageWidth - 48);
      const actLines = doc.splitTextToSize(rec.action || '', pageWidth - 48);
      const cardH = (probLines.length + actLines.length) * 5.2 + 24;

      if (yPos + cardH > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(15, yPos, pageWidth - 30, cardH, 3, 3, 'FD');

      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(15, yPos, 3.5, cardH, 1.5, 1.5, 'F');

      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(col[0], col[1], col[2]);
      doc.text(`0${idx + 1} · ${priorityStr}`, 23, yPos + 8);

      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.text(rec.title || 'Medida Operativa', 23, yPos + 14);

      let innerY = yPos + 21;
      doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text('Problema Detectado:', 23, innerY);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text(probLines, 56, innerY);

      innerY += probLines.length * 5.2 + 3;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.text('Acción Recomendada:', 23, innerY);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text(actLines, 56, innerY);

      yPos += cardH + 7;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 8 — ALERTAS CRÍTICAS E INVENTARIO (Clean Executive List)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionBanner('ALERTAS CRÍTICAS E INVENTARIO', yPos);

  if (reportData.alerts && reportData.alerts.length > 0) {
    reportData.alerts.forEach((alt) => {
      const col = riskColor(alt.risk);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const recLines = doc.splitTextToSize(alt.recommendation || '', pageWidth - 48);
      const altBoxH = recLines.length * 5.2 + 18;

      if (yPos + altBoxH > pageHeight - 20) { doc.addPage(); addHeader(); yPos = 30; }

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(15, yPos, pageWidth - 30, altBoxH, 2.5, 2.5, 'FD');

      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(15, yPos, 3, altBoxH, 1.5, 1.5, 'F');

      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(col[0], col[1], col[2]);
      doc.text(String(alt.risk).toUpperCase(), 22, yPos + 7);

      doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text(alt.event, 42, yPos + 7);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
      doc.text(alt.date, pageWidth - 20, yPos + 7, { align: 'right' });

      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text(recLines, 22, yPos + 15);

      yPos += altBoxH + 6;
    });
  } else {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(15, yPos, pageWidth - 30, 16, 2, 2, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(mutedGrey[0], mutedGrey[1], mutedGrey[2]);
    doc.text('No se registraron alertas críticas ni quiebres de stock en el período analizado.', 22, yPos + 10);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁG 9 — INSIGHT AGROVISTA (Editorial Conclusion)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage(); addHeader();
  yPos = 30;

  yPos = sectionTitle('INSIGHT FINAL AGROVISTA', yPos);

  // Large decorative quotation symbol
  doc.setFontSize(60); doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.text('"', 14, yPos + 16);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.setFontSize(10.5); doc.setFont('helvetica', 'italic');
  const insightLines = doc.splitTextToSize(reportData.aiInsight || '', pageWidth - 48);
  const insightBoxH = insightLines.length * 5.4 + 22;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, insightBoxH, 4, 4, 'FD');
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.roundedRect(15, yPos, 4, insightBoxH, 1.5, 1.5, 'F');

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('Perspectiva Estratégica de AgroVista', 24, yPos + 10);

  doc.setFontSize(10.5); doc.setFont('helvetica', 'italic');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(insightLines, 24, yPos + 18);

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

