'use client';

import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppDataContext } from '@/context/app-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, ShieldCheck, ShieldAlert, Power, PowerOff, MapPin, User as UserIcon, DollarSign, Activity, Users, Clock, AlertTriangle, CheckCircle2, BellRing, Send, MessageSquare, ChevronDown, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import type { EstablishmentData, User, DiagnosisLog } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FileText } from 'lucide-react';
import { AdminAnalytics } from './admin-analytics';
import { generateSubscriptionReceiptPDF } from '@/lib/pdf-generator';
import { AdminMap } from '@/components/admin-map';

const CreateProducerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  establishmentId: z.string().min(1, "El ID es obligatorio."),
});

export default function AdminDashboardPage() {
  const { currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const router = useRouter();
  
  const [establishments, setEstablishments] = useState<EstablishmentData[]>([]);
  const [diagnosisPestLogs, setDiagnosisPestLogs] = useState<DiagnosisLog[]>([]);
  const [agroPestLogs, setAgroPestLogs] = useState<DiagnosisLog[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPrice, setSubPrice] = useState(80000);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState(80000);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState('info');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Create producer state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createForm = useForm<z.infer<typeof CreateProducerSchema>>({
    resolver: zodResolver(CreateProducerSchema),
    defaultValues: { name: '', email: '', password: '', establishmentId: '' },
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'SuperAdmin') return;
    
    // Subscribe to establishments
    const unsubscribeEst = onSnapshot(collection(db, 'establishment'), (snapshot) => {
      const ests: EstablishmentData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as EstablishmentData;
        if (data.producer) {
          ests.push({ ...data, id: doc.id });
        }
      });
      setEstablishments(ests);
    }, (error) => {
      console.error("Error fetching establishments:", error);
    });

    // Subscribe to producers for finance
    const qProducers = query(collection(db, 'users'), where('role', '==', 'Productor'));
    const unsubscribeProd = onSnapshot(qProducers, (snapshot) => {
      const prods: User[] = [];
      snapshot.forEach((doc) => {
        prods.push({ ...doc.data(), id: doc.id } as User);
      });
      setProducers(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching producers:", error);
      setLoading(false);
    });

    // Subscribe to platform settings for finance
    const unsubscribeSettings = onSnapshot(doc(db, 'platformSettings', 'finance'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.subscriptionPrice) {
          setSubPrice(data.subscriptionPrice);
          setEditPriceValue(data.subscriptionPrice);
        }
      }
    });

    // Subscribe to all diagnosisLogs globally for Pest Radar
    const unsubscribePests = onSnapshot(collection(db, 'diagnosisLogs'), (snapshot) => {
      const logs: DiagnosisLog[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      snapshot.forEach((doc) => {
        const data = doc.data() as DiagnosisLog;
        if (data.date) {
           const logDate = new Date(data.date);
           if (logDate >= thirtyDaysAgo) {
               logs.push({ ...data, id: doc.id });
           }
        }
      });
      setDiagnosisPestLogs(logs);
    }, (error) => {
      console.error("Error fetching global pest logs:", error);
    });

    const unsubscribeAgroPests = onSnapshot(collection(db, 'agronomistLogs'), (snapshot) => {
      const logs: DiagnosisLog[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data.date && (data.type === 'Sanidad' || data.type === 'Plaga' || data.diagnosis)) {
           const logDate = new Date(data.date);
           if (logDate >= thirtyDaysAgo) {
               logs.push({ 
                   id: doc.id,
                   date: data.date,
                   establishmentId: data.establishmentId,
                   result: {
                       diagnosticoPrincipal: data.diagnosis || data.type || 'Problema Sanitario',
                       posiblesDiagnosticos: [{ 
                           nombre: data.diagnosis || data.type || '', 
                           probabilidad: data.severity === 'Grave' ? 0.9 : (data.severity === 'Moderada' ? 0.6 : 0.4),
                           descripcion: data.notes || ''
                       }],
                       recomendacionGeneral: ''
                   }
               } as DiagnosisLog);
           }
        }
      });
      setAgroPestLogs(logs);
    }, (error) => {
      console.error("Error fetching agronomist pest logs:", error);
    });

    // Subscribe to contactRequests in real-time
    const unsubscribeContactRequests = onSnapshot(collection(db, 'contactRequests'), (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      // Realtime sync
    }, (error) => {
      console.error("Error listening to contactRequests:", error);
    });

    return () => {
      unsubscribeEst();
      unsubscribeProd();
      unsubscribeSettings();
      unsubscribePests();
      unsubscribeAgroPests();
      unsubscribeContactRequests();
    };
  }, [currentUser]);

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
      toast({ title: "Error", description: "No se pudo actualizar el Sello.", variant: "destructive" });
    }
  };

  const toggleActiveStatus = async (id: string, currentValue: boolean | undefined) => {
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
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };

  const updateSubscription = async (userId: string, newStatus: string) => {
    try {
      let expiryDate = new Date();
      if (newStatus === 'trial') {
        expiryDate.setDate(expiryDate.getDate() + 14); // +14 days for trial
      } else if (newStatus === 'active') {
        expiryDate.setMonth(expiryDate.getMonth() + 1); // +1 month for premium
      }

      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: newStatus,
        subscriptionExpiryDate: expiryDate.toISOString()
      });
      toast({
        title: "Suscripción Actualizada",
        description: `El plan ha sido cambiado a ${newStatus === 'active' ? 'Premium' : newStatus === 'trial' ? 'Prueba' : newStatus}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la suscripción.", variant: "destructive" });
    }
  };

  const handleUpdatePrice = async () => {
    try {
      await updateDoc(doc(db, 'platformSettings', 'finance'), {
        subscriptionPrice: editPriceValue
      }).catch(async (err) => {
        // Si el documento no existe, setDoc
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'platformSettings', 'finance'), { subscriptionPrice: editPriceValue });
      });
      setIsEditingPrice(false);
      toast({
        title: "Precio Actualizado",
        description: `El valor de la suscripción mensual se ha actualizado a $${editPriceValue.toLocaleString('es-AR')}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el precio.", variant: "destructive" });
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) {
      toast({ title: "Error", description: "Por favor completa el título y el mensaje.", variant: "destructive" });
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          body: broadcastBody,
          severity: broadcastSeverity,
          targetRoles: ['Productor', 'Ingeniero Agronomo', 'Encargado', 'Recolector', 'Embalador']
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Notificación Enviada",
          description: `El mensaje fue enviado masivamente a ${data.count} usuarios.`,
        });
        setBroadcastTitle('');
        setBroadcastBody('');
        setBroadcastSeverity('info');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Fallo al enviar notificación masiva.", variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCreateProducer = async (values: z.infer<typeof CreateProducerSchema>) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          role: 'Productor',
          password: values.password,
          email: values.email,
          establishmentId: values.establishmentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear el productor');
      }

      toast({
        title: "Cliente Creado",
        description: `${values.name} ha sido agregado exitosamente.`,
      });
      
      setIsCreateDialogOpen(false);
      createForm.reset();
      
    } catch (error: any) {
      toast({
        title: "Error al crear",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Cargando plataforma...</div>;
  }

  // Finance Metrics
  const activeCount = producers.filter(p => p.subscriptionStatus === 'active').length;
  const trialCount = producers.filter(p => p.subscriptionStatus === 'trial' || !p.subscriptionStatus).length;
  const mrr = activeCount * subPrice;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-stone-900 tracking-tight">Panel de Control Central</h1>
          <p className="text-stone-500 mt-1">Gestión global, finanzas y certificación de establecimientos AgroVista</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-[1050px] mb-6 h-auto p-1.5 bg-stone-100 dark:bg-stone-800 rounded-xl shadow-inner">
          <TabsTrigger value="analytics" title="Analíticas" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Activity className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Analíticas</span>
          </TabsTrigger>
          <TabsTrigger value="requests" title="Solicitudes" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Mail className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="hidden sm:inline">Solicitudes</span>
          </TabsTrigger>
          <TabsTrigger value="map" title="Mapa Global" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <MapPin className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Mapa Global</span>
          </TabsTrigger>
          <TabsTrigger value="directory" title="Directorio" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Building className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Directorio</span>
          </TabsTrigger>
          <TabsTrigger value="finance" title="Finanzas" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <DollarSign className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Finanzas</span>
          </TabsTrigger>
          <TabsTrigger value="comms" title="Comunicaciones" className="flex items-center justify-center gap-2 py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <BellRing className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Comunicaciones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-0">
          <AdminAnalytics establishments={establishments} />
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-6">
          <ContactRequestsAdminView />
        </TabsContent>

        <TabsContent value="map" className="mt-0 space-y-6">
          <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-4">
               <CardTitle className="flex items-center gap-2 text-xl text-[#2d4a22]">
                  <MapPin className="h-6 w-6" /> Vista Satelital AgroVision
               </CardTitle>
               <CardDescription>Visualización geográfica y operativa de todos los clientes.</CardDescription>
            </CardHeader>
            <div className="h-[600px] w-full p-2 bg-stone-100">
               <AdminMap establishments={establishments} pestLogs={[...diagnosisPestLogs, ...agroPestLogs]} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="mt-0">
          <Card className="border-0 shadow-lg shadow-black/5 bg-white overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building className="h-6 w-6 text-[#2d4a22]" />
                  Directorio de Clientes
                </CardTitle>
                <CardDescription className="mt-1">Administra los accesos, sella y gestiona productores titulares.</CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#2d4a22] hover:bg-[#1a2d13]">
                <Plus className="mr-2 h-4 w-4" /> Agregar Productor
              </Button>
            </CardHeader>
            
            {/* VISTA MÓVIL: Tarjetas */}
            <div className="md:hidden p-4 space-y-4 bg-stone-50/50">
              {establishments.length === 0 ? (
                <p className="text-center text-stone-500 py-4">No hay establecimientos registrados.</p>
              ) : (
                establishments.map((est) => {
                  const isActive = est.isActive ?? true;
                  const hasSeal = est.hasGoodPracticesSeal ?? false;
                  
                  return (
                    <Card key={est.id} className="border-stone-200 overflow-hidden shadow-sm relative">
                      <div className={`h-1.5 w-full ${isActive ? 'bg-[#2d4a22]' : 'bg-red-500'}`} />
                      <CardHeader className="pb-2 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => router.push(`/admin/${est.id}`)}>
                        <CardTitle className="text-lg font-headline truncate">{est.producer}</CardTitle>
                        <CardDescription className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center gap-1.5 text-stone-600">
                            <MapPin className="h-3.5 w-3.5" />
                            {est.location?.locality}, {est.location?.province}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 border border-stone-100 gap-3">
                            <Badge variant={hasSeal ? "default" : "outline"} className={`w-full justify-center py-1 ${hasSeal ? "bg-green-600 shadow-sm text-white" : ""}`}>
                              {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1.5"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5"/>}
                              {hasSeal ? 'Certificado' : 'Sin Sello'}
                            </Badge>
                            <Switch checked={hasSeal} onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)} className="data-[state=checked]:bg-green-600" />
                          </div>
                          
                          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 border border-stone-100 gap-3">
                             <Badge variant={isActive ? "default" : "destructive"} className={`w-full justify-center py-1 ${isActive ? "bg-[#2d4a22] shadow-sm text-white" : ""}`}>
                              {isActive ? <Power className="h-3.5 w-3.5 mr-1.5"/> : <PowerOff className="h-3.5 w-3.5 mr-1.5"/>}
                              {isActive ? 'Activo' : 'Suspendido'}
                            </Badge>
                            <Switch checked={isActive} onCheckedChange={() => toggleActiveStatus(est.id, isActive)} className="data-[state=checked]:bg-[#2d4a22]" />
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
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-stone-500">No hay establecimientos registrados.</TableCell></TableRow>
                  ) : (
                    establishments.map((est) => {
                      const isActive = est.isActive ?? true;
                      const hasSeal = est.hasGoodPracticesSeal ?? false;
                      return (
                        <TableRow key={est.id} className="transition-colors hover:bg-stone-50/50 group cursor-pointer" onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.switch-container')) return;
                          router.push(`/admin/${est.id}`);
                        }}>
                          <TableCell className="pl-6 py-4">
                            <div className="font-headline font-semibold text-stone-900">{est.producer}</div>
                            <div className="text-xs text-stone-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">ID: {est.id}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center text-stone-600"><MapPin className="h-3.5 w-3.5 mr-1.5 text-stone-400" />{est.location?.locality}, {est.location?.province}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center text-stone-700 font-medium"><UserIcon className="h-3.5 w-3.5 mr-1.5 text-stone-400" />{est.technicalManager}</div>
                          </TableCell>
                          <TableCell className="py-4 text-center switch-container">
                            <div className="flex flex-col items-center gap-2">
                              <Badge variant={hasSeal ? "default" : "outline"} className={`transition-all duration-300 ${hasSeal ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-transparent"}`}>
                                {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1 text-stone-400"/>}
                                {hasSeal ? 'Certificado' : 'Sin Sello'}
                              </Badge>
                              <Switch checked={hasSeal} onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)} className="data-[state=checked]:bg-green-600" />
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-center switch-container">
                            <div className="flex flex-col items-center gap-2">
                               <Badge variant={isActive ? "default" : "destructive"} className={`transition-all duration-300 ${isActive ? "bg-[#2d4a22] hover:bg-[#1a2d13] shadow-sm text-white" : ""}`}>
                                {isActive ? <Power className="h-3.5 w-3.5 mr-1"/> : <PowerOff className="h-3.5 w-3.5 mr-1"/>}
                                {isActive ? 'Habilitado' : 'Suspendido'}
                              </Badge>
                              <Switch checked={isActive} onCheckedChange={() => toggleActiveStatus(est.id, isActive)} className="data-[state=checked]:bg-[#2d4a22]" />
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
        </TabsContent>

        <TabsContent value="finance" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm border-b-4 border-b-emerald-600">
              <CardHeader className="pb-2 relative">
                <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-xs">MRR (Ingresos Mensuales)</CardDescription>
                
                {isEditingPrice ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      type="number" 
                      value={editPriceValue} 
                      onChange={(e) => setEditPriceValue(Number(e.target.value))}
                      className="w-32 h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleUpdatePrice} className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingPrice(false); setEditPriceValue(subPrice); }} className="h-8 px-2">Cancelar</Button>
                  </div>
                ) : (
                  <CardTitle className="text-3xl font-bold text-emerald-600 flex items-center gap-2 cursor-pointer group" onClick={() => setIsEditingPrice(true)}>
                    <DollarSign className="h-6 w-6 opacity-70" /> 
                    ${mrr.toLocaleString('es-AR')} ARS
                    <span className="text-xs font-normal text-stone-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">(Click para editar cuota de ${subPrice.toLocaleString('es-AR')})</span>
                  </CardTitle>
                )}
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm border-b-4 border-b-blue-600">
              <CardHeader className="pb-2">
                <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-xs">Usuarios Activos (Premium)</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 opacity-70" /> 
                  {activeCount}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm border-b-4 border-b-amber-500">
              <CardHeader className="pb-2">
                <CardDescription className="font-semibold text-stone-500 uppercase tracking-wider text-xs">En Periodo de Prueba</CardDescription>
                <CardTitle className="text-3xl font-bold text-amber-500 flex items-center gap-2">
                  <Clock className="h-6 w-6 opacity-70" /> 
                  {trialCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-0 shadow-lg shadow-black/5 bg-white overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <DollarSign className="h-6 w-6 text-emerald-600" />
                Gestión de Suscripciones
              </CardTitle>
              <CardDescription>Actualiza manualmente el estado de cobro de los productores titulares.</CardDescription>
            </CardHeader>
            {/* VISTA MÓVIL: Tarjetas Expandibles */}
            <div className="md:hidden p-4 space-y-3 bg-stone-50/50">
              {producers.map((prod) => {
                const status = prod.subscriptionStatus || 'trial';
                const statusLabels = {
                  'active': { label: 'Premium', color: 'bg-green-100 text-green-700' },
                  'trial': { label: 'Prueba', color: 'bg-blue-100 text-blue-700' },
                  'past_due': { label: 'Atrasada', color: 'bg-red-100 text-red-700' },
                  'canceled': { label: 'Cancelada', color: 'bg-stone-100 text-stone-700' },
                };
                
                return (
                  <details key={prod.id} className="group bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div>
                        <div className="font-headline font-semibold text-stone-900">{prod.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5">ID: {prod.establishmentId || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`border-0 font-semibold ${statusLabels[status as keyof typeof statusLabels]?.color}`}>
                          {statusLabels[status as keyof typeof statusLabels]?.label}
                        </Badge>
                        <ChevronDown className="h-4 w-4 text-stone-400 group-open:rotate-180 transition-transform" />
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 space-y-3 bg-stone-50/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500">Email:</span>
                        <span className="font-medium text-stone-700 truncate max-w-[200px]">{prod.notificationEmail || prod.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500">Vencimiento:</span>
                        <span className="font-medium text-stone-700">
                          {prod.subscriptionExpiryDate 
                            ? new Date(prod.subscriptionExpiryDate).toLocaleDateString('es-ES') 
                            : 'No definida'}
                        </span>
                      </div>
                      <div className="pt-2">
                        <label className="text-xs text-stone-500 mb-1 block">Modificar Estado:</label>
                        <Select 
                          defaultValue={status} 
                          onValueChange={(val) => updateSubscription(prod.id, val)}
                        >
                          <SelectTrigger className={`w-full font-semibold focus:ring-0 ${
                            status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 
                            status === 'trial' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                            status === 'past_due' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial" className="text-blue-700 font-medium">Prueba (14 días)</SelectItem>
                            <SelectItem value="active" className="text-green-700 font-medium">Premium</SelectItem>
                            <SelectItem value="past_due" className="text-red-700 font-medium">Atrasada</SelectItem>
                            <SelectItem value="canceled" className="text-stone-700 font-medium">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full text-stone-600 bg-white hover:bg-stone-50 border-stone-200 shadow-sm font-semibold h-9 mt-2"
                          onClick={() => {
                            const amount = subPrice;
                            generateSubscriptionReceiptPDF(
                              prod.name,
                              prod.notificationEmail || prod.email,
                              amount,
                              status,
                              prod.subscriptionExpiryDate || null,
                              '/logo.png'
                            );
                            toast({ title: "PDF Generado", description: "La boleta de suscripción se ha descargado." });
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Generar Boleta
                        </Button>
                      </div>
                    </div>
                  </details>
                )
              })}
              {producers.length === 0 && (
                <div className="text-center py-8 text-stone-500">No hay productores registrados.</div>
              )}
            </div>

            {/* VISTA ESCRITORIO: Tabla */}
            <CardContent className="hidden md:block p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100">
                    <TableHead className="py-4 pl-6 font-semibold text-stone-600">Productor Titular</TableHead>
                    <TableHead className="py-4 font-semibold text-stone-600">Email de Contacto</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-stone-600">Vencimiento</TableHead>
                    <TableHead className="py-4 pr-6 text-center font-semibold text-stone-600 w-48">Plan / Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {producers.map((prod) => {
                    const status = prod.subscriptionStatus || 'trial';
                    
                    return (
                      <TableRow key={prod.id} className="transition-colors hover:bg-stone-50/50">
                        <TableCell className="pl-6 py-4">
                          <div className="font-headline font-semibold text-stone-900">{prod.name}</div>
                          <div className="text-xs text-stone-500 mt-0.5">Establecimiento ID: {prod.establishmentId || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="py-4 text-stone-600 text-sm">
                          {prod.notificationEmail || prod.email}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-sm font-medium text-stone-700">
                            {prod.subscriptionExpiryDate 
                              ? new Date(prod.subscriptionExpiryDate).toLocaleDateString('es-ES') 
                              : 'No definida'}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-center">
                          <Select 
                            defaultValue={status} 
                            onValueChange={(val) => updateSubscription(prod.id, val)}
                          >
                            <SelectTrigger className={`w-full font-semibold border-0 ring-0 focus:ring-0 ${
                              status === 'active' ? 'bg-green-100 text-green-700' : 
                              status === 'trial' ? 'bg-blue-100 text-blue-700' : 
                              status === 'past_due' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700'
                            }`}>
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trial" className="text-blue-700 font-medium">Prueba (14 días)</SelectItem>
                              <SelectItem value="active" className="text-green-700 font-medium">Premium</SelectItem>
                              <SelectItem value="past_due" className="text-red-700 font-medium">Atrasada</SelectItem>
                              <SelectItem value="canceled" className="text-stone-700 font-medium">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full mt-2 text-stone-600 bg-white hover:bg-stone-50 border-stone-200 shadow-sm"
                            onClick={() => {
                              const amount = subPrice;
                              generateSubscriptionReceiptPDF(
                                prod.name,
                                prod.notificationEmail || prod.email,
                                amount,
                                status,
                                prod.subscriptionExpiryDate || null,
                                '/logo.png'
                              );
                              toast({ title: "PDF Generado", description: "La boleta de suscripción se ha descargado." });
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Boleta
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comms" className="mt-0">
          <Card className="border-0 shadow-lg shadow-black/5 bg-white overflow-hidden max-w-3xl">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BellRing className="h-6 w-6 text-blue-600" />
                Alertas Globales (Broadcast)
              </CardTitle>
              <CardDescription>Envía una notificación push a todos los usuarios de AgroVista (Productores, Ingenieros, Encargados, Recolectores).</CardDescription>
            </CardHeader>
            <form onSubmit={handleBroadcast}>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-title" className="text-stone-700">Título de la Notificación</Label>
                  <Input 
                    id="broadcast-title" 
                    placeholder="Ej. Mantenimiento Programado"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    required
                    maxLength={100}
                    className="focus-visible:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="broadcast-body" className="text-stone-700">Cuerpo del Mensaje</Label>
                  <Textarea 
                    id="broadcast-body" 
                    placeholder="Ej. Esta noche de 02:00 a 04:00 AM los servidores estarán offline..."
                    value={broadcastBody}
                    onChange={e => setBroadcastBody(e.target.value)}
                    required
                    maxLength={300}
                    rows={4}
                    className="resize-none focus-visible:ring-blue-500"
                  />
                  <div className="text-xs text-stone-400 text-right">{broadcastBody.length} / 300</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-700">Nivel de Importancia (Severidad)</Label>
                  <Select value={broadcastSeverity} onValueChange={setBroadcastSeverity}>
                    <SelectTrigger className="w-full sm:w-[250px] focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar Severidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"/> Informativo</div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"/> Advertencia</div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"/> Crítico</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="bg-stone-50 border-t border-stone-100 flex justify-end py-4">
                <Button 
                  type="submit" 
                  disabled={isBroadcasting} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-6"
                >
                  {isBroadcasting ? (
                    <>Enviando... <Activity className="h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Enviar Alerta Masiva <Send className="h-4 w-4" /></>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for creating a new Producer */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Agregar Nuevo Productor</DialogTitle>
                <DialogDescription>
                    Crea un nuevo cliente (Productor titular) que administrará su propio establecimiento en la plataforma.
                </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateProducer)} className="space-y-4">
                     <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Completo / Razón Social</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Estancia Las Marías" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 text-primary font-medium mb-2">
                            <ShieldAlert className="h-4 w-4" />
                            <p className="text-sm">Datos de Ingreso y Sistema</p>
                        </div>
                        <FormField
                            control={createForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo del Productor (Login)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contacto@lasmarias.co" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={createForm.control}
                            name="establishmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID del Establecimiento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="EST-001" {...field} className="uppercase" />
                                    </FormControl>
                                    <FormDescription>Un ID único corto para referenciar a este campo.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contraseña Inicial (Mínimo 6 caracteres)</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? "Creando..." : "Crear Productor"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactRequestsAdminView() {
  const { contactRequests: contextRequests, updateContactRequestStatus, deleteContactRequest } = useContext(AppDataContext);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'contactRequests'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLiveRequests(list);
    }, (err) => {
      console.error("Error subscribing to contactRequests:", err);
    });

    return () => unsubscribe();
  }, []);

  const currentRequests = liveRequests.length > 0 ? liveRequests : contextRequests;

  const filteredRequests = currentRequests.filter(req => {
    const matchesSearch =
      (req.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.phone && req.phone.includes(searchTerm)) ||
      (req.location && req.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesRole = roleFilter === 'all' || req.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>;
      case 'contacted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En Gestión</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completado</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: any) => {
    try {
      await updateContactRequestStatus(requestId, newStatus);
      toast({ title: 'Estado actualizado', description: 'La solicitud ha sido modificada.' });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      await deleteContactRequest(requestId);
      toast({ title: 'Solicitud eliminada', description: 'Registro eliminado correctamente.' });
      if (selectedRequest?.id === requestId) setSelectedRequest(null);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el registro.', variant: 'destructive' });
    }
  };

  const openWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(`Hola ${name || ''}, te escribimos desde el equipo de AgroVista sobre tu solicitud de información.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-stone-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Total Solicitudes</p>
              <p className="text-2xl font-bold text-stone-900">{currentRequests.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-100 text-green-700"><Mail className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">
                {currentRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">En Gestión</p>
              <p className="text-2xl font-bold text-blue-600">
                {currentRequests.filter(r => r.status === 'contacted').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700"><MessageSquare className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Productores</p>
              <p className="text-2xl font-bold text-emerald-600">
                {currentRequests.filter(r => r.role === 'Productor de Frutillas').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="bg-white border-stone-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nombre, email, teléfono o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border-stone-200"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="contacted">En Gestión</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List / Cards */}
      {filteredRequests.length === 0 ? (
        <Card className="bg-white border-stone-200 text-center py-12">
          <CardContent className="space-y-2">
            <Mail className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-bold text-stone-700">No hay solicitudes registradas</h3>
            <p className="text-xs text-stone-500">Las solicitudes ingresadas desde la página web aparecerán aquí en tiempo real.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <Card key={req.id} className="bg-white border-stone-200 hover:border-green-400 transition-all p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-stone-900">{req.name}</h4>
                  <p className="text-xs text-stone-500">{req.location || 'Coronda, Santa Fe'}</p>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded bg-green-50 text-green-800 text-xs font-semibold">
                {req.role}
              </div>

              <div className="text-xs text-stone-600 space-y-1">
                <p>✉️ {req.email}</p>
                {req.phone && <p>📱 {req.phone}</p>}
                {req.message && <p className="italic text-stone-500 mt-2 bg-stone-50 p-2 rounded">&quot;{req.message}&quot;</p>}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => window.open(`mailto:${req.email}?subject=Respuesta a tu consulta en AgroVista`, '_blank')}>
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email
                </Button>
                {req.phone && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-700 bg-emerald-50" onClick={() => openWhatsApp(req.phone, req.name)}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 p-2" onClick={() => handleDelete(req.id)}>
                  🗑️
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
