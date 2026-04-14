
import { Transaction, CollectorPaymentLog, PackagingLog, CulturalPracticeLog } from './types';

export const exportTransactionsToCSV = (
    transactions: Transaction[],
    collectorPayments: CollectorPaymentLog[],
    packagingLogs: PackagingLog[],
    culturalPracticeLogs: CulturalPracticeLog[]
) => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Cantidad', 'Unidad', 'Precio Unitario', 'Total (ARS)'];
    
    const rows: string[][] = [];

    // Add Transactions
    transactions.forEach(t => {
        rows.push([
            new Date(t.date).toLocaleDateString('es-AR'),
            t.type,
            t.category,
            t.description,
            t.quantity?.toString() || '',
            t.unit || '',
            t.pricePerUnit?.toString() || '',
            t.amount.toFixed(2)
        ]);
    });

    // Add Collector Payments
    collectorPayments.forEach(p => {
        rows.push([
            new Date(p.date).toLocaleDateString('es-AR'),
            'Gasto',
            'Cosecha',
            `Pago a recolector: ${p.collectorName} (${p.traceabilityId})`,
            p.kilograms.toString(),
            'kg',
            p.ratePerKg.toString(),
            p.payment.toFixed(2)
        ]);
    });

    // Add Packaging Logs
    packagingLogs.forEach(p => {
        rows.push([
            new Date(p.date).toLocaleDateString('es-AR'),
            'Gasto',
            'Embalaje',
            `Pago a embalador: ${p.packerName}`,
            p.kilogramsPackaged.toString(),
            'kg',
            (p.payment / p.kilogramsPackaged).toFixed(2),
            p.payment.toFixed(2)
        ]);
    });

    // Add Cultural Practice Logs
    culturalPracticeLogs.forEach(p => {
        rows.push([
            new Date(p.date).toLocaleDateString('es-AR'),
            'Gasto',
            'Mano de Obra',
            `${p.practiceType}: ${p.personnelName}`,
            p.hoursWorked.toString(),
            'hs',
            p.costPerHour.toString(),
            p.payment.toFixed(2)
        ]);
    });

    // Sort by date (descending)
    rows.sort((a,b) => {
        const dateA = new Date(a[0].split('/').reverse().join('-')).getTime();
        const dateB = new Date(b[0].split('/').reverse().join('-')).getTime();
        return dateB - dateA;
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `AgroVision_Contable_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
