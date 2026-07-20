
import { Transaction, CollectorPaymentLog, PackagingLog, CulturalPracticeLog } from './types';
import * as XLSX from 'xlsx';

export const exportTransactionsToExcel = (
    transactions: Transaction[],
    collectorPayments: CollectorPaymentLog[],
    packagingLogs: PackagingLog[],
    culturalPracticeLogs: CulturalPracticeLog[]
) => {
    const rows: any[] = [];

    // Add Transactions
    transactions.forEach(t => {
        rows.push({
            Fecha: new Date(t.date).toLocaleDateString('es-AR'),
            Tipo: t.type,
            Categoría: t.category,
            Descripción: t.description,
            Cantidad: t.quantity || null,
            Unidad: t.unit || '',
            'Precio Unitario': t.pricePerUnit || null,
            'Total (ARS)': t.amount
        });
    });

    // Add Collector Payments
    collectorPayments.forEach(p => {
        rows.push({
            Fecha: new Date(p.date).toLocaleDateString('es-AR'),
            Tipo: 'Gasto',
            Categoría: 'Cosecha',
            Descripción: `Pago a recolector: ${p.collectorName} (${p.traceabilityId})`,
            Cantidad: p.kilograms,
            Unidad: 'kg',
            'Precio Unitario': p.ratePerKg,
            'Total (ARS)': p.payment
        });
    });

    // Add Packaging Logs
    packagingLogs.forEach(p => {
        rows.push({
            Fecha: new Date(p.date).toLocaleDateString('es-AR'),
            Tipo: 'Gasto',
            Categoría: 'Embalaje',
            Descripción: `Pago a embalador: ${p.packerName}`,
            Cantidad: p.kilogramsPackaged,
            Unidad: 'kg',
            'Precio Unitario': Number((p.payment / p.kilogramsPackaged).toFixed(2)),
            'Total (ARS)': p.payment
        });
    });

    // Add Cultural Practice Logs
    culturalPracticeLogs.forEach(p => {
        rows.push({
            Fecha: new Date(p.date).toLocaleDateString('es-AR'),
            Tipo: 'Gasto',
            Categoría: 'Mano de Obra',
            Descripción: `${p.practiceType}: ${p.personnelName}`,
            Cantidad: p.hoursWorked,
            Unidad: 'hs',
            'Precio Unitario': p.costPerHour,
            'Total (ARS)': p.payment
        });
    });

    // Sort by date (descending)
    rows.sort((a,b) => {
        const dateA = new Date(a.Fecha.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.Fecha.split('/').reverse().join('-')).getTime();
        return dateB - dateA;
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contabilidad");

    // Adjust column widths automatically
    const wscols = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Tipo
        { wch: 15 }, // Categoría
        { wch: 45 }, // Descripción
        { wch: 10 }, // Cantidad
        { wch: 10 }, // Unidad
        { wch: 15 }, // Precio Unitario
        { wch: 15 }  // Total (ARS)
    ];
    worksheet['!cols'] = wscols;

    // Generate Excel file
    XLSX.writeFile(workbook, `AgroVista_Contable_${new Date().toISOString().split('T')[0]}.xlsx`);
};
