import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Batch, Harvest, AgronomistLog, PhenologyLog, EstablishmentData } from './types';

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
