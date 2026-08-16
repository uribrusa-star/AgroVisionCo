'use client';

import { useState, useContext } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ContactModalProps {
  children?: React.ReactNode;
  buttonText?: string;
  buttonSize?: 'default' | 'sm' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonClassName?: string;
}

export function ContactModal({
  children,
  buttonText = 'Comenzar Ahora',
  buttonSize = 'lg',
  buttonVariant = 'default',
  buttonClassName = '',
}: ContactModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { addContactRequest } = useContext(AppDataContext);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Productor de Frutillas',
    location: 'Coronda, Santa Fe',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, ingresa tu nombre y correo electrónico.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar la solicitud');
      }

      setSubmitted(true);
      toast({
        title: '¡Solicitud Registrada!',
        description: 'Tu solicitud ha sido guardada en la plataforma con éxito.',
      });
    } catch (error: any) {
      toast({
        title: 'Error de envío',
        description: error.message || 'No se pudo registrar la solicitud. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Productor de Frutillas',
      location: 'Coronda, Santa Fe',
      message: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) handleReset(); }}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            size={buttonSize}
            variant={buttonVariant}
            className={buttonClassName}
          >
            {buttonText}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-[92%] sm:max-w-[460px] max-h-[88vh] overflow-y-auto border-none bg-white dark:bg-stone-900 shadow-2xl p-4 sm:p-6 rounded-2xl"
      >
        {!submitted ? (
          <>
            <DialogHeader className="space-y-1 text-left sm:text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 text-[11px] font-semibold w-fit">
                <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span>Solicitud / Demo</span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold font-headline text-stone-900 dark:text-stone-100 leading-tight">
                Comenzar con AgroVista
              </DialogTitle>
              <DialogDescription className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
                Déjanos tus datos para coordinar una prueba personalizada de tus lotes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-2.5 mt-2">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                  Nombre y Apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ej. Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border-stone-200 dark:border-stone-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border-stone-200 dark:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Teléfono / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 9 342 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border-stone-200 dark:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="role" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Perfil / Actividad <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border-stone-200 dark:border-stone-800">
                      <SelectValue placeholder="Perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Productor de Frutillas">Productor de Frutillas</SelectItem>
                      <SelectItem value="Agrónomo / Asesor Técnico">Agrónomo / Asesor Técnico</SelectItem>
                      <SelectItem value="Empaque / Comercializadora">Empaque / Comercializadora</SelectItem>
                      <SelectItem value="Estudiante / Investigador">Estudiante / Investigador</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="location" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Ciudad / Localidad
                  </Label>
                  <Input
                    id="location"
                    placeholder="Ej. Coronda, Santa Fe"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border-stone-200 dark:border-stone-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="message" className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                  Mensaje / Consulta (Opcional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="¿Cuántas hectáreas o lotes manejas?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={2}
                  className="rounded-lg border-stone-200 dark:border-stone-800 resize-none text-base sm:text-xs p-2"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Enviar Solicitud</span>
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-center text-stone-500 dark:text-stone-400 mt-1.5">
                  Tus datos serán enviados confidencialmente a <span className="font-semibold text-stone-700 dark:text-stone-300">contactoagrovisionco@gmail.com</span>
                </p>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-stone-900 dark:text-stone-100">
              ¡Solicitud Enviada con Éxito!
            </h3>
            <p className="text-stone-600 dark:text-stone-300 text-sm max-w-sm mx-auto leading-relaxed">
              Gracias, <strong>{formData.name}</strong>. Hemos registrado tus datos y enviado la solicitud a nuestro correo <strong>contactoagrovisionco@gmail.com</strong>.
            </p>
            <div className="pt-4">
              <Button
                onClick={() => setOpen(false)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-2.5 rounded-full shadow-md"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
