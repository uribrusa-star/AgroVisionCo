'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Tractor, Sprout, Building, ShieldCheck, MapPin, Pickaxe, Package, Activity, Clock, CreditCard, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import type { EstablishmentData, User, Collector, Packer, Harvest } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AppDataContext } from '@/context/app-data-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

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

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsEditingUser(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          name: editName,
          password: editPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar usuario');
      }

      toast({
        title: "Usuario Actualizado",
        description: `Los datos de ${editName} han sido actualizados.`,
      });
      
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, name: editName } : u));
      setIsUserDialogOpen(false);
      
    } catch (error: any) {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEditingUser(false);
    }
  };

  const openEditUser = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditPassword(''); // No mostramos la vieja por seguridad
    setIsUserDialogOpen(true);
  };

  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.role !== 'Ingeniero Agronomo' && userToDelete.role !== 'Encargado') {
      toast({
        title: "Acción Restringida",
        description: "Únicamente se permite eliminar usuarios del Equipo de Gestión (Ingeniero Agrónomo o Encargados). El Productor no puede ser eliminado.",
        variant: "destructive"
      });
      return;
    }

    setIsDeletingUser(true);
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDelete.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      toast({
        title: "Usuario Eliminado",
        description: `El usuario ${userToDelete.name} (${userToDelete.role}) ha sido eliminado del equipo.`,
      });

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setIsUserDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

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
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-stone-200 dark:hover:bg-stone-800">
          <ArrowLeft className="h-5 w-5 text-stone-700 dark:text-stone-300" />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-3">
            {establishment.producer}
            {establishment.hasGoodPracticesSeal && (
              <Badge className="bg-green-600 hover:bg-green-700 font-bold px-2 py-0.5 shadow-sm text-white">
                <ShieldCheck className="h-4 w-4 mr-1" /> BPA
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-4 text-stone-500 dark:text-stone-400 text-sm mt-1">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {establishment.location?.locality}, {establishment.location?.province}</span>
            <span className="flex items-center gap-1"><Building className="h-4 w-4" /> ID: {establishment.id}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-emerald-600 dark:border-b-emerald-500 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors group">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
                <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[9px] sm:text-[10px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">Plan Suscripción</CardDescription>
                <CardTitle className="text-base sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <Badge className={`${subLabels[subStatus as keyof typeof subLabels]?.bg} ${subLabels[subStatus as keyof typeof subLabels]?.color} dark:bg-emerald-950/60 dark:text-emerald-300 shadow-none font-bold border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0`}>
                    <SubIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {subLabels[subStatus as keyof typeof subLabels]?.text}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl dark:bg-stone-900 dark:border-stone-800 text-stone-900 dark:text-stone-100">
            <DialogHeader className="pb-4 border-b border-stone-100 dark:border-stone-800">
              <DialogTitle className="flex items-center gap-2 text-xl text-stone-800 dark:text-stone-100">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Detalles de Suscripción
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg">
                <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Estado Actual</span>
                <Badge className={`${subLabels[subStatus as keyof typeof subLabels]?.bg} ${subLabels[subStatus as keyof typeof subLabels]?.color} shadow-none border-0`}>
                  {subLabels[subStatus as keyof typeof subLabels]?.text}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg">
                <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Titular de la Cuenta</span>
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{mainProducer?.name || 'No definido'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg">
                <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Correo de Contacto</span>
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{mainProducer?.notificationEmail || mainProducer?.email || 'No definido'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg">
                <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Fecha de Vencimiento</span>
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {mainProducer?.subscriptionExpiryDate 
                    ? new Date(mainProducer.subscriptionExpiryDate).toLocaleDateString('es-ES') 
                    : (subStatus === 'trial' ? 'En 14 días' : 'No definida')}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg">
                <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">ID MercadoPago</span>
                <span className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
                  {mainProducer?.mercadoPagoSubscriptionId || 'N/A'}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-[#2d4a22] dark:border-b-emerald-500">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[9px] sm:text-[10px] truncate">Producción Total</CardDescription>
            <CardTitle className="text-base sm:text-xl font-bold text-[#2d4a22] dark:text-emerald-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <Sprout className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 shrink-0" /> {totalHarvestedKg.toLocaleString()} kg
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-blue-600 dark:border-b-blue-500">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[9px] sm:text-[10px] truncate">Empleados</CardDescription>
            <CardTitle className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 shrink-0" /> {totalEmployees}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-amber-500 dark:border-b-amber-400">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[9px] sm:text-[10px] truncate">Cosechas</CardDescription>
            <CardTitle className="text-base sm:text-xl font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 shrink-0" /> {harvests.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-0 shadow-sm border-b-4 border-b-purple-600 dark:border-b-purple-400 col-span-2 md:col-span-1">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <CardDescription className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[9px] sm:text-[10px] truncate">Usuarios</CardDescription>
            <CardTitle className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <Tractor className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 shrink-0" /> {users.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Team & Users */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
              <CardTitle className="flex items-center gap-2 text-lg dark:text-stone-100">
                <Users className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                Equipo de Gestión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {users.map(u => {
                  const canDelete = u.role === 'Ingeniero Agronomo' || u.role === 'Encargado';
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                      <div onClick={() => openEditUser(u)} className="cursor-pointer flex-1">
                        <p className="font-semibold text-stone-800 dark:text-stone-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{u.name}</p>
                        <p className="text-sm text-stone-500 dark:text-stone-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">{u.role}</Badge>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                title={`Eliminar ${u.role}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="dark:bg-stone-900 dark:border-stone-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="dark:text-stone-100">¿Eliminar usuario del equipo?</AlertDialogTitle>
                                <AlertDialogDescription className="dark:text-stone-400">
                                  Esta acción eliminará la cuenta de <strong>{u.name}</strong> ({u.role}) del establecimiento. No podrá volver a iniciar sesión.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="dark:border-stone-700 dark:text-stone-300">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(u)} 
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Sí, Eliminar Usuario
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && <div className="p-6 text-center text-stone-500 dark:text-stone-400">No hay usuarios registrados</div>}
              </div>
            </CardContent>
          </Card>
          
          {/* User Edit Dialog */}
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl dark:bg-stone-900 dark:border-stone-800 dark:text-stone-100">
              <DialogHeader>
                <DialogTitle className="dark:text-stone-100 flex items-center justify-between pr-6">
                  <span>Editar Usuario ({selectedUser?.role})</span>
                </DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <form onSubmit={handleEditUser} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="dark:text-stone-300">Nombre de Usuario</Label>
                    <Input 
                      id="edit-name" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      required 
                      className="dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-password" className="dark:text-stone-300">Nueva Contraseña (Dejar en blanco para no cambiar)</Label>
                    <Input 
                      id="edit-password" 
                      type="password" 
                      value={editPassword} 
                      onChange={(e) => setEditPassword(e.target.value)} 
                      placeholder="Mínimo 6 caracteres"
                      className="dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    {(selectedUser.role === 'Ingeniero Agronomo' || selectedUser.role === 'Encargado') ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Eliminar Usuario
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="dark:bg-stone-900 dark:border-stone-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="dark:text-stone-100">¿Eliminar {selectedUser.role}?</AlertDialogTitle>
                            <AlertDialogDescription className="dark:text-stone-400">
                              Se eliminará a <strong>{selectedUser.name}</strong> del sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="dark:border-stone-700 dark:text-stone-300">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(selectedUser)} 
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Confirmar Eliminación
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-xs text-stone-400 italic">Productor Titular (no eliminable)</span>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)} className="dark:border-stone-700 dark:text-stone-300">
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-[#2d4a22] hover:bg-[#1a2d13] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white" disabled={isEditingUser}>
                        {isEditingUser ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
              <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
                <CardTitle className="flex items-center gap-2 text-lg dark:text-stone-100">
                  <Pickaxe className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                  Recolectores ({collectors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {collectors.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 px-4">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{c.name}</span>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">{c.totalHarvested?.toLocaleString() || 0} kg</span>
                    </div>
                  ))}
                  {collectors.length === 0 && <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">Sin recolectores</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
              <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
                <CardTitle className="flex items-center gap-2 text-lg dark:text-stone-100">
                  <Package className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                  Embaladores ({packers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {packers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 px-4">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{p.name}</span>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full">{p.totalPackaged?.toLocaleString() || 0} kg</span>
                    </div>
                  ))}
                  {packers.length === 0 && <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">Sin embaladores</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-6">
          <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800">
              <CardTitle className="flex items-center gap-2 text-lg dark:text-stone-100">
                <Clock className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                Actividad Reciente
              </CardTitle>
              <CardDescription className="dark:text-stone-400">Últimas cosechas registradas</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 pl-4 space-y-6 mt-4">
                {recentHarvests.map(h => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2d4a22] dark:bg-emerald-500 rounded-full border-2 border-white dark:border-stone-900 shadow-sm" />
                    <div>
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-200">{h.kilograms} kg cosechados</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Lote: {h.batchNumber}</p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
                {recentHarvests.length === 0 && (
                  <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">No hay actividad registrada aún.</p>
                )}
              </div>
              
              {harvests.length > 5 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" className="w-full text-xs text-stone-500 dark:text-stone-400 dark:border-stone-800">Ver todas las cosechas</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
