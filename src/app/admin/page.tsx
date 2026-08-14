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
import { Building, ShieldCheck, ShieldAlert, Power, PowerOff, MapPin, User as UserIcon, DollarSign, Activity, Users, Clock, AlertTriangle, CheckCircle2, BellRing, Send, MessageSquare, ChevronDown, Mail, Sun, Moon, Sparkles, ThermometerSnowflake, CloudRain } from 'lucide-react';
import { useTheme } from 'next-themes';
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
import { generateWeatherAlerts } from '@/ai/flows/generate-weather-alerts';
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

  // Dynamic Weather AI State
  const [weatherAlertsLoading, setWeatherAlertsLoading] = useState(false);
  const [liveWeatherAlerts, setLiveWeatherAlerts] = useState<Array<{ risk: string; eventDate?: string; recommendation: string; urgency: 'Alta' | 'Media' | 'Baja' }>>([]);
  const [weatherSummaryText, setWeatherSummaryText] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveWeather = async () => {
      try {
        setWeatherAlertsLoading(true);
        // Open-Meteo Coronda coordinates (-31.97, -60.92)
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=-31.97&longitude=-60.92&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_mean&timezone=auto&forecast_days=7`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Error al obtener clima");
        const data = await res.json();
        const daily = data.daily;
        
        const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const alertsFound: Array<{ risk: string; eventDate?: string; recommendation: string; urgency: 'Alta' | 'Media' | 'Baja' }> = [];

        let minTempEver = 99;
        let minTempDay = "";
        let maxRainEver = 0;
        let maxRainDay = "";

        for (let i = 0; i < daily.time.length; i++) {
          const dateObj = new Date(daily.time[i] + 'T00:00:00');
          const dayName = dayNames[dateObj.getDay()];
          const minT = daily.temperature_2m_min[i];
          const rain = daily.precipitation_sum[i];

          if (minT < minTempEver) {
            minTempEver = minT;
            minTempDay = dayName;
          }
          if (rain > maxRainEver) {
            maxRainEver = rain;
            maxRainDay = dayName;
          }
        }

        if (minTempEver <= 3) {
          alertsFound.push({
            risk: "Riesgo de Helada Tardía",
            eventDate: `Madrugada del ${minTempDay} (${minTempEver}°C)`,
            recommendation: `Se prevén temperaturas mínimas críticas de ${minTempEver}°C en Coronda para el día ${minTempDay}. Se sugiere activar riego antihelada por aspersión o proteger cultivo con manta térmica.`,
            urgency: "Alta"
          });
        }

        if (maxRainEver >= 15) {
          alertsFound.push({
            risk: "Riesgo de Tormenta y Botrytis",
            eventDate: `${maxRainDay} (${maxRainEver} mm)`,
            recommendation: `Se pronostican precipitaciones de ${maxRainEver} mm acumuladas para el día ${maxRainDay}. Extremar ventilación de microtúneles el día posterior y aplicar fungicida preventivo previo al evento.`,
            urgency: "Media"
          });
        }

        if (alertsFound.length === 0) {
          setWeatherSummaryText(`🟢 Condiciones estables para los próximos 7 días en Coronda (Mínima promedio: ${Math.round(minTempEver)}°C). No se detectan heladas ni tormentas de consideración.`);
        }

        setLiveWeatherAlerts(alertsFound);
      } catch (err) {
        console.error("Error al consultar clima en vivo:", err);
      } finally {
        setWeatherAlertsLoading(false);
      }
    };

    fetchLiveWeather();
  }, []);

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

    return () => {
      unsubscribeEst();
      unsubscribeProd();
      unsubscribeSettings();
      unsubscribePests();
      unsubscribeAgroPests();
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

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-stone-900 dark:text-stone-100 tracking-tight">Panel de Control Central</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Gestión global, finanzas y certificación de establecimientos AgroVista</p>
        </div>

        {/* Theme Toggle Button */}
        {mounted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full px-3.5 py-2 border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-all flex items-center gap-2 text-stone-700 dark:text-stone-200"
            title="Cambiar Modo Claro/Oscuro"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-spin-once" />
                <span className="text-xs font-semibold">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span className="text-xs font-semibold">Modo Oscuro</span>
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs defaultValue="analytics" className="w-full pb-20 md:pb-0">
        {/* Desktop Tabs Bar */}
        <TabsList className="hidden md:grid w-full grid-cols-6 max-w-[1050px] mb-6 h-auto p-1.5 bg-stone-100 dark:bg-stone-800 rounded-xl shadow-inner">
          <TabsTrigger value="analytics" title="Analíticas" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Activity className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Analíticas</span>
          </TabsTrigger>
          <TabsTrigger value="requests" title="Solicitudes" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Mail className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span>Solicitudes</span>
          </TabsTrigger>
          <TabsTrigger value="map" title="Mapa Global" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <MapPin className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Mapa Global</span>
          </TabsTrigger>
          <TabsTrigger value="directory" title="Directorio" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <Building className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Directorio</span>
          </TabsTrigger>
          <TabsTrigger value="finance" title="Finanzas" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <DollarSign className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Finanzas</span>
          </TabsTrigger>
          <TabsTrigger value="comms" title="Comunicaciones" className="flex items-center justify-center gap-2 py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:shadow">
            <BellRing className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>Comunicaciones</span>
          </TabsTrigger>
        </TabsList>

        {/* Mobile Floating Capsule Bottom Dock (Frosted White Translucent) */}
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[390px] bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800/80 rounded-full shadow-2xl shadow-stone-900/15 p-1.5 flex items-center justify-between gap-1 transition-all duration-300">
          <TabsList className="flex w-full items-center justify-around bg-transparent p-0 border-0 h-auto space-x-0">
            <TabsTrigger 
              value="analytics" 
              title="Analíticas"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-emerald-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-emerald-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <Activity className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>

            <TabsTrigger 
              value="requests" 
              title="Solicitudes"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-green-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-green-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <Mail className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>

            <TabsTrigger 
              value="map" 
              title="Mapa Global"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-blue-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <MapPin className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>

            <TabsTrigger 
              value="directory" 
              title="Directorio"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-amber-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-amber-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <Building className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>

            <TabsTrigger 
              value="finance" 
              title="Finanzas"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-blue-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-blue-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <DollarSign className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>

            <TabsTrigger 
              value="comms" 
              title="Comunicaciones"
              className="relative flex items-center justify-center h-11 w-11 rounded-full p-0 transition-all duration-300 border-0 bg-transparent text-stone-500 dark:text-stone-400 data-[state=active]:bg-stone-900 data-[state=active]:text-purple-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-purple-600 data-[state=active]:shadow-md data-[state=active]:scale-105"
            >
              <BellRing className="h-5 w-5 stroke-[2.2]" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="mt-0">
          <AdminAnalytics establishments={establishments} subPrice={subPrice} />
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-6">
          <ContactRequestsAdminView />
        </TabsContent>

        <TabsContent value="map" className="mt-0 space-y-6">
          <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100 overflow-hidden">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800 pb-4">
               <CardTitle className="flex items-center gap-2 text-xl text-[#2d4a22] dark:text-emerald-400">
                  <MapPin className="h-6 w-6" /> Vista Satelital AgroVision
               </CardTitle>
               <CardDescription className="dark:text-stone-400">Visualización geográfica y operativa de todos los clientes.</CardDescription>
            </CardHeader>
            <div className="h-auto sm:h-[600px] w-full p-2 bg-stone-100 dark:bg-stone-950">
               <AdminMap establishments={establishments} pestLogs={[...diagnosisPestLogs, ...agroPestLogs]} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="mt-0">
          <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100 overflow-hidden">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl dark:text-stone-100">
                  <Building className="h-6 w-6 text-[#2d4a22] dark:text-emerald-400" />
                  Directorio de Clientes
                </CardTitle>
                <CardDescription className="mt-1 dark:text-stone-400">Administra los accesos, sella y gestiona productores titulares.</CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#2d4a22] hover:bg-[#1a2d13] dark:bg-emerald-600 dark:hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Agregar Productor
              </Button>
            </CardHeader>
            
            {/* VISTA MÓVIL: Tarjetas */}
            <div className="md:hidden p-4 space-y-4 bg-stone-50/50 dark:bg-stone-950/40">
              {establishments.length === 0 ? (
                <p className="text-center text-stone-500 dark:text-stone-400 py-4">No hay establecimientos registrados.</p>
              ) : (
                establishments.map((est) => {
                  const isActive = est.isActive ?? true;
                  const hasSeal = est.hasGoodPracticesSeal ?? false;
                  
                  return (
                    <Card key={est.id} className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm relative">
                      <div className={`h-1.5 w-full ${isActive ? 'bg-[#2d4a22] dark:bg-emerald-500' : 'bg-red-500'}`} />
                      <CardHeader className="pb-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors" onClick={() => router.push(`/admin/${est.id}`)}>
                        <CardTitle className="text-lg font-headline truncate dark:text-stone-100">{est.producer}</CardTitle>
                        <CardDescription className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                            <MapPin className="h-3.5 w-3.5" />
                            {est.location?.locality}, {est.location?.province}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/60 gap-3">
                            <Badge variant={hasSeal ? "default" : "outline"} className={`w-full justify-center py-1 ${hasSeal ? "bg-green-600 dark:bg-green-600 shadow-sm text-white" : "dark:text-stone-300 dark:border-stone-600"}`}>
                              {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1.5"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5"/>}
                              {hasSeal ? 'Certificado' : 'Sin Sello'}
                            </Badge>
                            <Switch checked={hasSeal} onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)} className="data-[state=checked]:bg-green-600" />
                          </div>
                          
                          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/60 gap-3">
                             <Badge variant={isActive ? "default" : "destructive"} className={`w-full justify-center py-1 ${isActive ? "bg-[#2d4a22] dark:bg-emerald-600 shadow-sm text-white" : ""}`}>
                              {isActive ? <Power className="h-3.5 w-3.5 mr-1.5"/> : <PowerOff className="h-3.5 w-3.5 mr-1.5"/>}
                              {isActive ? 'Activo' : 'Suspendido'}
                            </Badge>
                            <Switch checked={isActive} onCheckedChange={() => toggleActiveStatus(est.id, isActive)} className="data-[state=checked]:bg-[#2d4a22] dark:data-[state=checked]:bg-emerald-600" />
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
                <TableHeader className="bg-white dark:bg-stone-900">
                  <TableRow className="hover:bg-transparent border-stone-100 dark:border-stone-800">
                    <TableHead className="py-4 pl-6 font-semibold text-stone-600 dark:text-stone-400">Establecimiento / Productor</TableHead>
                    <TableHead className="py-4 font-semibold text-stone-600 dark:text-stone-400">Ubicación</TableHead>
                    <TableHead className="py-4 font-semibold text-stone-600 dark:text-stone-400">Encargado Técnico</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-stone-600 dark:text-stone-400 w-40">Sello BPA</TableHead>
                    <TableHead className="py-4 pr-6 text-center font-semibold text-stone-600 dark:text-stone-400 w-40">Estado de Cuenta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {establishments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-stone-500 dark:text-stone-400">No hay establecimientos registrados.</TableCell></TableRow>
                  ) : (
                    establishments.map((est) => {
                      const isActive = est.isActive ?? true;
                      const hasSeal = est.hasGoodPracticesSeal ?? false;
                      return (
                        <TableRow key={est.id} className="transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/50 group cursor-pointer border-stone-100 dark:border-stone-800" onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.switch-container')) return;
                          router.push(`/admin/${est.id}`);
                        }}>
                          <TableCell className="pl-6 py-4">
                            <div className="font-headline font-semibold text-stone-900 dark:text-stone-100">{est.producer}</div>
                            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">ID: {est.id}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center text-stone-600 dark:text-stone-300"><MapPin className="h-3.5 w-3.5 mr-1.5 text-stone-400 dark:text-stone-500" />{est.location?.locality}, {est.location?.province}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center text-stone-700 dark:text-stone-300 font-medium"><UserIcon className="h-3.5 w-3.5 mr-1.5 text-stone-400 dark:text-stone-500" />{est.technicalManager}</div>
                          </TableCell>
                          <TableCell className="py-4 text-center switch-container">
                            <div className="flex flex-col items-center gap-2">
                              <Badge variant={hasSeal ? "default" : "outline"} className={`transition-all duration-300 ${hasSeal ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-transparent dark:text-stone-300 dark:border-stone-600"}`}>
                                {hasSeal ? <ShieldCheck className="h-3.5 w-3.5 mr-1"/> : <ShieldAlert className="h-3.5 w-3.5 mr-1 text-stone-400"/>}
                                {hasSeal ? 'Certificado' : 'Sin Sello'}
                              </Badge>
                              <Switch checked={hasSeal} onCheckedChange={() => toggleGoodPractices(est.id, hasSeal)} className="data-[state=checked]:bg-green-600" />
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-center switch-container">
                            <div className="flex flex-col items-center gap-2">
                               <Badge variant={isActive ? "default" : "destructive"} className={`transition-all duration-300 ${isActive ? "bg-[#2d4a22] dark:bg-emerald-600 hover:bg-[#1a2d13] shadow-sm text-white" : ""}`}>
                                {isActive ? <Power className="h-3.5 w-3.5 mr-1"/> : <PowerOff className="h-3.5 w-3.5 mr-1"/>}
                                {isActive ? 'Habilitado' : 'Suspendido'}
                              </Badge>
                              <Switch checked={isActive} onCheckedChange={() => toggleActiveStatus(est.id, isActive)} className="data-[state=checked]:bg-[#2d4a22] dark:data-[state=checked]:bg-emerald-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-2 border-b-emerald-600 dark:border-b-emerald-500">
              <CardHeader className="p-3 sm:p-4 relative">
                <CardDescription className="font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[11px]">MRR (Ingresos Mensuales)</CardDescription>
                
                {isEditingPrice ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      type="number" 
                      value={editPriceValue} 
                      onChange={(e) => setEditPriceValue(Number(e.target.value))}
                      className="w-32 h-8 text-sm dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
                    />
                    <Button size="sm" onClick={handleUpdatePrice} className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingPrice(false); setEditPriceValue(subPrice); }} className="h-8 px-2 dark:text-stone-300">Cancelar</Button>
                  </div>
                ) : (
                  <CardTitle className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5 cursor-pointer group" onClick={() => setIsEditingPrice(true)}>
                    <DollarSign className="h-5 w-5 opacity-80" /> 
                    ${mrr.toLocaleString('es-AR')} ARS
                    <span className="text-xs font-normal text-stone-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">(Editar cuota: ${subPrice.toLocaleString('es-AR')})</span>
                  </CardTitle>
                )}
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-2 border-b-blue-600 dark:border-b-blue-500">
              <CardHeader className="p-3 sm:p-4">
                <CardDescription className="font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[11px]">Usuarios Activos (Premium)</CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="h-5 w-5 opacity-80" /> 
                  {activeCount}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-2 border-b-amber-500 dark:border-b-amber-400">
              <CardHeader className="p-3 sm:p-4">
                <CardDescription className="font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[11px]">En Periodo de Prueba</CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-5 w-5 opacity-80" /> 
                  {trialCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100 overflow-hidden">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800 pb-6">
              <CardTitle className="flex items-center gap-2 text-xl dark:text-stone-100">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                Gestión de Suscripciones
              </CardTitle>
              <CardDescription className="dark:text-stone-400">Actualiza manualmente el estado de cobro de los productores titulares.</CardDescription>
            </CardHeader>
            {/* VISTA MÓVIL: Tarjetas Expandibles */}
            <div className="md:hidden p-4 space-y-3 bg-stone-50/50 dark:bg-stone-950/40">
              {producers.map((prod) => {
                const status = prod.subscriptionStatus || 'trial';
                const statusLabels = {
                  'active': { label: 'Premium', color: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' },
                  'trial': { label: 'Prueba', color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
                  'past_due': { label: 'Atrasada', color: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' },
                  'canceled': { label: 'Cancelada', color: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300' },
                };
                
                return (
                  <details key={prod.id} className="group bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div>
                        <div className="font-headline font-semibold text-stone-900 dark:text-stone-100">{prod.name}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">ID: {prod.establishmentId || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`border-0 font-semibold ${statusLabels[status as keyof typeof statusLabels]?.color}`}>
                          {statusLabels[status as keyof typeof statusLabels]?.label}
                        </Badge>
                        <ChevronDown className="h-4 w-4 text-stone-400 dark:text-stone-500 group-open:rotate-180 transition-transform" />
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3 bg-stone-50/50 dark:bg-stone-800/40">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 dark:text-stone-400">Email:</span>
                        <span className="font-medium text-stone-700 dark:text-stone-200 truncate max-w-[200px]">{prod.notificationEmail || prod.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 dark:text-stone-400">Vencimiento:</span>
                        <span className="font-medium text-stone-700 dark:text-stone-200">
                          {prod.subscriptionExpiryDate 
                            ? new Date(prod.subscriptionExpiryDate).toLocaleDateString('es-ES') 
                            : 'No definida'}
                        </span>
                      </div>
                      <div className="pt-2">
                        <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">Modificar Estado:</label>
                        <Select 
                          defaultValue={status} 
                          onValueChange={(val) => updateSubscription(prod.id, val)}
                        >
                          <SelectTrigger className={`w-full font-semibold focus:ring-0 ${
                            status === 'active' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 
                            status === 'trial' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : 
                            status === 'past_due' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-stone-900 dark:border-stone-800">
                            <SelectItem value="trial" className="text-blue-700 dark:text-blue-400 font-medium">Prueba (14 días)</SelectItem>
                            <SelectItem value="active" className="text-green-700 dark:text-green-400 font-medium">Premium</SelectItem>
                            <SelectItem value="past_due" className="text-red-700 dark:text-red-400 font-medium">Atrasada</SelectItem>
                            <SelectItem value="canceled" className="text-stone-700 dark:text-stone-400 font-medium">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 shadow-sm font-semibold h-9 mt-2"
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
                <div className="text-center py-8 text-stone-500 dark:text-stone-400">No hay productores registrados.</div>
              )}
            </div>

            {/* VISTA ESCRITORIO: Tabla */}
            <CardContent className="hidden md:block p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-white dark:bg-stone-900">
                  <TableRow className="hover:bg-transparent border-stone-100 dark:border-stone-800">
                    <TableHead className="py-4 pl-6 font-semibold text-stone-600 dark:text-stone-400">Productor Titular</TableHead>
                    <TableHead className="py-4 font-semibold text-stone-600 dark:text-stone-400">Email de Contacto</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-stone-600 dark:text-stone-400">Vencimiento</TableHead>
                    <TableHead className="py-4 pr-6 text-center font-semibold text-stone-600 dark:text-stone-400 w-48">Plan / Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {producers.map((prod) => {
                    const status = prod.subscriptionStatus || 'trial';
                    
                    return (
                      <TableRow key={prod.id} className="transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/50 border-stone-100 dark:border-stone-800">
                        <TableCell className="pl-6 py-4">
                          <div className="font-headline font-semibold text-stone-900 dark:text-stone-100">{prod.name}</div>
                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Establecimiento ID: {prod.establishmentId || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="py-4 text-stone-600 dark:text-stone-300 text-sm">
                          {prod.notificationEmail || prod.email}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
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
                              status === 'active' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 
                              status === 'trial' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 
                              status === 'past_due' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                            }`}>
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-stone-900 dark:border-stone-800">
                              <SelectItem value="trial" className="text-blue-700 dark:text-blue-400 font-medium">Prueba (14 días)</SelectItem>
                              <SelectItem value="active" className="text-green-700 dark:text-green-400 font-medium">Premium</SelectItem>
                              <SelectItem value="past_due" className="text-red-700 dark:text-red-400 font-medium">Atrasada</SelectItem>
                              <SelectItem value="canceled" className="text-stone-700 dark:text-stone-400 font-medium">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full mt-2 text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 shadow-sm"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Detector e Inferencia Automática de Clima Semanal en Tiempo Real con IA */}
            <Card className="border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-emerald-50/40 dark:from-sky-950/40 dark:via-blue-950/20 dark:to-emerald-950/20 shadow-sm overflow-hidden h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-bold text-base">
                    <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-400 animate-pulse" />
                    <span>Detector Agronómico de Riesgo Climático Semanal (Coronda)</span>
                  </div>
                  <Badge className="bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-200 border-0 font-semibold text-xs">
                    Análisis IA Genkit
                  </Badge>
                </div>
                <CardDescription className="text-stone-700 dark:text-stone-300 text-xs mt-1">
                  Analiza las variables meteorológicas de la semana en Coronda (-31.97, -60.92) identificando los días críticos de lluvia y helada para redactar la alerta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {weatherAlertsLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-stone-500 text-xs font-medium">
                    <Sparkles className="h-4 w-4 text-sky-500 animate-spin" />
                    <span>Consultando pronóstico en vivo de Coronda a 7 días...</span>
                  </div>
                ) : liveWeatherAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {liveWeatherAlerts.map((alt, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-stone-800 border border-sky-200 dark:border-sky-800 shadow-sm flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-bold text-xs">
                            {alt.risk.includes('Helada') ? <ThermometerSnowflake className="h-4 w-4 text-sky-500 shrink-0" /> : <CloudRain className="h-4 w-4 text-blue-500 shrink-0" />}
                            <span>{alt.risk}</span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            Día Crítico: <strong className="text-stone-800 dark:text-stone-100">{alt.eventDate}</strong>
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                            {alt.recommendation}
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm w-full"
                          onClick={() => {
                            setBroadcastTitle(`️ ${alt.risk.toUpperCase()}: Coronda`);
                            setBroadcastBody(alt.recommendation);
                            setBroadcastSeverity(alt.urgency === 'Alta' ? 'critical' : 'warning');
                            toast({
                              title: "Alerta Climática Cargada",
                              description: "Se precargó la notificación con el día y temperatura real en el formulario de la derecha.",
                            });
                          }}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          <span>Cargar Alerta para Enviar</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{weatherSummaryText || "🟢 Clima favorable y estable en Coronda para los próximos 7 días. No se detectan riesgos climáticos inminentes."}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Formulario de Broadcast */}
            <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 dark:text-stone-100 overflow-hidden">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800 pb-6">
              <CardTitle className="flex items-center gap-2 text-xl dark:text-stone-100">
                <BellRing className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Alertas Globales (Broadcast)
              </CardTitle>
              <CardDescription className="dark:text-stone-400">Envía una notificación push a todos los usuarios de AgroVista (Productores, Ingenieros, Encargados, Recolectores).</CardDescription>
            </CardHeader>
            <form onSubmit={handleBroadcast}>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-title" className="text-stone-700 dark:text-stone-300">Título de la Notificación</Label>
                  <Input 
                    id="broadcast-title" 
                    placeholder="Ej. Mantenimiento Programado"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    required
                    maxLength={100}
                    className="focus-visible:ring-blue-500 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="broadcast-body" className="text-stone-700 dark:text-stone-300">Cuerpo del Mensaje</Label>
                  <Textarea 
                    id="broadcast-body" 
                    placeholder="Ej. Esta noche de 02:00 a 04:00 AM los servidores estarán offline..."
                    value={broadcastBody}
                    onChange={e => setBroadcastBody(e.target.value)}
                    required
                    rows={4}
                    maxLength={300}
                    className="focus-visible:ring-blue-500 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
                  />
                  <p className="text-xs text-right text-stone-400 dark:text-stone-500">{broadcastBody.length} / 300</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broadcast-severity" className="text-stone-700 dark:text-stone-300">Nivel de Importancia (Severidad)</Label>
                  <Select value={broadcastSeverity} onValueChange={setBroadcastSeverity}>
                    <SelectTrigger className="w-full dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100">
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-stone-900 dark:border-stone-800">
                      <SelectItem value="info">🔵 Informativa (Azul)</SelectItem>
                      <SelectItem value="warning">🟧 Advertencia (Naranja)</SelectItem>
                      <SelectItem value="critical">🔴 Crítica / Urgente (Roja)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="bg-stone-50 dark:bg-stone-800/80 border-t border-stone-100 dark:border-stone-800 px-6 py-4 flex justify-between items-center">
                <p className="text-xs text-stone-500 dark:text-stone-400">Esta acción notificará a todos las cuentas activas.</p>
                <Button type="submit" disabled={isBroadcasting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <Send className="mr-2 h-4 w-4" />
                  {isBroadcasting ? "Enviando..." : "Enviar Notificación Push"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </TabsContent>
      </Tabs>

      {/* Dialog for creating a new Producer */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="dark:bg-stone-900 dark:border-stone-800 dark:text-stone-100">
            <DialogHeader>
                <DialogTitle className="dark:text-stone-100">Agregar Nuevo Productor</DialogTitle>
                <DialogDescription className="dark:text-stone-400">
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
                                <FormLabel className="dark:text-stone-300">Nombre Completo / Razón Social</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Estancia Las Marías" {...field} className="dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-4 p-4 bg-muted/50 dark:bg-stone-800/50 rounded-lg border border-primary/20 dark:border-stone-700">
                        <div className="flex items-center gap-2 text-primary dark:text-emerald-400 font-medium mb-2">
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
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/contact');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Error al obtener solicitudes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Polling suave cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = requests.filter(req => {
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

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: newStatus }),
      });
      if (res.ok) {
        toast({ title: 'Estado actualizado', description: 'La solicitud ha sido modificada.' });
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
        if (selectedRequest && selectedRequest.id === requestId) {
          setSelectedRequest({ ...selectedRequest, status: newStatus });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      const res = await fetch(`/api/contact?id=${requestId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Solicitud eliminada', description: 'Registro eliminado correctamente.' });
        setRequests(prev => prev.filter(r => r.id !== requestId));
        if (selectedRequest?.id === requestId) setSelectedRequest(null);
      }
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
        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Total Solicitudes</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{requests.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400"><Mail className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">En Gestión</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {requests.filter(r => r.status === 'contacted').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"><MessageSquare className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Productores</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {requests.filter(r => r.role === 'Productor de Frutillas').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nombre, email, teléfono o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border-stone-200 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-100"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] rounded-xl border-stone-200 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-100"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="dark:bg-stone-900 dark:border-stone-800">
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
        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-center py-12">
          <CardContent className="space-y-2">
            <Mail className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
            <h3 className="text-base font-bold text-stone-700 dark:text-stone-200">No hay solicitudes registradas</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Las solicitudes ingresadas desde la página web aparecerán aquí en tiempo real.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <Card key={req.id} className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-green-400 dark:hover:border-green-500 transition-all p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">{req.name}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{req.location || 'Coronda, Santa Fe'}</p>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 text-xs font-semibold">
                {req.role}
              </div>

              <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                <p>✉️ {req.email}</p>
                {req.phone && <p>📱 {req.phone}</p>}
                {req.message && <p className="italic text-stone-500 dark:text-stone-400 mt-2 bg-stone-50 dark:bg-stone-800 p-2 rounded">&quot;{req.message}&quot;</p>}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button size="sm" variant="outline" className="flex-1 text-xs dark:border-stone-700 dark:hover:bg-stone-800" onClick={() => window.open(`mailto:${req.email}?subject=Respuesta a tu consulta en AgroVista`, '_blank')}>
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email
                </Button>
                {req.phone && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" onClick={() => openWhatsApp(req.phone, req.name)}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2" onClick={() => handleDelete(req.id)}>
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
