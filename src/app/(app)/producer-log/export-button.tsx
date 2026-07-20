
'use client';

import React, { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { exportTransactionsToExcel } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

export function ExportButton() {
    const { transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs, loading } = useContext(AppDataContext);
    const { toast } = useToast();

    const handleExport = () => {
        try {
            if (transactions.length === 0 && collectorPaymentLogs.length === 0 && packagingLogs.length === 0 && culturalPracticeLogs.length === 0) {
                toast({
                    title: "No hay datos",
                    description: "No se encontraron registros para exportar.",
                    variant: "destructive"
                });
                return;
            }

            exportTransactionsToExcel(transactions, collectorPaymentLogs, packagingLogs, culturalPracticeLogs);
            
            toast({
                title: "Exportación exitosa",
                description: "Se ha generado el archivo Excel con los datos contables.",
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Error al exportar",
                description: "No se pudo generar el archivo de exportación.",
                variant: "destructive"
            });
        }
    };

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={loading}
            className="flex items-center gap-2"
        >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Datos Contables</span>
            <span className="sm:hidden">Exportar</span>
        </Button>
    );
}
