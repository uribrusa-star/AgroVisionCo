import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AttendanceLog } from './types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export async function exportAttendanceToExcel(
  logs: AttendanceLog[],
  periodTitle: string = 'Historial',
  establishmentName: string = 'AgroVista'
) {
  if (!logs || logs.length === 0) return;
  const XLSX = await import('xlsx');

  const dataRows = logs.map((log) => {
    let dayName = '-';
    try {
      if (log.date) {
        dayName = format(new Date(`${log.date}T12:00:00`), 'EEEE', { locale: es });
        dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      }
    } catch {
      dayName = '-';
    }

    let checkInTime = '--:--';
    if (log.checkIn) {
      try {
        checkInTime = format(new Date(log.checkIn), 'HH:mm');
      } catch {
        checkInTime = '--:--';
      }
    }

    let checkOutTime = '--:--';
    if (log.checkOut) {
      try {
        checkOutTime = format(new Date(log.checkOut), 'HH:mm');
      } catch {
        checkOutTime = '--:--';
      }
    } else if (log.status === 'in_progress') {
      checkOutTime = 'En curso';
    }

    const hours = (log as any).hoursWorked ?? log.totalHoursWorked ?? 0;

    return {
      'Fecha': log.date || '-',
      'Día': dayName,
      'Colaborador': log.personnelName || '-',
      'Rol / Puesto': (log as any).personnelRole || log.role || 'Personal',
      'DNI': log.dni || '-',
      'Ingreso (hs)': checkInTime,
      'Egreso (hs)': checkOutTime,
      'Horas Trabajadas': hours,
      'Estado': log.status === 'in_progress' ? 'Presente' : 'Salida Registrada',
      'Método': log.method === 'scan_gate' ? 'Escáner QR Asistencia' : log.method === 'self_check_in' ? 'Credencial Digital' : 'Manual',
      'Registrado Por': log.registeredBy?.name || 'Control de Asistencia',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataRows);

  // Ancho estimado de columnas
  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 12 }, // Día
    { wch: 24 }, // Colaborador
    { wch: 18 }, // Rol
    { wch: 12 }, // DNI
    { wch: 12 }, // Ingreso
    { wch: 12 }, // Egreso
    { wch: 16 }, // Horas
    { wch: 18 }, // Estado
    { wch: 22 }, // Método
    { wch: 22 }, // Registrado Por
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

  const safePeriod = sanitizeFilename(periodTitle);
  const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
  const filename = `Planilla_Asistencias_${safePeriod}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export async function exportAttendanceToPDF(
  logs: AttendanceLog[],
  periodTitle: string = 'Historial',
  establishmentName: string = 'AgroVista'
) {
  if (!logs || logs.length === 0) return;

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Métricas para el resumen
  const uniqueCollaborators = new Set(logs.map((l) => l.personnelName.trim().toLowerCase())).size;
  const totalHours = logs.reduce((sum, l) => sum + ((l as any).hoursWorked ?? l.totalHoursWorked ?? 0), 0);
  const totalCompleted = logs.filter((l) => l.status === 'completed').length;
  const totalInProgress = logs.filter((l) => l.status === 'in_progress').length;

  // Franja superior verde
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Título blanco
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AGROVISTA - PLANILLA DE CONTROL DE ASISTENCIA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Establecimiento: ${establishmentName}`, 14, 18);
  doc.text(`Período: ${periodTitle} | Emisión: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} hs`, pageWidth - 14, 18, { align: 'right' });

  // Cuadro de Resumen Ejecutivo
  doc.setFillColor(245, 245, 244); // stone-100
  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(14, 26, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Métricas del Período:', 18, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Colaboradores Distintos: ${uniqueCollaborators}  |  Jornadas Totales: ${logs.length}  |  Turnos Completados: ${totalCompleted}  |  En curso: ${totalInProgress}  |  Horas Totales Acumuladas: ${Math.round(totalHours * 10) / 10} hs`,
    18,
    37
  );

  // Filas para la tabla
  const tableRows = logs.map((log) => {
    let dayName = '-';
    try {
      if (log.date) {
        dayName = format(new Date(`${log.date}T12:00:00`), 'EEE', { locale: es });
      }
    } catch {
      dayName = '-';
    }

    let inTime = '--:--';
    if (log.checkIn) {
      try {
        inTime = format(new Date(log.checkIn), 'HH:mm');
      } catch {
        inTime = '--:--';
      }
    }

    let outTime = '--:--';
    if (log.checkOut) {
      try {
        outTime = format(new Date(log.checkOut), 'HH:mm');
      } catch {
        outTime = '--:--';
      }
    } else if (log.status === 'in_progress') {
      outTime = 'En curso';
    }

    const hours = (log as any).hoursWorked ?? log.totalHoursWorked ?? 0;

    return [
      log.date || '-',
      dayName.toUpperCase(),
      log.personnelName || '-',
      (log as any).personnelRole || log.role || 'Personal',
      log.dni || '-',
      inTime,
      outTime,
      `${hours} hs`,
      log.status === 'in_progress' ? 'Presente' : 'Salida',
      log.method === 'scan_gate' ? 'QR Asistencia' : 'Manual',
    ];
  });

  autoTable(doc, {
    startY: 44,
    head: [['Fecha', 'Día', 'Colaborador', 'Rol / Puesto', 'DNI', 'Ingreso', 'Egreso', 'Horas', 'Estado', 'Método']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Fecha
      1: { cellWidth: 14, halign: 'center' }, // Día
      2: { cellWidth: 50 }, // Colaborador
      3: { cellWidth: 35 }, // Rol
      4: { cellWidth: 24 }, // DNI
      5: { cellWidth: 18, halign: 'center' }, // Ingreso
      6: { cellWidth: 18, halign: 'center' }, // Egreso
      7: { cellWidth: 18, halign: 'center' }, // Horas
      8: { cellWidth: 22, halign: 'center' }, // Estado
      9: { cellWidth: 26, halign: 'center' }, // Método
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 14 },
    didDrawPage: (data) => {
      // Pie de página
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `AgroVista Software Agrícola | Página ${pageNumber} de ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
    },
  });

  const safePeriod = sanitizeFilename(periodTitle);
  const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
  doc.save(`Reporte_Asistencias_${safePeriod}_${dateStr}.pdf`);
}
