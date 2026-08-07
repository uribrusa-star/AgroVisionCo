'use client';

import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Building, ShieldCheck, ShieldAlert, Power, PowerOff, MapPin, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { EstablishmentData } from '@/lib/types';

export default function AdminDashboardPage() {
  const { currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const router = useRouter();
  
  const [establishments, setEstablishments] = useState<EstablishmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'SuperAdmin') return;
    
    // Subscribe to all establishments in real-time
    const unsubscribe = onSnapshot(collection(db, 'establishment'), (snapshot) => {
      const ests: EstablishmentData[] = [];
      snapshot.forEach((doc) => {
        // Only include those that look like establishments
        const data = doc.data() as EstablishmentData;
        if (data.producer) {
          ests.push({ ...data, id: doc.id });
        }
      });
      setEstablishments(ests);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching establishments:", error);
      toast({
        title: "Error de Sincronización",
        description: "No se pudieron cargar los establecimientos.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const toggleGoodPractices = async (id: string, currentValue: boolean | undefined) => {
    const newValue = !currentValue;
    try {
      await updateDoc(doc(db, 'establishment', id), {
        hasGoodPracticesSeal: newValue
      });
      toast({
        title: newValue ? "Sello Otorgado" : "Sello Revocado",
        description: `Se ha ${newValue ? 'aprobado' : 'retirado'} el Sello de Buenas Prácticas Agrícolas.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el Sello.",
        variant: "destructive"
      });
    }
  };

  const toggleActiveStatus = async (id: string, currentValue: boolean | undefined) => {
    // If undefined, we assume it was active by default
    const newValue = currentValue === undefined ? false : !currentValue;
    try {
      await updateDoc(doc(db, 'establishment', id), {
        isActive: newValue
      });
      toast({
        title: newValue ? "Establecimiento Habilitado" : "Establecimiento Suspendido",
        description: `El acceso a la plataforma ha sido ${newValue ? 'restaurado' : 'bloqueado'}.`,
        variant: newValue ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Cargando plataforma...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-stone-900 tracking-tight">Panel de Control Central</h1>
          <p className="text-stone-500 mt-1">Gestión global y certificación de establecimientos AgroVista</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-black/5 bg-white overflow-hidden">
        <CardHeader className="bg-stone-50 border-b border-stone-100 pb-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building className="h-6 w-6 text-[#2d4a22]" />
            Directorio de Clientes
          </CardTitle>
          <CardDescription>Administra los accesos y emite Sellos de Buenas Prácticas (BPA).</CardDescription>
        </CardHeader>
        
        {/* VISTA MÓVIL: Tarjetas en lugar de tabla */}
        <div className="md:hidden p-4 space-y-4 bg-stone-50/50">
          {establishments.length === 0 ? (
            <p className="text-center text-stone-500 py-4">No hay establecimientos registrados.</p>
          ) : (
            establishments.map((est) => {
              const isActive = est.isActive ?? true;
              const hasSeal = est.hasGoodPracticesSeal ?? false;
              
              return (
                <Card key={est.id} className="border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                  <div className={`h-1.5 w-full ${isActive ? 'bg-[#2d4a22]' : 'bg-red-500'}`} />
                  <CardHeader className="pb-2 cursor-pointer hover:bg-stone-50/50 transition-colors" onClick={() => router.push(`/admin/${est.id}`)}>
                    <CardTitle className="text-lg font-headline truncate hover:text-[#2d4a22] transition-colors">{est.producer}</CardTitle>
                    <CardDescription className="flex flex-col gap-1 mt-1">
                      <span className="flex items-center gap-1.5 text-stone-600">
                        <MapPin className="h-3.5 w-3.5" />
                        {est.location?.locality}, {est.location?.province}
                      </span>
                      <span className="flex items-center gap-1.5 text-stone-600">
                        <UserIcon className="h-3.5 w-3.5" />
                        {est.technicalManager}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Sello BPA Control */}
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 border border-stone-100 gap-3">
                        <Badge variant={hasSeal ? "default" : "outline"} className={`w-full justify-center py-1 ${hasSeal ? "bg-green-600 hover:bg-green-700 shadow-sm" : ""}`}>
                          {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1.5"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5"/>}
                          {hasSeal ? 'Certificado' : 'Sin Sello'}
                        </Badge>
                        <Switch 
                          checked={hasSeal}
                          onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                      
                      {/* Estado Control */}
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 border border-stone-100 gap-3">
                         <Badge variant={isActive ? "default" : "destructive"} className={`w-full justify-center py-1 ${isActive ? "bg-[#2d4a22] hover:bg-[#1a2d13] shadow-sm" : ""}`}>
                          {isActive ? <Power className="h-3.5 w-3.5 mr-1.5"/> : <PowerOff className="h-3.5 w-3.5 mr-1.5"/>}
                          {isActive ? 'Activo' : 'Suspendido'}
                        </Badge>
                        <Switch 
                          checked={isActive}
                          onCheckedChange={() => toggleActiveStatus(est.id, isActive)}
                          className="data-[state=checked]:bg-[#2d4a22]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* VISTA ESCRITORIO: Tabla elegante */}
        <CardContent className="hidden md:block p-0">
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-stone-100">
                <TableHead className="py-4 pl-6 font-semibold text-stone-600">Establecimiento / Productor</TableHead>
                <TableHead className="py-4 font-semibold text-stone-600">Ubicación</TableHead>
                <TableHead className="py-4 font-semibold text-stone-600">Encargado Técnico</TableHead>
                <TableHead className="py-4 text-center font-semibold text-stone-600 w-40">Sello BPA</TableHead>
                <TableHead className="py-4 pr-6 text-center font-semibold text-stone-600 w-40">Estado de Cuenta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {establishments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-stone-500">
                    No hay establecimientos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                establishments.map((est) => {
                  const isActive = est.isActive ?? true;
                  const hasSeal = est.hasGoodPracticesSeal ?? false;
                  
                  return (
                    <TableRow key={est.id} className="transition-colors hover:bg-stone-50/50 group cursor-pointer" onClick={(e) => {
                      // Prevent navigation if clicking on switches
                      if ((e.target as HTMLElement).closest('.switch-container')) return;
                      router.push(`/admin/${est.id}`);
                    }}>
                      <TableCell className="pl-6 py-4">
                        <div className="font-headline font-semibold text-stone-900">{est.producer}</div>
                        <div className="text-xs text-stone-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">ID: {est.id}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center text-stone-600">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-stone-400" />
                          {est.location?.locality}, {est.location?.province}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center text-stone-700 font-medium">
                          <UserIcon className="h-3.5 w-3.5 mr-1.5 text-stone-400" />
                          {est.technicalManager}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center switch-container">
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant={hasSeal ? "default" : "outline"} className={`transition-all duration-300 ${hasSeal ? "bg-green-600 hover:bg-green-700 shadow-sm" : "bg-transparent"}`}>
                            {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1 text-stone-400"/>}
                            {hasSeal ? 'Certificado' : 'Sin Sello'}
                          </Badge>
                          <Switch 
                            checked={hasSeal}
                            onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-center switch-container">
                        <div className="flex flex-col items-center gap-2">
                           <Badge variant={isActive ? "default" : "destructive"} className={`transition-all duration-300 ${isActive ? "bg-[#2d4a22] hover:bg-[#1a2d13] shadow-sm" : ""}`}>
                            {isActive ? <Power className="h-3.5 w-3.5 mr-1"/> : <PowerOff className="h-3.5 w-3.5 mr-1"/>}
                            {isActive ? 'Habilitado' : 'Suspendido'}
                          </Badge>
                          <Switch 
                            checked={isActive}
                            onCheckedChange={() => toggleActiveStatus(est.id, isActive)}
                            className="data-[state=checked]:bg-[#2d4a22]"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
