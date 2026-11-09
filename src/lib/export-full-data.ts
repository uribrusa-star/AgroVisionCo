import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AppData } from './types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

/**
 * Exporta todos los datos cargados del establecimiento a un archivo Excel (.xlsx) con pestañas organizadas.
 */
export const exportAllProducerDataToExcel = (data: AppData) => {
  const {
    establishmentData,
    batches = [],
    harvests = [],
    agronomistLogs = [],
    phenologyLogs = [],
    culturalPracticeLogs = [],
    collectors = [],
    packers = [],
    collectorPaymentLogs = [],
    packagingLogs = [],
    supplies = [],
    tasks = [],
    producerLogs = [],
    transactions = []
  } = data;

  const workbook = XLSX.utils.book_new();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const estName = establishmentData?.name || 'Mi_Establecimiento';

  // 1. Resumen del Establecimiento
  const summaryRows = [
    { Parámetro: 'Establecimiento', Valor: establishmentData?.name || 'Sin nombre' },
    { Parámetro: 'Productor', Valor: establishmentData?.producer || 'Sin productor' },
    { Parámetro: 'Ubicación', Valor: establishmentData?.location || 'Coronda, Santa Fe' },
    { Parámetro: 'Superficie Total (ha)', Valor: establishmentData?.totalArea || '-' },
    { Parámetro: 'Variedades Principales', Valor: (establishmentData?.varieties || []).join(', ') },
    { Parámetro: 'Fecha de Exportación', Valor: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }) },
    { Parámetro: 'Total de Lotes', Valor: batches.length },
    { Parámetro: 'Total Registros de Cosecha', Valor: harvests.length },
    { Parámetro: 'Total Registros de Bitácora Agronómica', Valor: agronomistLogs.length },
    { Parámetro: 'Total Trabajadores Registrados', Valor: collectors.length + packers.length }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumen');

  // 2. Lotes y Plantaciones
  if (batches.length > 0) {
    const batchRows = batches.map(b => ({
      'Lote / Nombre': b.name || b.batchNumber || b.id,
      'Variedad': b.variety || '-',
      'Superficie (ha)': b.areaHectares || '-',
      'Cantidad de Plantas': b.plantCount || '-',
      'Camellones': b.bedCount || '-',
      'Fecha Plantación': b.plantingDate ? format(new Date(b.plantingDate), 'dd/MM/yyyy') : '-',
      'Estado Fitosanitario': b.sanitaryStatus || 'Normal'
    }));
    const wsBatches = XLSX.utils.json_to_sheet(batchRows);
    wsBatches['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsBatches, 'Lotes');
  }

  // 3. Cosechas
  if (harvests.length > 0) {
    const harvestRows = harvests.map(h => ({
      'Fecha': h.date ? format(new Date(h.date), 'dd/MM/yyyy') : '-',
      'Lote': h.batchNumber || '-',
      'Variedad': h.variety || '-',
      'Kilos Totales': h.kilograms || 0,
      'Recolector': h.collectorName || '-',
      'ID Trazabilidad': h.traceabilityId || '-',
      'Horas': (h as any).hoursWorked || '-'
    }));
    const wsHarvests = XLSX.utils.json_to_sheet(harvestRows);
    wsHarvests['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, wsHarvests, 'Cosechas');
  }

  // 4. Bitácora Agronómica (Ing. Agrónomo)
  if (agronomistLogs.length > 0) {
    const agroRows = agronomistLogs.map(l => ({
      'Fecha': l.date ? format(new Date(l.date), 'dd/MM/yyyy') : '-',
      'Lote': l.batchNumber || '-',
      'Tipo de Tratamiento': l.treatmentType || l.type || '-',
      'Producto': l.productName || l.treatment || '-',
      'Dosis': l.dose || '-',
      'Días Carencia': l.phiDays ?? l.safetyPeriodDays ?? 0,
      'Fecha Fin Carencia': l.phiEndDate ? format(new Date(l.phiEndDate), 'dd/MM/yyyy') : '-',
      'Objetivo / Plaga': l.targetPest || '-',
      'Ingeniero / Profesional': l.agronomistName || 'Ing. Agrónomo',
      'Observaciones': l.observations || l.notes || '-'
    }));
    const wsAgro = XLSX.utils.json_to_sheet(agroRows);
    wsAgro['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, wsAgro, 'Bitácora Agronómica');
  }

  // 5. Fenología y Monitoreo Sanitario
  if (phenologyLogs.length > 0) {
    const phenoRows = phenologyLogs.map(p => ({
      'Fecha': p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
      'Lote': p.batchNumber || '-',
      'Etapa Fenológica': p.stage || '-',
      'Floración (%)': p.floweringPercentage != null ? `${p.floweringPercentage}%` : '-',
      'Cuaje (%)': p.fruitSetPercentage != null ? `${p.fruitSetPercentage}%` : '-',
      'Maduración (%)': p.ripeningPercentage != null ? `${p.ripeningPercentage}%` : '-',
      'Estado General': p.healthStatus || '-',
      'Observaciones': p.observations || p.notes || '-'
    }));
    const wsPheno = XLSX.utils.json_to_sheet(phenoRows);
    wsPheno['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, wsPheno, 'Fenología');
  }

  // 6. Labores Culturales (Riego, Poda, Carpida, etc.)
  if (culturalPracticeLogs.length > 0) {
    const cultRows = culturalPracticeLogs.map(c => ({
      'Fecha': c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-',
      'Lote': c.batchNumber || '-',
      'Labor': c.practiceType || '-',
      'Personal a Cargo': c.personnelName || '-',
      'Horas Trabajadas': c.hoursWorked || 0,
      'Costo por Hora (ARS)': c.costPerHour || 0,
      'Pago Total (ARS)': c.payment || 0,
      'Notas': c.notes || '-'
    }));
    const wsCult = XLSX.utils.json_to_sheet(cultRows);
    wsCult['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 25 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsCult, 'Labores Culturales');
  }

  // 7. Personal (Recolectores y Embaladores)
  const personnelRows: any[] = [];
  collectors.forEach(c => {
    personnelRows.push({
      'Rol': 'Recolector',
      'Nombre': c.name,
      'DNI / Documento': c.dni || '-',
      'Teléfono': c.phone || '-',
      'Estado': c.active ? 'Activo' : 'Inactivo',
      'Kilos Históricos': c.totalKgHarvested || '-'
    });
  });
  packers.forEach(p => {
    personnelRows.push({
      'Rol': 'Embalador',
      'Nombre': p.name,
      'DNI / Documento': p.dni || '-',
      'Teléfono': p.phone || '-',
      'Estado': p.active ? 'Activo' : 'Inactivo',
      'Kilos Históricos': p.totalKgPackaged || '-'
    });
  });
  if (personnelRows.length > 0) {
    const wsPersonnel = XLSX.utils.json_to_sheet(personnelRows);
    wsPersonnel['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, wsPersonnel, 'Personal');
  }

  // 8. Pagos y Liquidaciones
  const paymentRows: any[] = [];
  collectorPaymentLogs.forEach(p => {
    paymentRows.push({
      'Fecha': p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
      'Concepto': 'Pago Cosecha',
      'Beneficiario': p.collectorName || '-',
      'Kilos / Cantidad': p.kilograms || 0,
      'Tarifa (ARS)': p.ratePerKg || 0,
      'Monto Pagado (ARS)': p.payment || 0,
      'ID Cosecha': p.traceabilityId || '-'
    });
  });
  packagingLogs.forEach(p => {
    paymentRows.push({
      'Fecha': p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
      'Concepto': 'Pago Embalaje',
      'Beneficiario': p.packerName || '-',
      'Kilos / Cantidad': p.kilogramsPackaged || 0,
      'Tarifa (ARS)': p.kilogramsPackaged > 0 ? Number((p.payment / p.kilogramsPackaged).toFixed(2)) : 0,
      'Monto Pagado (ARS)': p.payment || 0,
      'ID Cosecha': '-'
    });
  });
  if (paymentRows.length > 0) {
    const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
    wsPayments['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsPayments, 'Liquidaciones');
  }

  // 9. Inventario de Insumos
  if (supplies.length > 0) {
    const supplyRows = supplies.map(s => ({
      'Insumo': s.name,
      'Categoría': s.category || '-',
      'Stock Actual': s.currentStock ?? s.quantity ?? 0,
      'Unidad': s.unit || 'unidades',
      'Stock Mínimo': s.minStock || '-',
      'Ubicación': s.location || 'Depósito'
    }));
    const wsSupplies = XLSX.utils.json_to_sheet(supplyRows);
    wsSupplies['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsSupplies, 'Insumos');
  }

  // 10. Bitácora del Productor / Finanzas
  if (transactions.length > 0) {
    const transRows = transactions.map(t => ({
      'Fecha': t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '-',
      'Tipo': t.type || '-',
      'Categoría': t.category || '-',
      'Descripción': t.description || '-',
      'Monto (ARS)': t.amount || 0
    }));
    const wsTrans = XLSX.utils.json_to_sheet(transRows);
    wsTrans['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, wsTrans, 'Finanzas');
  }

  const filename = `AgroVista_Completo_${sanitizeFilename(estName)}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
};


/**
 * Exporta todos los datos del establecimiento a un informe PDF completo, prolijo y ordenado por secciones.
 */
export const exportAllProducerDataToPDF = (data: AppData) => {
  const {
    establishmentData,
    batches = [],
    harvests = [],
    agronomistLogs = [],
    phenologyLogs = [],
    culturalPracticeLogs = [],
    collectors = [],
    packers = [],
    collectorPaymentLogs = [],
    packagingLogs = [],
    supplies = []
  } = data;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
  const estName = establishmentData?.name || 'Establecimiento Frutillero';
  const producerName = establishmentData?.producer || 'Productor';

  // Paleta de colores AgroVista
  const emeraldPrimary: [number, number, number] = [5, 150, 105];   // #059669
  const emeraldDark: [number, number, number] = [6, 78, 59];        // #064E3B
  const textDark: [number, number, number] = [15, 23, 42];          // #0F172A
  const textMuted: [number, number, number] = [100, 116, 139];      // #64748B
  const bgLight: [number, number, number] = [248, 250, 252];        // #F8FAFC

  let currentY = 15;

  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 20) {
      doc.addPage();
      drawPageHeader(false);
      currentY = 25;
    }
  };

  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Banner superior elegante
      doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('AGROVISTA - REPORTE Y EXTRACCIÓN GENERAL DE DATOS', 14, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Establecimiento: ${estName} | Productor: ${producerName} | Generado el: ${dateStr}`, 14, 18);
      currentY = 32;
    } else {
      // Header mínimo para páginas siguientes
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(0, 12, pageWidth, 12);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`AGROVISTA | ${estName} - Informe General`, 14, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, pageWidth - 14, 8, { align: 'right' });
    }
  };

  // Dibujar encabezado inicial
  drawPageHeader(true);

  // Helper para títulos de sección
  const drawSectionHeader = (title: string, subtitle?: string) => {
    checkPageBreak(18);
    doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
    doc.rect(14, currentY, 3, 9, 'F');

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, 20, currentY + 6.5);

    currentY += 11;

    if (subtitle) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(subtitle, 20, currentY - 1);
      currentY += 3;
    }
  };

  // 1. INFORMACIÓN GENERAL Y RESUMEN
  drawSectionHeader('1. INFORMACIÓN DEL ESTABLECIMIENTO Y QUINTA');
  
  const totalKg = harvests.reduce((acc, h) => acc + (h.kilograms || 0), 0);
  
  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: emeraldDark, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: textDark },
    head: [['Propiedad', 'Detalle']],
    body: [
      ['Establecimiento', estName],
      ['Productor Titular', producerName],
      ['Ubicación', establishmentData?.location || 'Coronda, Santa Fe'],
      ['Superficie Total', establishmentData?.totalArea ? `${establishmentData.totalArea} hectáreas` : 'No informada'],
      ['Variedades en Producción', (establishmentData?.varieties || []).join(', ') || 'No especificadas'],
      ['Cosecha Total Acumulada', `${totalKg.toLocaleString('es-AR')} kg`],
      ['Total de Lotes / Sectores', `${batches.length} lotes`],
      ['Cuadrilla Registrada', `${collectors.length} recolectores | ${packers.length} embaladores`]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. LOTES Y SECTORES
  if (batches.length > 0) {
    drawSectionHeader('2. LOTES Y CAMELLONES REGISTRADOS');
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Lote / Nombre', 'Variedad', 'Superficie', 'Plantas', 'Camellones', 'Fitosanitario']],
      body: batches.map(b => [
        b.name || b.batchNumber || b.id,
        b.variety || '-',
        b.areaHectares ? `${b.areaHectares} ha` : '-',
        b.plantCount ? b.plantCount.toLocaleString('es-AR') : '-',
        b.bedCount ? String(b.bedCount) : '-',
        b.sanitaryStatus || 'Normal'
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 3. COSECHAS
  if (harvests.length > 0) {
    drawSectionHeader('3. REGISTROS DE COSECHA (ÚLTIMOS MOVIMIENTOS)', `Total histórico registrado: ${totalKg.toLocaleString('es-AR')} kg en ${harvests.length} registros`);
    const sortedHarvests = [...harvests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote', 'Variedad', 'Kilos', 'Recolector', 'ID Trazabilidad']],
      body: sortedHarvests.map(h => [
        h.date ? format(new Date(h.date), 'dd/MM/yyyy') : '-',
        h.batchNumber || '-',
        h.variety || '-',
        `${(h.kilograms || 0).toLocaleString('es-AR')} kg`,
        h.collectorName || '-',
        h.traceabilityId || '-'
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. BITÁCORA AGRONÓMICA (ING. AGRÓNOMO)
  if (agronomistLogs.length > 0) {
    drawSectionHeader('4. BITÁCORA AGRONÓMICA Y APLICACIONES (ING. AGRÓNOMO)');
    const sortedAgro = [...agronomistLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote', 'Tratamiento', 'Producto', 'Dosis', 'Carencia', 'Observaciones']],
      body: sortedAgro.map(l => [
        l.date ? format(new Date(l.date), 'dd/MM/yyyy') : '-',
        l.batchNumber || '-',
        l.treatmentType || l.type || '-',
        l.productName || l.treatment || '-',
        l.dose || '-',
        `${l.phiDays ?? l.safetyPeriodDays ?? 0} días`,
        (l.observations || l.notes || '-').substring(0, 50)
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. FENOLOGÍA Y MONITOREO SANITARIO
  if (phenologyLogs.length > 0) {
    drawSectionHeader('5. FENOLOGÍA Y EVOLUCIÓN DEL CULTIVO');
    const sortedPheno = [...phenologyLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote', 'Etapa', 'Floración', 'Cuaje', 'Madurez', 'Observaciones']],
      body: sortedPheno.map(p => [
        p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
        p.batchNumber || '-',
        p.stage || '-',
        p.floweringPercentage != null ? `${p.floweringPercentage}%` : '-',
        p.fruitSetPercentage != null ? `${p.fruitSetPercentage}%` : '-',
        p.ripeningPercentage != null ? `${p.ripeningPercentage}%` : '-',
        (p.observations || p.notes || '-').substring(0, 40)
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. LABORES CULTURALES (RIEGO, PODAS, LIMPIEZA)
  if (culturalPracticeLogs.length > 0) {
    drawSectionHeader('6. LABORES CULTURALES Y MANTENIMIENTO');
    const sortedCult = [...culturalPracticeLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote', 'Labor', 'Personal', 'Horas', 'Pago Total']],
      body: sortedCult.map(c => [
        c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-',
        c.batchNumber || '-',
        c.practiceType || '-',
        c.personnelName || '-',
        `${c.hoursWorked || 0} hs`,
        `$${(c.payment || 0).toLocaleString('es-AR')}`
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 7. INVENTARIO ACTUAL DE INSUMOS
  if (supplies.length > 0) {
    drawSectionHeader('7. INVENTARIO DE INSUMOS Y DEPÓSITO');
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Insumo', 'Categoría', 'Stock Actual', 'Unidad', 'Stock Mínimo', 'Ubicación']],
      body: supplies.map(s => [
        s.name,
        s.category || '-',
        String(s.currentStock ?? s.quantity ?? 0),
        s.unit || 'unidades',
        s.minStock ? String(s.minStock) : '-',
        s.location || 'Depósito Principal'
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 8. PERSONAL Y CUADRILLAS REGISTRADAS
  if (collectors.length > 0 || packers.length > 0) {
    drawSectionHeader('8. PERSONAL REGISTRADO (COSECHEROS Y EMBALADORES)');
    const allPersonal = [
      ...collectors.map(c => ['Recolector', c.name, c.dni || '-', c.phone || '-', c.active ? 'Activo' : 'Inactivo']),
      ...packers.map(p => ['Embalador', p.name, p.dni || '-', p.phone || '-', p.active ? 'Activo' : 'Inactivo'])
    ];
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Rol', 'Nombre y Apellido', 'DNI', 'Teléfono', 'Estado']],
      body: allPersonal
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Pie de página en todas las hojas generadas
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`AgroVista &bull; Sistema Integral para Productores de Frutilla &bull; Coronda, Santa Fe`, 14, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  const filename = `AgroVista_Informe_${sanitizeFilename(estName)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

/**
 * Exporta el JSON completo de respaldo técnico.
 */
export const exportAllProducerDataToJSON = (data: AppData) => {
  const estName = data.establishmentData?.name || 'Mi_Establecimiento';
  const cleanData = {
    exportDate: new Date().toISOString(),
    establishment: data.establishmentData,
    batches: data.batches,
    harvests: data.harvests,
    agronomistLogs: data.agronomistLogs,
    phenologyLogs: data.phenologyLogs,
    culturalPracticeLogs: data.culturalPracticeLogs,
    collectors: data.collectors,
    packers: data.packers,
    collectorPaymentLogs: data.collectorPaymentLogs,
    packagingLogs: data.packagingLogs,
    supplies: data.supplies,
    tasks: data.tasks,
    producerLogs: data.producerLogs,
    transactions: data.transactions
  };

  const jsonString = JSON.stringify(cleanData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AgroVista_Backup_${sanitizeFilename(estName)}_${format(new Date(), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
