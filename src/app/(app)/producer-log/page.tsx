
'use client';

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from './transaction-form';
import { NotesForm } from './notes-form';
import { TransactionHistory } from './transaction-history';
import { NotesHistory } from './notes-history';
import { HarvestSummary } from './harvest-summary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Hand, TrendingDown, TrendingUp } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Skeleton } from '@/components/ui/skeleton';
import { CostDistributionChart } from '../dashboard/cost-distribution-chart';
import { IncomeChart } from './income-chart';
import { MonthlyHarvestChart } from '../monthly-harvest-chart';


export default function ProducerLogPage() {
  const { loading, collectorPaymentLogs, packagingLogs, culturalPracticeLogs, transactions, harvests } = React.useContext(AppDataContext);
  
  const totalHarvestLaborCost = (collectorPaymentLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalPackagingLaborCost = (packagingLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalCulturalPracticeCost = (culturalPracticeLogs || []).reduce((acc, p) => acc + p.payment, 0);
  const totalLaborCost = totalHarvestLaborCost + totalPackagingLaborCost + totalCulturalPracticeCost;

  const otherExpenses = (transactions || []).filter(t => t.type === 'Gasto').reduce((acc, t) => acc + t.amount, 0);
  const totalCost = totalLaborCost + otherExpenses;

  const totalIncome = (transactions || []).filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0);
  const grossMargin = totalIncome - totalCost;
  
  return (
    <>
      <PageHeader
        title="Bitácora del Productor"
        description="Registre las finanzas y las observaciones diarias del establecimiento."
      />
      <div className="space-y-8">
        
        {/* Fila 1: Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Ingresos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24" /> : `$${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</div>
                <p className="text-xs text-muted-foreground">Ventas y otros ingresos</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Costos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24" /> : `$${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</div>
                <p className="text-xs text-muted-foreground">Mano de obra, insumos, etc.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen Bruto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className={`text-2xl font-bold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{loading ? <Skeleton className="h-8 w-24" /> : `$${grossMargin.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</div>
                <p className="text-xs text-muted-foreground">Ingresos menos costos</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costo Total de Mano de Obra</CardTitle>
                <Hand className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24" /> : `$${totalLaborCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</div>
                <p className="text-xs text-muted-foreground">Cosecha + Embalaje + Labores</p>
                </CardContent>
            </Card>
        </div>

        {/* Fila 2: Gráficos Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <MonthlyHarvestChart harvests={harvests} />
            <IncomeChart transactions={transactions} />
            <CostDistributionChart />
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
