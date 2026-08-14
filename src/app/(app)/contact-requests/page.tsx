'use client';

import { useState, useContext } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  Clock,
  Trash2,
  ExternalLink,
  Filter,
  Inbox,
  Sparkles,
} from 'lucide-react';
import type { ContactRequest, ContactRequestStatus } from '@/lib/types';

export default function ContactRequestsPage() {
  const { contactRequests, updateContactRequestStatus, deleteContactRequest } = useContext(AppDataContext);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);

  const filteredRequests = contactRequests.filter(req => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.phone && req.phone.includes(searchTerm)) ||
      (req.location && req.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesRole = roleFilter === 'all' || req.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: ContactRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 gap-1">
            <Clock className="w-3 h-3" />
            <span>Pendiente</span>
          </Badge>
        );
      case 'contacted':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>En Gestión</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 gap-1">
            <UserCheck className="w-3 h-3" />
            <span>Completado</span>
          </Badge>
        );
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: ContactRequestStatus) => {
    try {
      await updateContactRequestStatus(requestId, newStatus);
      toast({
        title: 'Estado actualizado',
        description: `La solicitud ahora está marcada como ${newStatus === 'pending' ? 'Pendiente' : newStatus === 'contacted' ? 'En Gestión' : 'Completado'}.`,
      });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      await deleteContactRequest(requestId);
      toast({
        title: 'Solicitud eliminada',
        description: 'Se ha eliminado el registro de la solicitud.',
      });
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la solicitud.',
        variant: 'destructive',
      });
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
      <PageHeader
        title="Solicitudes de Contacto y Demos"
        description="Gestión de solicitudes de productores y clientes potenciales recibidas desde la página de inicio."
      />

      {/* KPI Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">Total Recibidas</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{contactRequests.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
              <Inbox className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {contactRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">En Gestión</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {contactRequests.filter(r => r.status === 'contacted').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">Productores</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {contactRequests.filter(r => r.role === 'Productor de Frutillas').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Buscar por nombre, email, teléfono o ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-stone-200 dark:border-stone-800"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] rounded-xl border-stone-200 dark:border-stone-800">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="contacted">En Gestión</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[170px] rounded-xl border-stone-200 dark:border-stone-800">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los perfiles</SelectItem>
                  <SelectItem value="Productor de Frutillas">Productores de Frutilla</SelectItem>
                  <SelectItem value="Agrónomo / Asesor Técnico">Agrónomos</SelectItem>
                  <SelectItem value="Empaque / Comercializadora">Empaques</SelectItem>
                  <SelectItem value="Otro">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Listing */}
      {filteredRequests.length === 0 ? (
        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-center py-12">
          <CardContent className="space-y-3">
            <Inbox className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">No hay solicitudes registradas</h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              Cuando los usuarios hagan clic en &quot;Comenzar Ahora&quot; en la página de inicio, sus datos aparecerán aquí en tiempo real.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-green-400 dark:hover:border-green-700 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between"
              onClick={() => setSelectedRequest(req)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{req.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{req.location || 'Coronda, Santa Fe'}</span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 flex-1">
                <div className="inline-block px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 text-xs font-semibold">
                  {req.role}
                </div>

                <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{req.email}</span>
                  </div>
                  {req.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{req.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-stone-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{format(new Date(req.createdAt), 'dd MMMM, yyyy - HH:mm', { locale: es })}</span>
                  </div>
                </div>

                {req.message && (
                  <p className="text-xs text-stone-600 dark:text-stone-400 italic line-clamp-2 bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg border border-stone-100 dark:border-stone-800">
                    &quot;{req.message}&quot;
                  </p>
                )}
              </CardContent>

              <div className="p-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2 bg-stone-50/50 dark:bg-stone-900/50 rounded-b-xl">
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-lg border-stone-200 dark:border-stone-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:${req.email}?subject=Respuesta a tu consulta en AgroVista`, '_blank');
                    }}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Email
                  </Button>
                  {req.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsApp(req.phone, req.name);
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      WhatsApp
                    </Button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(req.id);
                  }}
                  title="Eliminar registro"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Request Detail Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => if (!open) setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-[550px] border-none bg-white dark:bg-stone-900 shadow-2xl p-6 rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-xl font-bold font-headline text-stone-900 dark:text-stone-100">
                  Ficha de Solicitud
                </DialogTitle>
                {getStatusBadge(selectedRequest.status)}
              </div>
              <DialogDescription className="text-xs text-stone-500">
                Recibida el {format(new Date(selectedRequest.createdAt), 'PPPP - HH:mm', { locale: es })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-stone-400 uppercase font-semibold">Nombre del Interesado</span>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-base">{selectedRequest.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-stone-400 uppercase font-semibold">Perfil / Rol</span>
                    <p className="font-semibold text-green-700 dark:text-green-400">{selectedRequest.role}</p>
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 uppercase font-semibold">Ubicación</span>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{selectedRequest.location || 'Coronda, Santa Fe'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                  <div>
                    <span className="text-xs text-stone-400 uppercase font-semibold">Correo Electrónico</span>
                    <p className="font-medium text-stone-800 dark:text-stone-200 truncate">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 uppercase font-semibold">Teléfono / WhatsApp</span>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{selectedRequest.phone || 'No indicado'}</p>
                  </div>
                </div>

                {selectedRequest.message && (
                  <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                    <span className="text-xs text-stone-400 uppercase font-semibold">Mensaje / Consulta</span>
                    <p className="text-stone-700 dark:text-stone-300 mt-1 whitespace-pre-wrap bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
                      {selectedRequest.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Manager */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Cambiar Estado de Gestión</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'pending' ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl text-xs ${selectedRequest.status === 'pending' ? 'bg-amber-600 hover:bg-amber-500 text-white' : ''}`}
                    onClick={() => handleStatusChange(selectedRequest.id, 'pending')}
                  >
                    Pendiente
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'contacted' ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl text-xs ${selectedRequest.status === 'contacted' ? 'bg-blue-600 hover:bg-blue-500 text-white' : ''}`}
                    onClick={() => handleStatusChange(selectedRequest.id, 'contacted')}
                  >
                    En Gestión
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'completed' ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl text-xs ${selectedRequest.status === 'completed' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}
                    onClick={() => handleStatusChange(selectedRequest.id, 'completed')}
                  >
                    Completado
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl gap-2 font-bold"
                  onClick={() => window.open(`mailto:${selectedRequest.email}?subject=Respuesta a tu consulta en AgroVista`, '_blank')}
                >
                  <Mail className="w-4 h-4" />
                  Enviar Email
                </Button>
                {selectedRequest.phone && (
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 font-bold"
                    onClick={() => openWhatsApp(selectedRequest.phone, selectedRequest.name)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
