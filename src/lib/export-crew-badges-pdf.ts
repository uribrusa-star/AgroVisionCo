import jsPDF from 'jspdf';
import type { Collector, Packer } from './types';

interface GenerateCrewBadgesOptions {
  workers: (Collector | Packer)[];
  type: 'collector' | 'packer';
  establishmentName?: string;
}

/**
 * Genera un PDF tamaño A4 con planillas de credenciales individuales listas para imprimir y recortar.
 * Distribuye 8 credenciales por página (2 columnas x 4 filas).
 */
export async function generateCrewBadgesPDF({
  workers,
  type,
  establishmentName = 'AgroVista'
}: GenerateCrewBadgesOptions) {
  if (!workers || workers.length === 0) return;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;

  // Parámetros de la grilla de credenciales (8 credenciales por hoja)
  const cols = 2;
  const rows = 4;
  const cardWidth = 90;
  const cardHeight = 62;
  const marginLeft = 11;
  const marginTop = 18;
  const gapX = 8;
  const gapY = 6;

  const isCollector = type === 'collector';
  const roleTitle = isCollector ? 'RECOLECTOR DE FRUTILLA' : 'EMBALADOR DE FRUTA';

  // Cargar una librería ligera o generar DataURL para el QR
  // Usamos la API de qrcode de Google Charts o un Canvas para tener el QR puro como PNG en jsPDF
  const getQrDataUrl = async (payload: string): Promise<string> => {
    try {
      // Usamos quickchart.io o chart.googleapis para obtener el QR en imagen pura sin dependencias complejas
      const encoded = encodeURIComponent(payload);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&margin=4`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch QR');
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  let pageIndex = 0;

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    const indexInPage = i % (cols * rows);

    // Si llenamos la hoja y hay más trabajadores, agregamos página nueva
    if (i > 0 && indexInPage === 0) {
      doc.addPage();
      pageIndex++;
    }

    const colIndex = indexInPage % cols;
    const rowIndex = Math.floor(indexInPage / cols);

    const x = marginLeft + colIndex * (cardWidth + gapX);
    const y = marginTop + rowIndex * (cardHeight + gapY);

    // 1. Recuadro exterior con línea punteada para recortar
    doc.setDrawColor(5, 150, 105); // Verde esmeralda
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(x, y, cardWidth, cardHeight, 'S');
    doc.setLineDashPattern([], 0); // Restaurar línea continua

    // 2. Encabezado de la credencial (barra verde superior)
    doc.setFillColor(6, 78, 59); // Verde oscuro #064E3B
    doc.rect(x, y, cardWidth, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('AGROVISTA', x + 4, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(establishmentName.substring(0, 22), x + cardWidth - 4, y + 6.5, { align: 'right' });

    // 3. Sub-barra con rol del trabajador
    doc.setFillColor(240, 253, 244); // Fondo verde muy suave
    doc.rect(x, y + 10, cardWidth, 6, 'F');
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(roleTitle, x + cardWidth / 2, y + 14, { align: 'center' });

    // 4. Datos del trabajador (a la izquierda)
    doc.setTextColor(15, 23, 42); // Gris oscuro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    
    // Si el nombre es muy largo, recortar
    const displayName = worker.name.length > 20 ? worker.name.substring(0, 19) + '...' : worker.name;
    doc.text(displayName, x + 4, y + 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);

    doc.text(`DNI: ${worker.dni || 'No registrado'}`, x + 4, y + 29);
    doc.text(`Tel: ${worker.phone || 'No registrado'}`, x + 4, y + 34);

    if (worker.emergencyContactPhone) {
      doc.setTextColor(185, 28, 28); // Rojo alerta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`Emergencia: ${worker.emergencyContactPhone}`, x + 4, y + 40);
    }

    // 5. Código QR (a la derecha)
    const qrPayload = JSON.stringify({
      agroVistaWorker: true,
      type,
      id: worker.id,
      name: worker.name
    });

    const qrSize = 28;
    const qrX = x + cardWidth - qrSize - 4;
    const qrY = y + 18;

    try {
      const qrDataUrl = await getQrDataUrl(qrPayload);
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } else {
        doc.setDrawColor(203, 213, 225);
        doc.rect(qrX, qrY, qrSize, qrSize, 'S');
        doc.setFontSize(6);
        doc.text('QR CODE', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
      }
    } catch {
      doc.setDrawColor(203, 213, 225);
      doc.rect(qrX, qrY, qrSize, qrSize, 'S');
    }

    // 6. Pie de credencial
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Credencial Oficial de Cosecha &bull; Escanear en balanza', x + 4, y + cardHeight - 3);
  }

  // Título superior general de la hoja para corte
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`AgroVista - Credenciales de Cuadrilla (${roleTitle}) | ${establishmentName} | Página ${p} de ${totalPages}`, marginLeft, 10);
    doc.text('Recorte por la línea punteada para plastificar', pageWidth - marginLeft, 10, { align: 'right' });
  }

  const filename = `AgroVista_Credenciales_${isCollector ? 'Recolectores' : 'Embaladores'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
