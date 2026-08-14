'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sprout, Users, Building, Activity } from 'lucide-react';
import type { User, Harvest, EstablishmentData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminAnalytics({ establishments }: { establishments: EstablishmentData[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        setLoading(true);
        // Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);

        // Fetch all harvests
        const harvestsSnap = await getDocs(collection(db, 'harvests'));
        const harvestsData = harvestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Harvest));
        setHarvests(harvestsData);
        
      } catch (error) {
        console.error("Error fetching global analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  const totalKg = harvests.reduce((acc, h) => acc + (h.kilograms || 0), 0);
  
  // Calculate User Growth
  const userGrowthData = useMemo(() => {
    const monthlyCount: { [key: string]: number } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    users.forEach(u => {
      // Fallback if createdAt doesn't exist, use current month for mock users
      const dateStr = (u as any).createdAt || new Date().toISOString();
      const date = new Date(dateStr);
      const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
      
      if (!monthlyCount[monthKey]) monthlyCount[monthKey] = 0;
      monthlyCount[monthKey]++;
    });

    return Object.entries(monthlyCount).map(([month, count]) => ({
      month,
      count
    }));
  }, [users]);

  // Calculate Role Distribution
  const roleDistributionData = useMemo(() => {
    const roles: { [key: string]: number } = {};
    users.forEach(u => {
      const role = u.role || 'Desconocido';
      if (!roles[role]) roles[role] = 0;
      roles[role]++;
    });

    const COLORS = ['#2d4a22', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

    return Object.entries(roles).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }, [users]);

  const userGrowthConfig = {
    count: { label: "Nuevos Usuarios", color: "hsl(var(--primary))" },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-[#2d4a22] dark:border-b-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-xs">Producción Global Total</CardDescription>
            <CardTitle className="text-3xl font-bold text-[#2d4a22] dark:text-emerald-400 flex items-center gap-2">
              <Sprout className="h-6 w-6 opacity-70" /> 
              {totalKg.toLocaleString()} kg
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-blue-600 dark:border-b-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-xs">Usuarios Registrados</CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Users className="h-6 w-6 opacity-70" /> 
              {users.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-amber-500 dark:border-b-amber-400">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-xs">Establecimientos Activos</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-2">
              <Building className="h-6 w-6 opacity-70" /> 
              {establishments.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User Growth Chart */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-stone-100">
              <Activity className="h-5 w-5 text-stone-500 dark:text-stone-400" />
              Crecimiento de Usuarios
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Altas de usuarios por mes histórico</CardDescription>
          </CardHeader>
          <CardContent>
            {userGrowthData.length > 0 ? (
              <ChartContainer config={userGrowthConfig} className="h-[300px] w-full">
                <BarChart data={userGrowthData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm">
                No hay datos suficientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Distribution Chart */}
        <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-stone-100">
              <Users className="h-5 w-5 text-stone-500 dark:text-stone-400" />
              Distribución de Roles
            </CardTitle>
            <CardDescription className="dark:text-stone-400">Proporción de tipos de usuarios en la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {roleDistributionData.length > 0 ? (
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {roleDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-100 dark:border-stone-700 p-3 text-sm">
                              <span className="font-semibold" style={{color: payload[0].payload.color}}>
                                {payload[0].name}
                              </span>
                              <div className="mt-1 text-stone-600 dark:text-stone-300">
                                {payload[0].value} {(payload[0].value as number) === 1 ? 'usuario' : 'usuarios'}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm">
                No hay datos suficientes
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
