'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Users, 
  MousePointerClick, 
  Smartphone, 
  Monitor, 
  Globe, 
  Search, 
  Share2, 
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

type DailyAnalyticsDoc = {
  id: string;
  date: string;
  totalViews?: number;
  totalClicks?: number;
  uniqueVisitorsCount?: number;
  referrers?: {
    direct?: number;
    google?: number;
    whatsapp?: number;
    social?: number;
    other?: number;
  };
  devices?: {
    mobile?: number;
    desktop?: number;
  };
  interactions?: Record<string, number>;
};

export function WebAnalyticsView() {
  const [analyticsData, setAnalyticsData] = useState<DailyAnalyticsDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to webAnalytics collection ordered by date
    const q = query(collection(db, 'webAnalytics'), orderBy('date', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: DailyAnalyticsDoc[] = [];
      snapshot.forEach(docSnap => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as DailyAnalyticsDoc);
      });
      setAnalyticsData(docs.reverse()); // Reverse for chronological chart display
      setLoading(false);
    }, (error) => {
      console.error("Error fetching web analytics:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute metrics
  const totalViews = analyticsData.reduce((acc, curr) => acc + (curr.totalViews || 0), 0);
  const totalUniques = analyticsData.reduce((acc, curr) => acc + (curr.uniqueVisitorsCount || 0), 0);
  const totalClicks = analyticsData.reduce((acc, curr) => acc + (curr.totalClicks || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDoc = analyticsData.find(d => d.date === todayStr);
  const todayViews = todayDoc?.totalViews || 0;
  const todayUniques = todayDoc?.uniqueVisitorsCount || 0;

  // Compute total referrers
  const referrerTotals = analyticsData.reduce((acc, curr) => {
    const refs = curr.referrers || {};
    acc.direct += refs.direct || 0;
    acc.google += refs.google || 0;
    acc.whatsapp += refs.whatsapp || 0;
    acc.social += refs.social || 0;
    acc.other += refs.other || 0;
    return acc;
  }, { direct: 0, google: 0, whatsapp: 0, social: 0, other: 0 });

  // Compute total devices
  const deviceTotals = analyticsData.reduce((acc, curr) => {
    const devs = curr.devices || {};
    acc.mobile += devs.mobile || 0;
    acc.desktop += devs.desktop || 0;
    return acc;
  }, { mobile: 0, desktop: 0 });

  const grandTotalDevices = (deviceTotals.mobile + deviceTotals.desktop) || 1;
  const mobilePct = Math.round((deviceTotals.mobile / grandTotalDevices) * 100);
  const desktopPct = Math.round((deviceTotals.desktop / grandTotalDevices) * 100);

  // Compute interaction breakdown
  const interactionTotals: Record<string, number> = {};
  analyticsData.forEach(d => {
    const inters = d.interactions || {};
    Object.entries(inters).forEach(([key, val]) => {
      interactionTotals[key] = (interactionTotals[key] || 0) + val;
    });
  });

  const chartData = analyticsData.map(d => {
    // Format YYYY-MM-DD to DD/MM
    const parts = d.date.split('-');
    const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
    return {
      date: dateFormatted,
      Visitas: d.totalViews || 0,
      Visitantes: d.uniqueVisitorsCount || 0,
      Clics: d.totalClicks || 0,
    };
  });

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Cargando métricas de tráfico web...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header & KPI Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Tráfico Web & Interacciones
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Monitoreo en tiempo real de visitas, fuentes y clics en la landing page de AgroVista.
          </p>
        </div>
        <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border-0 px-3 py-1 text-xs">
          🟢 Tracking Activo (Asíncrono)
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-emerald-600 dark:border-b-emerald-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px]">Visitas Totales</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mt-1">
              <Eye className="h-5 w-5 opacity-70 shrink-0" /> {totalViews.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-stone-400">Hoy: {todayViews} impresiones</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-blue-600 dark:border-b-blue-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px]">Visitantes Únicos</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 mt-1">
              <Users className="h-5 w-5 opacity-70 shrink-0" /> {totalUniques.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-stone-400">Hoy: {todayUniques} nuevos usuarios</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-purple-600 dark:border-b-purple-500">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px]">Interacciones Totales</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2 mt-1">
              <MousePointerClick className="h-5 w-5 opacity-70 shrink-0" /> {totalClicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-stone-400">Clics en botones clave</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-amber-500 dark:border-b-amber-400">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px]">Dispositivo Principal</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mt-1">
              {mobilePct >= desktopPct ? <Smartphone className="h-5 w-5 opacity-70 shrink-0" /> : <Monitor className="h-5 w-5 opacity-70 shrink-0" />} 
              {mobilePct}% Celular
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-stone-400">{desktopPct}% desde PC</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart: Traffic Evolution */}
      <Card className="border-0 shadow-sm bg-white dark:bg-stone-900 overflow-hidden">
        <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800 pb-4">
          <CardTitle className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Evolución Diaria de Visitas y Visitantes
          </CardTitle>
          <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
            Comparativa de impresiones brutas y personas únicas que navegaron por la landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm">
              Aún no hay datos de tráfico registrados. Los nuevos visitantes aparecerán aquí automáticamente.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorVisitantes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#888' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#888' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '12px', 
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }} 
                  />
                  <Area type="monotone" dataKey="Visitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitas)" />
                  <Area type="monotone" dataKey="Visitantes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitantes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Sources & Interactions Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Orígenes / Fuentes */}
        <Card className="border-0 shadow-sm bg-white dark:bg-stone-900 overflow-hidden">
          <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
            <CardTitle className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-500" />
              Origen de Tráfico (Fuentes)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                🌐 Tráfico Directo (agrovista.co)
              </span>
              <Badge variant="outline" className="font-bold">{referrerTotals.direct}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                🔍 Búsqueda en Google
              </span>
              <Badge variant="outline" className="font-bold">{referrerTotals.google}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                💬 WhatsApp
              </span>
              <Badge variant="outline" className="font-bold">{referrerTotals.whatsapp}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                📱 Redes Sociales (FB / IG)
              </span>
              <Badge variant="outline" className="font-bold">{referrerTotals.social}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Clics & Botones más interactuados */}
        <Card className="border-0 shadow-sm bg-white dark:bg-stone-900 overflow-hidden">
          <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
            <CardTitle className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-purple-500" />
              Botones & Elementos Más Interactuados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {Object.keys(interactionTotals).length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">No se han registrado clics de botones aún.</p>
            ) : (
              Object.entries(interactionTotals).map(([targetName, count]) => (
                <div key={targetName} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-purple-600" />
                    {targetName.replaceAll('_', ' ')}
                  </span>
                  <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border-0">
                    {count} clics
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
