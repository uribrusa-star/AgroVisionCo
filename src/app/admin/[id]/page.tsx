'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Tractor, Sprout, Building, ShieldCheck, MapPin, Pickaxe, Package, Activity, Clock, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { EstablishmentData, User, Collector, Packer, Harvest } from '@/lib/types';
import { AppDataContext } from '@/context/app-data-context.tsx';

export default function AdminEstablishmentDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { currentUser } = useContext(AppDataContext);

  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [packers, setPackers] = useState<Packer[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'SuperAdmin' || !id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Establishment Info
        const estDoc = await getDoc(doc(db, 'establishment', id));
        if (estDoc.exists()) {
          setEstablishment({ id: estDoc.id, ...estDoc.data() } as EstablishmentData);
        }

        // 2. Fetch Users (Producers, Agronomists linked to this est)
        const qUsers = query(collection(db, 'users'), where('establishmentId', '==', id));
        const usersSnap = await getDocs(qUsers);
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));

        // 3. Fetch Collectors
        const qCol = query(collection(db, 'collectors'), where('establishmentId', '==', id));
        const colSnap = await getDocs(qCol);
        setCollectors(colSnap.docs.map(d => ({ id: d.id, ...d.data() } as Collector)));

        // 4. Fetch Packers
        const qPack = query(collection(db, 'packers'), where('establishmentId', '==', id));
        const packSnap = await getDocs(qPack);
        setPackers(packSnap.docs.map(d => ({ id: d.id, ...d.data() } as Packer)));

        // 5. Fetch Harvests
        const qHarv = query(collection(db, 'harvests'), where('establishmentId', '==', id), orderBy('date', 'desc'));
        const harvSnap = await getDocs(qHarv);
        setHarvests(harvSnap.docs.map(d => ({ id: d.id, ...d.data() } as Harvest)));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching detailed data", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Cargando perfil del cliente...</div>;
  }

  if (!establishment) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-stone-800">Establecimiento no encontrado</h2>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">Volver</Button>
      </div>
    );
  }

  const totalHarvestedKg = harvests.reduce((acc, curr) => acc + (curr.kilograms || 0), 0);
  const totalEmployees = collectors.length + packers.length;
  
  const recentHarvests = harvests.slice(0, 5);

  const mainProducer = users.find(u => u.role === 'Productor') || users[0];
  const subStatus = mainProducer?.subscriptionStatus || 'active';
  const subLabels = {
    'active': { text: 'Suscripto', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
    'trial': { text: 'En prueba', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
    'past_due': { text: 'Atrasada', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle },
    'canceled': { text: 'Cancelada', color: 'text-stone-500', bg: 'bg-stone-200', icon: AlertTriangle },
  };
  const SubIcon = subLabels[subStatus as keyof typeof subLabels]?.icon || CheckCircle2;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-10">
      
      {/* Header and Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-stone-200">
          <ArrowLeft className="h-5 w-5 text-stone-700" />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-stone-900 tracking-tight flex items-center gap-3">
            {establishment.producer}
            {establishment.hasGoodPracticesSeal && (
              <Badge className="bg-green-600 hover:bg-green-700 font-bold px-2 py-0.5 shadow-sm">
                <ShieldCheck className="h-4 w-4 mr-1" /> BPA
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-4 text-stone-500 text-sm mt-1">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {establishment.location?.locality}, {establishment.location?.province}</span>
            <span className="flex items-center gap-1"><Building className="h-4 w-4" /> ID: {establishment.id}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="border-0 shadow-sm border-b-4 border-b-emerald-600 cursor-pointer hover:bg-stone-50 transition-colors group">
              <CardHeader className="pb-2">
                <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-[10px] group-hover:text-emerald-600 transition-colors">Plan de Suscripción</CardDescription>
                <CardTitle className="text-xl font-bold flex items-center gap-2 mt-1">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <Badge className={`${subLabels[subStatus as keyof typeof subLabels]?.bg} ${subLabels[subStatus as keyof typeof subLabels]?.color} shadow-none font-bold border-0`}>
                    <SubIcon className="h-3 w-3 mr-1" />
                    {subLabels[subStatus as keyof typeof subLabels]?.text}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl">
            <DialogHeader className="pb-4 border-b border-stone-100">
              <DialogTitle className="flex items-center gap-2 text-xl text-stone-800">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Detalles de Suscripción
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-500 font-medium">Estado Actual</span>
                <Badge className={`${subLabels[subStatus as keyof typeof subLabels]?.bg} ${subLabels[subStatus as keyof typeof subLabels]?.color} shadow-none border-0`}>
                  {subLabels[subStatus as keyof typeof subLabels]?.text}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-500 font-medium">Titular de la Cuenta</span>
                <span className="text-sm font-semibold text-stone-800">{mainProducer?.name || 'No definido'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-500 font-medium">Correo Electrónico</span>
                <span className="text-sm font-semibold text-stone-800">{mainProducer?.email || 'No definido'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-500 font-medium">Fecha de Vencimiento</span>
                <span className="text-sm font-semibold text-stone-800">
                  {mainProducer?.subscriptionExpiryDate 
                    ? new Date(mainProducer.subscriptionExpiryDate).toLocaleDateString('es-ES') 
                    : (subStatus === 'trial' ? 'En 14 días' : 'No definida')}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-500 font-medium">ID MercadoPago</span>
                <span className="text-xs font-mono font-semibold text-stone-800">
                  {mainProducer?.mercadoPagoSubscriptionId || 'N/A'}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="border-0 shadow-sm border-b-4 border-b-[#2d4a22]">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Producción Total</CardDescription>
            <CardTitle className="text-xl font-bold text-[#2d4a22] flex items-center gap-2 mt-1">
              <Sprout className="h-5 w-5 opacity-70" /> {totalHarvestedKg.toLocaleString()} kg
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-0 shadow-sm border-b-4 border-b-blue-600">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Empleados</CardDescription>
            <CardTitle className="text-xl font-bold text-blue-600 flex items-center gap-2 mt-1">
              <Users className="h-5 w-5 opacity-70" /> {totalEmployees}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm border-b-4 border-b-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Cosechas Registradas</CardDescription>
            <CardTitle className="text-xl font-bold text-amber-500 flex items-center gap-2 mt-1">
              <Activity className="h-5 w-5 opacity-70" /> {harvests.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm border-b-4 border-b-purple-600">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Usuarios</CardDescription>
            <CardTitle className="text-xl font-bold text-purple-600 flex items-center gap-2 mt-1">
              <Tractor className="h-5 w-5 opacity-70" /> {users.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Team & Users */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-stone-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-stone-600" />
                Equipo de Gestión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-100">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 hover:bg-stone-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-stone-800">{u.name}</p>
                      <p className="text-sm text-stone-500">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="bg-stone-100">{u.role}</Badge>
                  </div>
                ))}
                {users.length === 0 && <div className="p-6 text-center text-stone-500">No hay usuarios registrados</div>}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-stone-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-stone-50 border-b border-stone-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Pickaxe className="h-5 w-5 text-stone-600" />
                  Recolectores ({collectors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-stone-100">
                  {collectors.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 px-4">
                      <span className="font-medium text-stone-700">{c.name}</span>
                      <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full">{c.totalHarvested?.toLocaleString() || 0} kg</span>
                    </div>
                  ))}
                  {collectors.length === 0 && <div className="p-4 text-center text-sm text-stone-500">Sin recolectores</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-stone-50 border-b border-stone-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-stone-600" />
                  Embaladores ({packers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-stone-100">
                  {packers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 px-4">
                      <span className="font-medium text-stone-700">{p.name}</span>
                      <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full">{p.totalPackaged?.toLocaleString() || 0} kg</span>
                    </div>
                  ))}
                  {packers.length === 0 && <div className="p-4 text-center text-sm text-stone-500">Sin embaladores</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-stone-50 border-b border-stone-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-stone-600" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>Últimas cosechas registradas</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative border-l-2 border-stone-200 ml-3 pl-4 space-y-6 mt-4">
                {recentHarvests.map(h => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2d4a22] rounded-full border-2 border-white shadow-sm" />
                    <div>
                      <p className="text-sm font-bold text-stone-800">{h.kilograms} kg cosechados</p>
                      <p className="text-xs text-stone-500 mt-1">Lote: {h.batchNumber}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
                {recentHarvests.length === 0 && (
                  <p className="text-sm text-stone-500 text-center py-4">No hay actividad registrada aún.</p>
                )}
              </div>
              
              {harvests.length > 5 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" className="w-full text-xs text-stone-500">Ver todas las cosechas</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
