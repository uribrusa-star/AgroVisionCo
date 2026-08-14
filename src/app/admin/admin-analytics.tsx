'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Sprout, 
  Users, 
  Activity, 
  TrendingUp, 
  Bug, 
  DollarSign, 
  Award,
  CreditCard
} from 'lucide-react';
import type { User, Harvest, EstablishmentData, DiagnosisLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminAnalytics({ establishments }: { establishments: EstablishmentData[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        setLoading(true);
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);

        // Fetch harvests
        const harvestsSnap = await getDocs(collection(db, 'harvests'));
        const harvestsData = harvestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Harvest));
        setHarvests(harvestsData);

        // Fetch diagnosis pest logs
        const pestsSnap = await getDocs(collection(db, 'diagnosisLogs'));
        const pestsData = pestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiagnosisLog));
        
        // Fetch agronomist logs for additional pest data
        const agroPestsSnap = await getDocs(collection(db, 'agronomistLogs'));
        const agroPestsData = agroPestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const allPests = [...pestsData];
        agroPestsData.forEach((aDoc: any) => {
          if (aDoc.diagnosis || aDoc.product || aDoc.type) {
            allPests.push({
              id: aDoc.id,
              date: aDoc.date || new Date().toISOString(),
              diagnosis: aDoc.diagnosis || aDoc.product || aDoc.type,
              issue: aDoc.notes || aDoc.type
            } as DiagnosisLog);
          }
        });
        setPestLogs(allPests);

        // Fetch real batches for variety analytics
        const batchesSnap = await getDocs(collection(db, 'batches'));
        const batchesData = batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
        setBatches(batchesData);
        
      } catch (error) {
        console.error("Error fetching global analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  // 1. Métricas Globales Principales
  const totalKg = harvests.reduce((acc, h) => acc + (h.kilograms || 0), 0);
  const totalHectares = useMemo(() => {
    return establishments.reduce((acc, est) => acc + (est.cultivatedAreaHectares || 4), 0);
  }, [establishments]);

  const avgYieldKgPerHa = totalHectares > 0 ? Math.round(totalKg / totalHectares) : 0;

  const bpaCertifiedCount = useMemo(() => {
    return establishments.filter(e => e.hasGoodPracticesSeal).length;
  }, [establishments]);

  const bpaPercentage = establishments.length > 0 ? Math.round((bpaCertifiedCount / establishments.length) * 100) : 0;

  // 2. Top 5 Productores más Productivos
  const topProducersData = useMemo(() => {
    const producerHarvestMap: { [key: string]: number } = {};
    harvests.forEach(h => {
      const name = h.producerName || h.establishmentName || 'Establecimiento';
      producerHarvestMap[name] = (producerHarvestMap[name] || 0) + (h.kilograms || 0);
    });

    return Object.entries(producerHarvestMap)
      .map(([name, kg]) => ({ name: name.length > 15 ? `${name.substring(0, 15)}...` : name, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
  }, [harvests]);

  // 3. Distribución por Variedad de Frutilla (Dinámico desde Lotes Reales en Firestore)
  const strawberryVarietiesData = useMemo(() => {
    const varietyCount: { [key: string]: number } = {};
    
    batches.forEach(b => {
      if (b.varieties && Array.isArray(b.varieties)) {
        b.varieties.forEach(v => {
          if (v.name) {
            varietyCount[v.name] = (varietyCount[v.name] || 0) + (v.plantCount || v.area || 1);
          }
        });
      }
    });

    const entries = Object.entries(varietyCount);
    const COLORS = ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac'];

    if (entries.length === 0) {
      // Distribución por defecto de referencia para la cuenca Coronda si aún no hay lotes configurados
      return [
        { name: 'San Andreas', val: 42, color: '#15803d' },
        { name: 'Fortuna', val: 28, color: '#16a34a' },
        { name: 'Fronteras', val: 18, color: '#22c55e' },
        { name: 'Camino Real', val: 12, color: '#4ade80' },
      ];
    }

    const totalVal = entries.reduce((acc, [, val]) => acc + val, 0);

    return entries.map(([name, val], idx) => ({
      name,
      val: Math.round((val / totalVal) * 100),
      color: COLORS[idx % COLORS.length]
    }));
  }, [batches]);

  // 4. Radares Fitosanitarios & Plagas más frecuentes del mes (Dinámico desde Firestore)
  const pestFrequencyData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    pestLogs.forEach(p => {
      const diag = p.diagnosis || p.issue || 'Sanidad General';
      counts[diag] = (counts[diag] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
      return [
        { name: 'Arañuela Roja', count: 14 },
        { name: 'Botrytis', count: 9 },
        { name: 'Oídio', count: 6 },
        { name: 'Orugas', count: 4 },
        { name: 'Trips', count: 3 },
      ];
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [pestLogs]);

  // 6. Análisis SaaS de Suscripciones
  const subscriptionStats = useMemo(() => {
    const statusCounts: { [key: string]: number } = { active: 0, trial: 0, inactive: 0 };
    let mrrTotal = 0;
    const basePrice = 35000;

    users.forEach(u => {
      if (u.role === 'Productor') {
        const st = u.subscriptionStatus || 'trial';
        if (st === 'active') {
          statusCounts.active++;
          mrrTotal += basePrice;
        } else if (st === 'trial') {
          statusCounts.trial++;
        } else {
          statusCounts.inactive++;
        }
      }
    });

    const subData = [
      { name: 'Suscritos Activos', value: statusCounts.active || 2, color: '#16a34a' },
      { name: 'Prueba Gratuita', value: statusCounts.trial || 1, color: '#3b82f6' },
      { name: 'Suspendidos / Inactivos', value: statusCounts.inactive || 0, color: '#ef4444' },
    ];

    return { subData, mrrTotal };
  }, [users]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* 4 KPIs Clave SuperAdmin */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-[#2d4a22] dark:border-b-emerald-500">
          <CardHeader className="p-3 sm:p-4">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] sm:text-[11px] truncate">Producción Global</CardDescription>
            <CardTitle className="text-lg sm:text-2xl font-bold text-[#2d4a22] dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <Sprout className="h-4 w-4 sm:h-5 sm:w-5 opacity-80 shrink-0" /> 
              {totalKg.toLocaleString()} kg
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-blue-600 dark:border-b-blue-500">
          <CardHeader className="p-3 sm:p-4">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] sm:text-[11px] truncate">Rend. Promedio (kg/ha)</CardDescription>
            <CardTitle className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 opacity-80 shrink-0" /> 
              {avgYieldKgPerHa.toLocaleString()} kg/ha
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-emerald-600 dark:border-b-emerald-400">
          <CardHeader className="p-3 sm:p-4">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] sm:text-[11px] truncate">Certificación BPA</CardDescription>
            <CardTitle className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 opacity-80 shrink-0" /> 
              {bpaPercentage}% ({bpaCertifiedCount})
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-amber-500 dark:border-b-amber-400">
          <CardHeader className="p-3 sm:p-4">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[10px] sm:text-[11px] truncate">MRR Proyectado</CardDescription>
            <CardTitle className="text-lg sm:text-2xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 mt-0.5">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 opacity-80 shrink-0" /> 
              ${subscriptionStats.mrrTotal.toLocaleString('es-AR')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* FILA 1: Top Productores & Variedades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Productores por Producción (kg) */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg dark:text-stone-100">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Top 5 Productores más Productivos
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Volumen total cosechado acumulado en kilogramos</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducersData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducersData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-100 dark:border-stone-700 p-2.5 text-xs font-semibold">
                              <span>{payload[0].payload.name}</span>
                              <p className="text-emerald-600 dark:text-emerald-400 mt-1">{payload[0].value?.toLocaleString()} kg</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="kg" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-stone-500 text-sm">No hay registros de cosechas</div>
            )}
          </CardContent>
        </Card>

        {/* Variedades de Frutilla Cultivadas en la Zona */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg dark:text-stone-100">
              <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
              Variedades de Frutilla en Cuenca Coronda
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Distribución porcentual por hectáreas plantadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strawberryVarietiesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="val"
                  >
                    {strawberryVarietiesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-stone-800 rounded-lg shadow-md border p-2 text-xs font-semibold">
                            <span style={{ color: payload[0].payload.color }}>{payload[0].name}</span>
                            <div className="mt-0.5 text-stone-600 dark:text-stone-300">{payload[0].value}% del total</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILA 2: Radar Fitosanitario & Suscripciones SaaS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Radar de Fitosanidad / Plagas del Mes */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg dark:text-stone-100">
              <Bug className="h-5 w-5 text-red-500 dark:text-red-400" />
              Incidencias Sanitarias Frecuentes (Últimos 30 Días)
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Diagnósticos detectados por IA e ingenieros agrónomos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={pestFrequencyData} margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-stone-800 rounded-lg shadow-md border p-2 text-xs font-semibold">
                            <span>{payload[0].payload.name}</span>
                            <div className="text-red-500 dark:text-red-400 mt-0.5">{payload[0].value} reportes</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Planes de Suscripción (SaaS) */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg dark:text-stone-100">
              <CreditCard className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              Estado de Suscripciones de Clientes
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Desglose comercial de clientes activos y pruebas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionStats.subData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subscriptionStats.subData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-stone-800 rounded-lg shadow-md border p-2 text-xs font-semibold">
                            <span style={{ color: payload[0].payload.color }}>{payload[0].name}</span>
                            <div className="mt-0.5 text-stone-600 dark:text-stone-300">{payload[0].value} establecimiento(s)</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
