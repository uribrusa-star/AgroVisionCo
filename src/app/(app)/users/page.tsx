'use client';

import React, { useState, useContext, useTransition, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, KeyRound, Plus, ShieldAlert, Clock, Search, QrCode, Phone, Activity, History, Sprout, Package, Scissors, UserX, CheckCircle2, FileDown, LogIn, ShieldCheck, Share2, Loader2, RefreshCw, UserCheck } from 'lucide-react';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';
import { AttendanceScannerDialog } from '@/components/attendance-scanner-dialog';
import { buildDynamicUserQRPayload } from '@/lib/qr-security';
import { saveOrSharePdf } from '@/lib/pdf-generator';
import QRCode from 'react-qr-code';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { PageHeader } from "@/components/page-header";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { getRoleAvatar } from '@/lib/utils';

const PasswordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const CreateUserSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  role: z.enum(['Ingeniero Agronomo', 'Encargado']),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  dni: z.string().optional(),
  phone: z.string().optional(),
});

export default function UsersPage() {
  const { users, currentUser, loading, updateUserPassword, updateUserProfile, auditLogs, logUserAction, tasks, agronomistLogs, phenologyLogs, diagnosisLogs, packagingLogs, culturalPracticeLogs, harvests, attendanceLogs, establishmentData, updateEstablishmentData } = useContext(AppDataContext);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isAttendanceScannerOpen, setIsAttendanceScannerOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const qrCodeSvgRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsPhone, setDetailsPhone] = useState('');
  const [isEditingDetailsPhone, setIsEditingDetailsPhone] = useState(false);
  const [isSavingDetailsPhone, setIsSavingDetailsPhone] = useState(false);
  const [qrRefreshTick, setQrRefreshTick] = useState(0);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  // Contador de renovación de QR dinámico cada 60s
  useEffect(() => {
    if (!isDetailsDialogOpen) return;
    const interval = setInterval(() => {
      setQrRefreshTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isDetailsDialogOpen]);

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.dni && u.dni.includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }, [users, searchQuery]);

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const createForm = useForm<z.infer<typeof CreateUserSchema>>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { name: '', role: 'Encargado', password: '' },
  });
  
  const selectedRole = createForm.watch('role');
  const canManageUsers = currentUser?.role === 'Productor' || currentUser?.role === 'SuperAdmin';

  if (currentUser?.role !== 'Productor' && currentUser?.role !== 'Encargado' && currentUser?.role !== 'SuperAdmin') {
    return (
        <>
            <PageHeader title="Usuarios" description="Gestión de usuarios y personal del sistema." />
            <Card>
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Solo los roles de 'Productor' o 'Encargado' pueden acceder a esta sección.</p>
                </CardContent>
            </Card>
        </>
    );
  }

  const getQrImageDataUrl = async (): Promise<string> => {
    const qrSvg = qrCodeSvgRef.current?.querySelector('svg');
    if (!qrSvg) return '';

    return new Promise((resolve) => {
      try {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 0, 0, 400, 400);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        };
        img.onerror = () => resolve('');
        img.src = `data:image/svg+xml;base64,${svgDataBase64}`;
      } catch {
        resolve('');
      }
    });
  };

  const handleDownloadCredentialPdf = async (user: User) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    toast({ title: 'Generando Credencial', description: 'Preparando carnet oficial en 1 sola hoja...' });

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const cardWidth = 90;
      const cardHeight = 135;
      const x = (pageWidth - cardWidth) / 2; // 60mm
      const y = 35;

      const establishmentName = establishmentData?.producer || 'AgroVista';

      // 1. Recuadro con línea punteada para recortar
      doc.setDrawColor(5, 150, 105);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');
      doc.setLineDashPattern([], 0);

      // 2. Encabezado de la credencial (barra verde superior)
      doc.setFillColor(6, 78, 59);
      doc.roundedRect(x, y, cardWidth, 14, 3, 3, 'F');
      doc.rect(x, y + 10, cardWidth, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AGROVISTA', x + 5, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(establishmentName.substring(0, 24), x + cardWidth - 5, y + 8, { align: 'right' });

      // 3. Sub-barra con rol del usuario
      doc.setFillColor(240, 253, 244);
      doc.rect(x, y + 14, cardWidth, 7, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(user.role.toUpperCase(), x + cardWidth / 2, y + 18.5, { align: 'center' });

      // 4. Nombre y DNI
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      const displayName = user.name.length > 22 ? user.name.substring(0, 21) + '...' : user.name;
      doc.text(displayName, x + cardWidth / 2, y + 27, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(user.dni ? `DNI: ${user.dni}` : 'Credencial Digital Oficial', x + cardWidth / 2, y + 32, { align: 'center' });

      // 5. Código QR (obtenido directamente del elemento montado)
      const qrDataUrl = await getQrImageDataUrl();
      const qrSize = 48;
      const qrX = x + (cardWidth - qrSize) / 2;
      const qrY = y + 36;
      if (qrDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // 6. Pie y datos de contacto
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Escanear en tranquera para registrar ingreso y salida', x + cardWidth / 2, y + 90, { align: 'center' });

      if (user.phone) {
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Tel: ${user.phone}`, x + cardWidth / 2, y + 96, { align: 'center' });
      }

      if (user.email) {
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Email: ${user.email}`, x + cardWidth / 2, y + 101, { align: 'center' });
      }

      // 7. Pie de seguridad
      doc.setFillColor(248, 250, 252);
      doc.rect(x + 1, y + cardHeight - 12, cardWidth - 2, 11, 'F');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('CREDENCIAL OFICIAL DE ACCESO Y ASISTENCIA', x + cardWidth / 2, y + cardHeight - 7, { align: 'center' });
      doc.text('AgroVista Co. - Trazabilidad y Gestión de Personal', x + cardWidth / 2, y + cardHeight - 3.5, { align: 'center' });

      const safeName = user.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Credencial_${safeName}.pdf`;
      const pdfBlob = doc.output('blob');

      await saveOrSharePdf(pdfBlob, filename, `Credencial de ${user.name}`);
      toast({ title: 'Credencial Descargada', description: `Se generó el carnet de ${user.name} en 1 hoja.` });
    } catch (err) {
      console.error('Error generating user card pdf:', err);
      toast({ title: 'Error', description: 'No se pudo generar la credencial en PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset();
    setIsPasswordDialogOpen(true);
  }

  const handleOpenDetails = (user: User) => {
    setDetailsUser(user);
    setDetailsPhone(user.phone || '');
    setIsEditingDetailsPhone(false);
    setIsDetailsDialogOpen(true);
  };

  const handleSaveDetailsPhone = async () => {
    if (!detailsUser) return;
    setIsSavingDetailsPhone(true);
    try {
      await updateUserProfile(detailsUser.id, { phone: detailsPhone.trim() });
      setDetailsUser(prev => prev ? { ...prev, phone: detailsPhone.trim() } : null);
      setIsEditingDetailsPhone(false);
      toast({
        title: "WhatsApp Guardado",
        description: `El teléfono de contacto de ${detailsUser.name} ha sido actualizado.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el número de teléfono.",
        variant: "destructive"
      });
    } finally {
      setIsSavingDetailsPhone(false);
    }
  };

  const handleOpenDetailsWhatsApp = () => {
    if (!detailsUser) return;
    const rawPhone = detailsPhone || detailsUser.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      setIsEditingDetailsPhone(true);
      toast({
        title: "Cargar WhatsApp",
        description: "Por favor carga primero el número de teléfono del colaborador.",
      });
      return;
    }
    const text = `Hola ${detailsUser.name}, te comparto los datos de tu credencial oficial de AgroVista.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  

  const handleScanSuccess = (decodedText: string) => {
    let scannedId = '';
    let scannedEmail = '';

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id) scannedId = parsed.id;
      if (parsed.email) scannedEmail = parsed.email;
    } catch {
      scannedId = decodedText.trim();
    }

    const matched = users.find(u => 
      u.id === scannedId || 
      (scannedEmail && u.email?.toLowerCase() === scannedEmail.toLowerCase())
    );

    if (matched) {
      setDetailsUser(matched);
      setIsDetailsDialogOpen(true);
      setIsQRScannerOpen(false);
      toast({
        title: "Usuario Reconocido",
        description: `Accediendo al perfil y auditoría de ${matched.name}.`,
      });
    } else {
      toast({
        title: "Código no reconocido",
        description: "El QR escaneado no corresponde a ningún usuario del establecimiento.",
        variant: "destructive"
      });
    }
  };

    const onPasswordSubmit = (values: z.infer<typeof PasswordSchema>) => {
    if(!selectedUser) return;

    startTransition(async () => {
      try {
        await updateUserPassword(selectedUser.id, values.newPassword);
        toast({
          title: "Contraseña Actualizada",
          description: `La contraseña para ${selectedUser.name} ha sido cambiada.`,
        });
        setIsPasswordDialogOpen(false);
        setSelectedUser(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la contraseña.",
          variant: "destructive",
        });
      }
    });
  }

  const onCreateSubmit = (values: z.infer<typeof CreateUserSchema>) => {
    startTransition(async () => {
      try {
        let targetEstablishmentId = currentUser.establishmentId;
        
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            role: values.role,
            password: values.password,
            dni: values.dni,
            phone: values.phone,
            producerId: currentUser.id,
            establishmentId: targetEstablishmentId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo crear el usuario');
        }

        toast({
          title: "Usuario Creado",
          description: `${values.name} ha sido agregado exitosamente. Su correo de acceso es: ${data.email}`,
        });

        if (logUserAction) {
          logUserAction(
            'Creación de Usuario',
            `Creó al usuario ${values.name} con rol de ${values.role}`,
            'staff'
          );
        }
        
        setIsCreateDialogOpen(false);
        createForm.reset();
        
      } catch (error: any) {
        toast({
          title: "Error al crear usuario",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Usuarios</h1>
            <p className="text-muted-foreground text-sm">Vea y gestione los usuarios del sistema.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <Button 
                onClick={() => setIsAttendanceScannerOpen(true)}
                className="w-full sm:w-auto h-10 gap-2 font-semibold justify-center text-sm shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                Control de Asistencia
                {attendanceLogs.filter(l => l.status === 'in_progress').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-emerald-900 text-white text-[10px] font-bold rounded-full">
                    {attendanceLogs.filter(l => l.status === 'in_progress').length}
                  </span>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsQRScannerOpen(true)}
                className="w-full sm:w-auto h-10 gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold justify-center text-sm shadow-xs"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                Escanear Credencial
              </Button>
              {canManageUsers && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="w-full sm:w-auto h-10 gap-2 font-semibold justify-center text-sm shadow-xs"
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    Agregar Empleado
                </Button>
              )}
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Usuarios</CardTitle>
          <CardDescription>Una lista de todas las cuentas de usuario en su organización.</CardDescription>
        </CardHeader>
                <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card shadow-xs"
            />
          </div>
        </div>
        <CardContent className="p-0 sm:p-6">
          
          {/* Vista en tarjetas (Móvil y Escritorio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-muted/20">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`mob-skel-${i}`} className="h-20 w-full rounded-xl" />
              ))}
              {!loading && filteredUsers.map((user) => (
                  <div 
                      key={`mob-${user.id}`} 
                      onClick={() => handleOpenDetails(user)} 
                      className="bg-card border border-border/60 rounded-xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                      <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                              <AvatarImage src={getRoleAvatar(user.role)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                              <h3 className="font-bold text-foreground text-base leading-tight">{user.name}</h3>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <Badge variant={user.role === 'Productor' ? 'default' : 'secondary'} className="text-[10px]">
                                      {user.role}
                                  </Badge>
                                  {establishmentData?.attendanceManagerId === user.id && (
                                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                          ✓ Control Tranquera
                                      </Badge>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                          {user.role !== 'Productor' && (
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                          <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={async () => {
                                          const isCurrent = establishmentData?.attendanceManagerId === user.id;
                                          await updateEstablishmentData({
                                              attendanceManagerId: isCurrent ? '' : user.id,
                                              attendanceManagerName: isCurrent ? '' : user.name
                                          });
                                          toast({
                                              title: isCurrent ? 'Responsabilidad Removida' : 'Responsable Designado',
                                              description: isCurrent 
                                                  ? `${user.name} ya no tiene acceso al control de asistencia.` 
                                                  : `${user.name} ahora tiene acceso para cargar asistencias en tranquera.`
                                          });
                                      }}>
                                          <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                          {establishmentData?.attendanceManagerId === user.id ? 'Quitar Control Asistencia' : 'Designar Control Asistencia'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleOpenPasswordDialog(user)}>
                                          <KeyRound className="mr-2 h-4 w-4" />
                                          Cambiar Contraseña
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          )}
                      </div>
                  </div>
              ))}
          </div>


        </CardContent>
      </Card>
      
      {/* Dialog for user details */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                  <DialogTitle className="text-center font-bold text-lg">Credencial y Ficha de Usuario</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    Detalles de la cuenta y registro auditable de acciones realizadas.
                  </DialogDescription>
              </DialogHeader>
              {detailsUser && (() => {
                const userEmailPrefix = detailsUser.email ? detailsUser.email.split('@')[0].toLowerCase() : '';
                const rawActions: { id: string; action: string; description: string; category: string; timestamp: string }[] = [];

                // 1. Audit Logs registrados directamente
                (auditLogs || []).forEach(log => {
                  if (!log) return;
                  const logUserLower = (log.userName || '').toLowerCase();
                  const logRoleLower = (log.userRole || '').toLowerCase();
                  const detailsNameLower = (detailsUser.name || '').toLowerCase();
                  const detailsRoleLower = (detailsUser.role || '').toLowerCase();
                  const detailsEmailLower = (detailsUser.email || '').toLowerCase();

                  const matches = 
                    (log.userId && detailsUser.id && log.userId === detailsUser.id) ||
                    (detailsNameLower && logUserLower.includes(detailsNameLower)) ||
                    (detailsEmailLower && logUserLower.includes(detailsEmailLower)) ||
                    (userEmailPrefix && logUserLower.includes(userEmailPrefix)) ||
                    (detailsRoleLower && logRoleLower === detailsRoleLower) ||
                    (detailsUser.role === 'Encargado' && (log.category === 'packaging' || log.category === 'cultural')) ||
                    (detailsUser.role === 'Ingeniero Agronomo' && log.category === 'agronomy');

                  if (matches) {
                    rawActions.push({
                      id: log.id,
                      action: log.action,
                      description: log.description,
                      category: log.category,
                      timestamp: log.timestamp
                    });
                  }
                });

                // 2. Operaciones reales registradas según el perfil
                if (detailsUser.role === 'Ingeniero Agronomo') {
                  (agronomistLogs || []).forEach(log => {
                    rawActions.push({
                      id: `agr_${log.id}`,
                      action: 'Labor Agronómica',
                      description: `Registró ${log.type}${log.product ? ` (${log.product})` : ''} en Lote ${log.batchId}`,
                      category: 'agronomy',
                      timestamp: log.date
                    });
                  });
                  (phenologyLogs || []).forEach(log => {
                    rawActions.push({
                      id: `pheno_${log.id}`,
                      action: 'Monitoreo Fenológico',
                      description: `Registró etapa ${log.stage} en Lote ${log.batchId}`,
                      category: 'agronomy',
                      timestamp: log.date
                    });
                  });
                  (diagnosisLogs || []).forEach(log => {
                    rawActions.push({
                      id: `diag_${log.id}`,
                      action: 'Diagnóstico de Cultivo',
                      description: log.diagnosisResult || log.aiRecommendation?.substring(0, 60) || 'Análisis fitosanitario del cultivo',
                      category: 'agronomy',
                      timestamp: log.date
                    });
                  });
                } else if (detailsUser.role === 'Encargado') {
                  (packagingLogs || []).forEach(log => {
                    rawActions.push({
                      id: `pack_${log.id}`,
                      action: 'Registro de Embalaje',
                      description: `Cargó ${log.kilogramsPackaged} kg para ${log.packerName}`,
                      category: 'packaging',
                      timestamp: log.date
                    });
                  });
                  (culturalPracticeLogs || []).forEach(log => {
                    rawActions.push({
                      id: `cult_${log.id}`,
                      action: 'Labor Cultural',
                      description: `Registró labor de ${log.practiceType} para ${log.personnelName}`,
                      category: 'cultural',
                      timestamp: log.date
                    });
                  });
                  (harvests || []).slice(0, 10).forEach(h => {
                    rawActions.push({
                      id: `harv_${h.id}`,
                      action: 'Supervisión de Cosecha',
                      description: `Supervisó pesada de ${h.kilograms} kg (${h.collector?.name || 'Recolector'}, Lote ${h.batchNumber})`,
                      category: 'harvest',
                      timestamp: h.date
                    });
                  });
                }

                // 3. Tareas vinculadas (creadas o asignadas)
                (tasks || []).forEach(t => {
                  const isAssigned = (t.assignedTo?.id && detailsUser.id && t.assignedTo.id === detailsUser.id) ||
                    (t.assignedTo?.name && detailsUser.name && t.assignedTo.name.toLowerCase() === detailsUser.name.toLowerCase());
                  const isCreator = (t.createdBy?.id && detailsUser.id && t.createdBy.id === detailsUser.id) ||
                    (t.createdBy?.name && detailsUser.name && t.createdBy.name.toLowerCase() === detailsUser.name.toLowerCase());
                  
                  if (isAssigned || isCreator) {
                    rawActions.push({
                      id: `task_${t.id}_${t.status}`,
                      action: t.status === 'completed' ? 'Tarea Completada' : isCreator ? 'Creación de Tarea' : 'Tarea Asignada',
                      description: `${t.title} (${t.status === 'completed' ? 'Finalizada' : t.status === 'in-progress' ? 'En Progreso' : 'Pendiente'})`,
                      category: 'general',
                      timestamp: t.createdAt || new Date().toISOString()
                    });
                  }
                });

                // Deduplicar y ordenar cronológicamente
                const seenKeys = new Set<string>();
                const userActions = rawActions.filter(act => {
                  const key = `${act.action}_${act.description}`;
                  if (seenKeys.has(key)) return false;
                  seenKeys.add(key);
                  return true;
                }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

                return (
                  <div className="flex flex-col items-center gap-4 py-2">
                      <div className="flex flex-col sm:flex-row items-center gap-5 w-full bg-muted/20 p-4 rounded-xl border">
                          <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md shrink-0">
                              <AvatarImage src={getRoleAvatar(detailsUser.role)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">{detailsUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="text-center sm:text-left flex-1 min-w-0">
                              <div className="flex items-center justify-center sm:justify-start gap-2">
                                <h3 className="font-bold text-xl text-foreground truncate">{detailsUser.name}</h3>
                                <Badge variant={detailsUser.role === 'Productor' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                                    {detailsUser.role}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs truncate mt-0.5">{detailsUser.email || 'Sin correo registrado'}</p>
                              {detailsUser.dni && (
                                <p className="text-muted-foreground text-xs">DNI: <span className="font-mono font-medium text-foreground">{detailsUser.dni}</span></p>
                              )}
                              {detailsUser.phone && (
                                <p className="text-muted-foreground text-xs">Teléfono: <span className="font-medium text-foreground">{detailsUser.phone}</span></p>
                              )}
                          </div>
                          <div className="flex flex-col items-center bg-white p-2 rounded-xl border border-border shadow-xs shrink-0" ref={qrCodeSvgRef}>
                              <QRCode
                                value={buildDynamicUserQRPayload(detailsUser)}
                                size={90}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox="0 0 256 256"
                              />
                              <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-emerald-600 font-semibold">
                                <ShieldCheck className="h-3 w-3" />
                                <span>QR DINÁMICO (60s)</span>
                              </div>
                          </div>
                      </div>

                      {/* Carga y Gestión de WhatsApp (reemplaza descarga PDF) */}
                      <div className="w-full p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                            WhatsApp / Teléfono:
                          </span>
                          {!isEditingDetailsPhone ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingDetailsPhone(true)}
                              className="h-6 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              {detailsPhone ? 'Editar número' : '+ Cargar número'}
                            </Button>
                          ) : null}
                        </div>

                        {isEditingDetailsPhone ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="tel"
                              placeholder="Ej: +54 9 11 1234 5678"
                              value={detailsPhone}
                              onChange={(e) => setDetailsPhone(e.target.value)}
                              className="flex-1 h-8 text-xs px-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveDetailsPhone}
                              disabled={isSavingDetailsPhone}
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              {isSavingDetailsPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetailsPhone(detailsUser?.phone || '');
                                setIsEditingDetailsPhone(false);
                              }}
                              className="h-8 px-2 text-xs"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-muted-foreground truncate">
                              {detailsPhone ? detailsPhone : <span className="italic text-muted-foreground/60">Sin WhatsApp cargado</span>}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleOpenDetailsWhatsApp}
                              className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Contactar por WhatsApp
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Estado de Asistencia en Tiempo Real */}
                      {(() => {
                        const currentAttendance = attendanceLogs.find(l => 
                          l.status === 'in_progress' && 
                          ((detailsUser.id && l.personnelId === detailsUser.id) ||
                           (detailsUser.dni && l.dni && l.dni === detailsUser.dni) ||
                           (l.personnelName.trim().toLowerCase() === detailsUser.name.trim().toLowerCase()))
                        );

                        const totalAttendanceLogs = attendanceLogs.filter(l =>
                          ((detailsUser.id && l.personnelId === detailsUser.id) ||
                           (detailsUser.dni && l.dni && l.dni === detailsUser.dni) ||
                           (l.personnelName.trim().toLowerCase() === detailsUser.name.trim().toLowerCase()))
                        );

                        return (
                          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {currentAttendance ? (
                                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                        <div>
                                          <p className="font-bold">Presente en la quinta</p>
                                          <p className="text-[10px] opacity-80">Ingreso: {format(new Date(currentAttendance.checkIn), 'HH:mm')} hs</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] bg-emerald-100 dark:bg-emerald-900 border-emerald-300">En curso</Badge>
                                </div>
                              ) : (
                                <div className="bg-muted/30 border p-2.5 rounded-xl flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-stone-300 shrink-0" />
                                        <div>
                                          <p className="font-bold text-foreground">Fuera de la quinta</p>
                                          <p className="text-[10px]">Sin ingreso activo en la jornada</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px]">Inactivo</Badge>
                                </div>
                              )}

                              <div className="bg-muted/20 border p-2.5 rounded-xl flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-foreground">Asistencias registradas</p>
                                    <p className="text-[10px] text-muted-foreground">Total de jornadas en finca</p>
                                  </div>
                                  <span className="text-sm font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                                    {totalAttendanceLogs.length}
                                  </span>
                              </div>
                          </div>
                        );
                      })()}

                      {detailsUser.lastLoginAt && (
                          <div className="bg-muted/40 border p-2.5 rounded-lg w-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              <span>Última conexión activa: <strong className="text-foreground">{formatDistanceToNow(new Date(detailsUser.lastLoginAt), { addSuffix: true, locale: es })}</strong></span>
                          </div>
                      )}

                      {/* Historial de Auditoría: Últimas 10 acciones realizadas */}
                      <div className="w-full mt-1 space-y-2.5">
                          <div className="flex items-center justify-between border-b pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <History className="h-4 w-4 text-primary" /> Últimas 10 Acciones Realizadas
                              </h4>
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                {userActions.length} registradas
                              </span>
                          </div>

                          {userActions.length === 0 ? (
                              <div className="text-center py-6 px-4 border border-dashed rounded-xl bg-muted/10 text-muted-foreground space-y-1">
                                  <Activity className="h-6 w-6 mx-auto opacity-40 mb-1" />
                                  <p className="text-xs font-medium">Sin acciones registradas recientemente</p>
                                  <p className="text-[11px] text-muted-foreground/80">Cuando el usuario registre cosechas, embalajes, labores o gestione cuadrillas, aparecerán aquí.</p>
                              </div>
                          ) : (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {userActions.map((act) => {
                                    const getActionBadge = () => {
                                      switch(act.category) {
                                        case 'harvest':
                                          return <span className="p-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Sprout className="h-3.5 w-3.5" /></span>;
                                        case 'packaging':
                                          return <span className="p-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Package className="h-3.5 w-3.5" /></span>;
                                        case 'cultural':
                                          return <span className="p-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Scissors className="h-3.5 w-3.5" /></span>;
                                        case 'agronomy':
                                          return <span className="p-1 rounded-md bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300"><Sprout className="h-3.5 w-3.5" /></span>;
                                        case 'staff':
                                          return <span className="p-1 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><UserX className="h-3.5 w-3.5" /></span>;
                                        default:
                                          return <span className="p-1 rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"><Activity className="h-3.5 w-3.5" /></span>;
                                      }
                                    };

                                    return (
                                      <div key={act.id} className="flex items-start gap-2.5 p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors text-xs">
                                        <div className="shrink-0 mt-0.5">{getActionBadge()}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-foreground truncate">{act.action}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                                              {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: es })}
                                            </span>
                                          </div>
                                          <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">{act.description}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
                );
              })()}
          </DialogContent>
      </Dialog>

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleScanSuccess}
        title="Escanear Credencial de Usuario"
        description="Apunte la cámara a la credencial digital de un usuario para consultar su perfil y últimas 10 actividades registradas."
      />

      {/* Dialog for password change */}
       <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cambiar Contraseña para {selectedUser?.name}</DialogTitle>
                <DialogDescription>
                    Ingrese una nueva contraseña para la cuenta de este usuario.
                </DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                     <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nueva Contraseña</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirmar Nueva Contraseña</FormLabel>
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
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Guardando..." : "Guardar Contraseña"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating staff / producer */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Agregar Nuevo Empleado</DialogTitle>
                <DialogDescription>
                    Crea una cuenta para que un Ingeniero o Encargado acceda a tu establecimiento.
                </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                     <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder={selectedRole === 'Productor' ? "Ej. Juan - Productor 03" : "Ej. Juan Pérez"} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={createForm.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rol de Usuario</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un rol" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Encargado">Encargado</SelectItem>
                                        <SelectItem value="Ingeniero Agronomo">Ingeniero Agrónomo</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contraseña (Mínimo 6 caracteres)</FormLabel>
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
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creando..." : "Crear Cuenta"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      <AttendanceScannerDialog
        isOpen={isAttendanceScannerOpen}
        onOpenChange={setIsAttendanceScannerOpen}
      />
    </>
  );
}