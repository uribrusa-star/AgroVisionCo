import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AppData, Batch, Harvest } from './types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

/**
 * Helper para resolver la variedad o variedades a partir de uno o múltiples lotes (ej: "L001, L002")
 */
function resolveVarietiesForBatches(batchString: string | undefined, batches: Batch[], fallbackVariety?: string): string {
  if (!batchString) return fallbackVariety || '-';
  
  const batchIds = batchString.split(',').map(s => s.trim().toUpperCase());
  const foundVarieties = new Set<string>();

  batchIds.forEach(id => {
    const batch = batches.find(b => b.id.toUpperCase() === id);
    if (batch?.varieties && batch.varieties.length > 0) {
      batch.varieties.forEach(v => {
        if (v.name) foundVarieties.add(v.name);
      });
    }
  });

  if (foundVarieties.size > 0) {
    return Array.from(foundVarieties).join(', ');
  }

  return fallbackVariety || '-';
}

/**
 * Helper para formatear la ubicación
 */
function formatLocation(location: any): string {
  if (!location) return 'Coronda, Santa Fe';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    const parts = [location.locality, location.province].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (location.coordinates) return `Coord: ${location.coordinates}`;
  }
  return 'Coronda, Santa Fe';
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
  const defaultVariety = establishmentData?.planting?.variety || (establishmentData?.varieties || []).join(', ') || '-';

  // 1. Resumen del Establecimiento
  const totalStrawberryArea = establishmentData?.area?.strawberry != null 
    ? `${establishmentData.area.strawberry} ha` 
    : (establishmentData?.totalArea ? `${establishmentData.totalArea} ha` : '-');

  const totalAreaStr = establishmentData?.area?.total != null
    ? `${establishmentData.area.total} ha (Total) / ${totalStrawberryArea} (Frutilla)`
    : totalStrawberryArea;

  const summaryRows = [
    { Parámetro: 'Establecimiento', Valor: establishmentData?.name || 'Establecimiento Frutillero' },
    { Parámetro: 'Productor Titular', Valor: establishmentData?.producer || 'Sin productor' },
    { Parámetro: 'Responsable Técnico', Valor: establishmentData?.technicalManager || 'Ing. Agrónomo' },
    { Parámetro: 'Ubicación', Valor: formatLocation(establishmentData?.location) },
    { Parámetro: 'Superficie', Valor: totalAreaStr },
    { Parámetro: 'Variedad Principal', Valor: defaultVariety },
    { Parámetro: 'Sistema de Producción', Valor: establishmentData?.system || 'Semiprotegido en microtúneles' },
    { Parámetro: 'Sello de Buenas Prácticas (BPA)', Valor: establishmentData?.hasGoodPracticesSeal ? 'Certificado' : 'En proceso' },
    { Parámetro: 'Fecha de Exportación', Valor: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }) },
    { Parámetro: 'Total de Lotes Registrados', Valor: batches.length },
    { Parámetro: 'Total Cargas de Cosecha', Valor: harvests.length },
    { Parámetro: 'Total Kilos Cosechados', Valor: harvests.reduce((acc, h) => acc + (h.kilograms || 0), 0) },
    { Parámetro: 'Total Registros de Bitácora Agronómica', Valor: agronomistLogs.length },
    { Parámetro: 'Personal Registrado', Valor: `${collectors.length} recolectores | ${packers.length} embaladores` }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumen');

  // 2. Lotes y Plantaciones
  if (batches.length > 0) {
    const batchRows = batches.map(b => {
      const varietiesList = b.varieties && b.varieties.length > 0 
        ? b.varieties.map(v => v.name).filter(Boolean).join(', ') 
        : defaultVariety;

      const totalPlants = b.varieties && b.varieties.length > 0
        ? b.varieties.reduce((sum, v) => sum + (v.plantCount || 0), 0)
        : (b.plantCount || '-');

      const totalArea = b.varieties && b.varieties.length > 0
        ? b.varieties.reduce((sum, v) => sum + (v.area || 0), 0)
        : (b.areaHectares || '-');

      return {
        'Lote': b.id || b.name || b.batchNumber,
        'Variedades': varietiesList,
        'Superficie (ha)': totalArea || '-',
        'Cantidad de Plantas': totalPlants || '-',
        'Camellones': b.bedCount || '-',
        'Fecha Alta / Precarga': b.preloadedDate ? format(new Date(b.preloadedDate), 'dd/MM/yyyy') : (b.plantingDate ? format(new Date(b.plantingDate), 'dd/MM/yyyy') : '-'),
        'Estado': b.status === 'completed' ? 'Cerrado' : 'Activo'
      };
    });
    const wsBatches = XLSX.utils.json_to_sheet(batchRows);
    wsBatches['!cols'] = [{ wch: 15 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, wsBatches, 'Lotes');
  }

  // 3. Cosechas
  if (harvests.length > 0) {
    const harvestRows = harvests.map(h => {
      const lotes = h.batchNumber || '-';
      const variedad = (h as any).variety || resolveVarietiesForBatches(lotes, batches, defaultVariety);
      const recolector = h.collector?.name || (h as any).collectorName || '-';

      return {
        'Fecha': h.date ? format(new Date(h.date), 'dd/MM/yyyy') : '-',
        'Lote(s)': lotes,
        'Variedad': variedad,
        'Kilos Totales': h.kilograms || 0,
        'Recolector': recolector,
        'ID Trazabilidad': h.traceabilityId || '-'
      };
    });
    const wsHarvests = XLSX.utils.json_to_sheet(harvestRows);
    wsHarvests['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, wsHarvests, 'Cosechas');
  }

  // 4. Bitácora Agronómica (Ing. Agrónomo)
  if (agronomistLogs.length > 0) {
    const agroRows = agronomistLogs.map(l => {
      const lotes = l.batchIds && l.batchIds.length > 0 ? l.batchIds.join(', ') : ((l as any).batchNumber || '-');
      const producto = l.product || (l.supplies && l.supplies.length > 0 ? l.supplies.map(s => `${s.name} (${s.quantity})`).join(', ') : '-');
      const dosis = l.dissolution || (l as any).dose || '-';

      return {
        'Fecha': l.date ? format(new Date(l.date), 'dd/MM/yyyy') : '-',
        'Lote(s)': lotes,
        'Tipo de Labor': l.type || (l as any).treatmentType || '-',
        'Producto Aplicado': producto,
        'Dosis / Disolución': dosis,
        'Días Carencia (PHI)': l.phiDays ?? 0,
        'Diagnóstico': l.diagnosis || '-',
        'Observaciones y Receta': l.notes || (l as any).observations || '-'
      };
    });
    const wsAgro = XLSX.utils.json_to_sheet(agroRows);
    wsAgro['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, wsAgro, 'Bitácora Agronómica');
  }

  // 5. Fenología y Monitoreo Sanitario
  if (phenologyLogs.length > 0) {
    const phenoRows = phenologyLogs.map(p => {
      const lotes = p.batchIds && p.batchIds.length > 0 ? p.batchIds.join(', ') : '-';
      const etapa = p.developmentState || (p as any).stage || '-';

      return {
        'Fecha': p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
        'Lote(s)': lotes,
        'Etapa Fenológica': etapa,
        'Conteo Flores': p.flowerCount != null ? p.flowerCount : '-',
        'Conteo Frutos': p.fruitCount != null ? p.fruitCount : '-',
        'Observaciones': p.notes || (p as any).observations || '-'
      };
    });
    const wsPheno = XLSX.utils.json_to_sheet(phenoRows);
    wsPheno['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, wsPheno, 'Fenología');
  }

  // 6. Labores Culturales (Riego, Poda, Mulching, etc.)
  if (culturalPracticeLogs.length > 0) {
    const cultRows = culturalPracticeLogs.map(c => {
      const lotes = c.batchIds && c.batchIds.length > 0 ? c.batchIds.join(', ') : '-';

      return {
        'Fecha': c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-',
        'Lote(s)': lotes,
        'Labor Realizada': c.practiceType || '-',
        'Personal': c.personnelName || '-',
        'Horas': c.hoursWorked || 0,
        'Costo x Hora (ARS)': c.costPerHour || 0,
        'Pago Total (ARS)': c.payment || 0,
        'Notas': c.notes || '-'
      };
    });
    const wsCult = XLSX.utils.json_to_sheet(cultRows);
    wsCult['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsCult, 'Labores Culturales');
  }

  // 7. Personal (Recolectores y Embaladores)
  const personnelRows: any[] = [];
  collectors.forEach(c => {
    personnelRows.push({
      'Rol': 'Recolector',
      'Nombre y Apellido': c.name,
      'Total Cosechado (kg)': c.totalHarvested || 0,
      'Horas Trabajadas': c.hoursWorked || 0,
      'Productividad (kg/h)': c.productivity || 0,
      'Fecha de Alta': c.joinDate ? format(new Date(c.joinDate), 'dd/MM/yyyy') : '-'
    });
  });
  packers.forEach(p => {
    personnelRows.push({
      'Rol': 'Embalador',
      'Nombre y Apellido': p.name,
      'Total Embalado (kg)': p.totalPackaged || 0,
      'Horas Trabajadas': p.hoursWorked || 0,
      'Rendimiento (kg/h)': p.packagingRate || 0,
      'Fecha de Alta': p.joinDate ? format(new Date(p.joinDate), 'dd/MM/yyyy') : '-'
    });
  });
  if (personnelRows.length > 0) {
    const wsPersonnel = XLSX.utils.json_to_sheet(personnelRows);
    wsPersonnel['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, wsPersonnel, 'Personal');
  }

  // 8. Insumos y Depósito
  if (supplies.length > 0) {
    const supplyRows = supplies.map(s => ({
      'Insumo': s.name,
      'Tipo': s.type || '-',
      'Stock Actual': s.stock != null ? s.stock : 0,
      'Principio Activo': s.info?.activeIngredient || '-',
      'Dosis Recomendada': s.info?.dose || '-',
      'Observaciones': s.info?.notes || '-'
    }));
    const wsSupplies = XLSX.utils.json_to_sheet(supplyRows);
    wsSupplies['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsSupplies, 'Insumos');
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
    supplies = []
  } = data;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
  const estName = establishmentData?.name || 'Establecimiento Frutillero';
  const producerName = establishmentData?.producer || 'Don José';
  const defaultVariety = establishmentData?.planting?.variety || (establishmentData?.varieties || []).join(', ') || 'Frutilla';

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
      currentY = 22;
    }
  };

  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
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
      currentY = 20;
    }
  };

  drawPageHeader(true);

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
  const locationText = formatLocation(establishmentData?.location);

  const totalStrawberryArea = establishmentData?.area?.strawberry != null 
    ? `${establishmentData.area.strawberry} ha` 
    : (establishmentData?.totalArea ? `${establishmentData.totalArea} ha` : 'No informada');

  const totalAreaText = establishmentData?.area?.total != null
    ? `${establishmentData.area.total} ha total (${totalStrawberryArea} en frutilla)`
    : totalStrawberryArea;

  // Extraer variedades de todos los lotes si existen
  const allBatchVarieties = new Set<string>();
  batches.forEach(b => {
    b.varieties?.forEach(v => {
      if (v.name) allBatchVarieties.add(v.name);
    });
  });
  const varietiesText = allBatchVarieties.size > 0 
    ? Array.from(allBatchVarieties).join(', ') 
    : (establishmentData?.planting?.variety || (establishmentData?.varieties || []).join(', ') || 'Variedades de frutilla');
  
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
      ['Responsable Técnico', establishmentData?.technicalManager || 'Ing. Agrónomo'],
      ['Ubicación', locationText],
      ['Superficie', totalAreaText],
      ['Variedades en Producción', varietiesText],
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
      head: [['Lote / Nombre', 'Variedad', 'Superficie', 'Plantas', 'Camellones', 'Estado']],
      body: batches.map(b => {
        const lotVarieties = b.varieties && b.varieties.length > 0
          ? b.varieties.map(v => v.name).join(', ')
          : defaultVariety;

        const lotArea = b.varieties && b.varieties.length > 0
          ? `${b.varieties.reduce((sum, v) => sum + (v.area || 0), 0)} ha`
          : (b.areaHectares ? `${b.areaHectares} ha` : '-');

        const lotPlants = b.varieties && b.varieties.length > 0
          ? b.varieties.reduce((sum, v) => sum + (v.plantCount || 0), 0).toLocaleString('es-AR')
          : (b.plantCount ? b.plantCount.toLocaleString('es-AR') : '-');

        return [
          b.id || b.name || b.batchNumber,
          lotVarieties,
          lotArea,
          lotPlants,
          b.bedCount ? String(b.bedCount) : '-',
          b.status === 'completed' ? 'Cerrado' : 'Activo'
        ];
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 3. COSECHAS
  if (harvests.length > 0) {
    drawSectionHeader('3. REGISTROS DE COSECHA', `Total histórico: ${totalKg.toLocaleString('es-AR')} kg en ${harvests.length} cargas registradas`);
    
    // Mostramos ordenadas por fecha descendente
    const sortedHarvests = [...harvests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 35);
    
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote(s)', 'Variedad', 'Kilos', 'Recolector', 'ID Trazabilidad']],
      body: sortedHarvests.map(h => {
        const lotes = h.batchNumber || '-';
        const variedad = (h as any).variety || resolveVarietiesForBatches(lotes, batches, defaultVariety);
        const recolector = h.collector?.name || (h as any).collectorName || '-';

        return [
          h.date ? format(new Date(h.date), 'dd/MM/yyyy') : '-',
          lotes,
          variedad,
          `${(h.kilograms || 0).toLocaleString('es-AR')} kg`,
          recolector,
          h.traceabilityId || '-'
        ];
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. BITÁCORA AGRONÓMICA (ING. AGRÓNOMO)
  if (agronomistLogs.length > 0) {
    drawSectionHeader('4. BITÁCORA AGRONÓMICA Y APLICACIONES (ING. AGRÓNOMO)');
    const sortedAgro = [...agronomistLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
    
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote(s)', 'Tratamiento', 'Producto', 'Dosis', 'Carencia', 'Observaciones']],
      body: sortedAgro.map(l => {
        const lotes = l.batchIds && l.batchIds.length > 0 ? l.batchIds.join(', ') : ((l as any).batchNumber || '-');
        const producto = l.product || (l.supplies && l.supplies.length > 0 ? l.supplies.map(s => `${s.name} (${s.quantity})`).join(', ') : '-');
        const dosis = l.dissolution || (l as any).dose || '-';

        return [
          l.date ? format(new Date(l.date), 'dd/MM/yyyy') : '-',
          lotes,
          l.type || (l as any).treatmentType || 'Fitosanitario',
          producto,
          dosis,
          `${l.phiDays ?? 0} días`,
          (l.notes || (l as any).observations || '-').substring(0, 60)
        ];
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. FENOLOGÍA Y MONITOREO SANITARIO
  if (phenologyLogs.length > 0) {
    drawSectionHeader('5. FENOLOGÍA Y EVOLUCIÓN DEL CULTIVO');
    const sortedPheno = [...phenologyLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);
    
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote(s)', 'Etapa Fenológica', 'Flores / Frutos', 'Observaciones']],
      body: sortedPheno.map(p => {
        const lotes = p.batchIds && p.batchIds.length > 0 ? p.batchIds.join(', ') : '-';
        const etapa = p.developmentState || (p as any).stage || 'Monitoreo';
        const floresFrutos = p.flowerCount != null || p.fruitCount != null 
          ? `${p.flowerCount ?? '-'} flores / ${p.fruitCount ?? '-'} frutos` 
          : '-';

        return [
          p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '-',
          lotes,
          etapa,
          floresFrutos,
          (p.notes || (p as any).observations || '-').substring(0, 75)
        ];
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. LABORES CULTURALES (RIEGO, PODAS, LIMPIEZA)
  if (culturalPracticeLogs.length > 0) {
    drawSectionHeader('6. LABORES CULTURALES Y MANTENIMIENTO');
    const sortedCult = [...culturalPracticeLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);
    
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Fecha', 'Lote(s)', 'Labor', 'Personal', 'Horas', 'Pago Total']],
      body: sortedCult.map(c => [
        c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-',
        c.batchIds && c.batchIds.length > 0 ? c.batchIds.join(', ') : '-',
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
      head: [['Insumo', 'Tipo', 'Stock', 'Principio Activo', 'Dosis Sugerida']],
      body: supplies.map(s => [
        s.name,
        s.type || 'Fitosanitario',
        String(s.stock != null ? s.stock : 0),
        s.info?.activeIngredient || '-',
        s.info?.dose || '-'
      ])
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 8. PERSONAL Y CUADRILLAS REGISTRADAS
  if (collectors.length > 0 || packers.length > 0) {
    drawSectionHeader('8. PERSONAL REGISTRADO (COSECHEROS Y EMBALADORES)');
    const allPersonal = [
      ...collectors.map(c => [
        'Recolector', 
        c.name, 
        `${(c.totalHarvested || 0).toLocaleString('es-AR')} kg`, 
        `${c.hoursWorked || 0} hs`, 
        `${c.productivity || 0} kg/h`,
        c.joinDate ? format(new Date(c.joinDate), 'dd/MM/yyyy') : '-'
      ]),
      ...packers.map(p => [
        'Embalador', 
        p.name, 
        `${(p.totalPackaged || 0).toLocaleString('es-AR')} kg`, 
        `${p.hoursWorked || 0} hs`, 
        `${p.packagingRate || 0} kg/h`,
        p.joinDate ? format(new Date(p.joinDate), 'dd/MM/yyyy') : '-'
      ])
    ];
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: emeraldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: textDark },
      head: [['Rol', 'Nombre y Apellido', 'Total Kg', 'Horas', 'Rendimiento', 'Fecha Alta']],
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
    doc.text('AgroVista \u2022 Sistema Integral para Productores de Frutilla \u2022 Coronda, Santa Fe', 14, pageHeight - 7);
    doc.text(`P\u00E1gina ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
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
