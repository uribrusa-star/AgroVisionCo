
'use client';

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from './transaction-form';
import { NotesForm } from './notes-form';
import { TransactionHistory } from './transaction-history';
import { NotesHistory } from './notes-history';
import { HarvestSummary } from './harvest-summary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Hand, TrendingDown, TrendingUp, Percent, Scale, Eye, EyeOff } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CostDistributionChart } from '../dashboard/cost-distribution-chart';
import { IncomeChart } from './income-chart';
import { MonthlyHarvestChart } from '../monthly-harvest-chart';
import { ProfitabilityTrendChart } from './profitability-trend-chart';
import { SmartHarvestAlerts } from './smart-harvest-alerts';
import { ExportButton } from './export-button';
import { WeatherCard } from '@/components/weather-card';


export default function ProducerLogPage() {
  const { loading, collectorPaymentLogs, packagingLogs, culturalPracticeLogs, transactions, harvests } = React.useContext(AppDataContext);
  const [showFinancials, setShowFinancials] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem('agrovision_showFinancials');
    if (saved !== null) {
      setShowFinancials(saved === 'true');
    }
  }, []);

  const toggleFinancials = () => {
    const newVal = !showFinancials;
    setShowFinancials(newVal);
    localStorage.setItem('agrovision_showFinancials', String(newVal));
  };
  
  const totalHarvestLaborCost = (collectorPaymentLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalPackagingLaborCost = (packagingLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalCulturalPracticeCost = (culturalPracticeLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalLaborCost = totalHarvestLaborCost + totalPackagingLaborCost + totalCulturalPracticeCost;

  const otherExpenses = (transactions || []).filter(t => t.type === 'Gasto').reduce((acc, t) => acc + t.amount, 0);
  const totalCost = totalLaborCost + otherExpenses;

  const totalIncome = (transactions || []).filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0);
  const grossMargin = totalIncome - totalCost;
  
  const roi = totalCost > 0 ? (grossMargin / totalCost) * 100 : 0;
  const totalKg = (harvests || []).reduce((acc, h) => acc + h.kilograms, 0);
  const costPerKg = totalKg > 0 ? totalCost / totalKg : 0;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <PageHeader
            title="Bitácora del Productor"
            description="Registre las finanzas y las observaciones diarias del establecimiento."
            className="mb-0"
        >
          <WeatherCard />
        </PageHeader>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleFinancials} title={showFinancials ? "Ocultar finanzas" : "Mostrar finanzas"}>
                {showFinancials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <ExportButton />
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Fila 1: Resumen Financiero Ampliado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg xl:text-base 2xl:text-lg font-bold truncate">{loading ? <Skeleton className="h-7 w-20" /> : (showFinancials ? `$${totalIncome.toLocaleString('es-AR')}` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Ventas registradas</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Costos</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg xl:text-base 2xl:text-lg font-bold truncate">{loading ? <Skeleton className="h-7 w-20" /> : (showFinancials ? `$${totalCost.toLocaleString('es-AR')}` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Operativos y Laborales</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margen Neto</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-lg xl:text-base 2xl:text-lg font-bold truncate ${showFinancials ? (grossMargin >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>{loading ? <Skeleton className="h-7 w-20" /> : (showFinancials ? `$${grossMargin.toLocaleString('es-AR')}` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Rentabilidad actual</p>
                </CardContent>
            </Card>
            <Card className="bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ROI</CardTitle>
                    <Percent className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className={`text-lg xl:text-base 2xl:text-lg font-bold truncate ${showFinancials ? (roi >= 0 ? 'text-primary' : 'text-red-600') : ''}`}>{loading ? <Skeleton className="h-7 w-12" /> : (showFinancials ? `${roi.toFixed(1)}%` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Retorno s/ Inversión</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Costo por Kg</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg xl:text-base 2xl:text-lg font-bold truncate">{loading ? <Skeleton className="h-7 w-16" /> : (showFinancials ? `$${costPerKg.toFixed(2)}` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Costo prom. producción</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mano de Obra</CardTitle>
                    <Hand className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg xl:text-base 2xl:text-lg font-bold truncate">{loading ? <Skeleton className="h-7 w-20" /> : (showFinancials ? `$${totalLaborCost.toLocaleString('es-AR')}` : '***')}</div>
                    <p className="text-[10px] text-muted-foreground">Carga laboral total</p>
                </CardContent>
            </Card>
        </div>

        {/* Fila 2: Tendencia de Rentabilidad (2 cols) + Distribución de Costos (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <ProfitabilityTrendChart />
            </div>
            <div className="lg:col-span-1">
                <CostDistributionChart />
            </div>
        </div>

        {/* Fila 3: Ingresos Mensuales (1 col) + Cosecha Mensual (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <IncomeChart transactions={transactions} />
            <MonthlyHarvestChart harvests={harvests} />
        </div>

        {/* Fila 4: Alertas Inteligentes */}
        <div className="w-full">
            <SmartHarvestAlerts />
        </div>

        {/* Fila 3: Historiales e Informe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TransactionHistory />
            <NotesHistory />
            <div className="lg:col-span-2">
                <HarvestSummary />
            </div>
        </div>
        
        {/* Fila 4: Formularios de Entrada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TransactionForm />
          <NotesForm />
        </div>

      </div>
    </>
  );
}
