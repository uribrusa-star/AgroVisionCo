
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useTransition, useContext, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';


const LoginSchema = z.object({
  email: z.string().email("Por favor ingrese un correo válido."),
  password: z.string().min(1, "La contraseña es requerida."),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { isClient, currentUser, loading, setCurrentUser, users } = useContext(AppDataContext);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    if (isClient && currentUser) {
      if (currentUser.role === 'SuperAdmin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isClient, currentUser, router]);

  const onSubmit = async (values: LoginFormValues) => {
    startTransition(async () => {
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values }),
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.firebaseToken) {
            try {
              await signInWithCustomToken(auth, result.firebaseToken);
            } catch (firebaseAuthError) {
              console.error("Error autenticando cliente Firebase:", firebaseAuthError);
            }
          }

          setCurrentUser(result.user, values.rememberMe);
          toast({
              title: `¡Bienvenido de nuevo, ${result.user.name}!`,
              description: "Ha iniciado sesión correctamente.",
          });
          if (result.user.role === 'SuperAdmin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          form.setError("root", { message: errorData.error || "Correo electrónico o contraseña incorrectos."});
        }
      } catch (error) {
        // Handle offline login fallback (using local users state)
        const offlineUser = users?.find(u => u.email?.toLowerCase() === values.email?.toLowerCase());
        if (offlineUser && offlineUser.password === values.password) {
            setCurrentUser(offlineUser, values.rememberMe);
            toast({
                title: "Modo sin conexión",
                description: "Sesión iniciada localmente. Los datos se sincronizarán al conectarse.",
            });
            if (offlineUser.role === 'SuperAdmin') {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
        } else {
            form.setError("root", { message: "Error de red: Revise su conexión o asegúrese de que el usuario exista en el sistema offline."});
        }
      }
    });
  };

  if (!isClient || currentUser || loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando aplicación...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg border-stone-200 dark:border-stone-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo.png" alt="AgroVista Logo" width={64} height={64} />
          </div>
          <CardTitle className="text-2xl font-headline">Bienvenido a AgroVista</CardTitle>
          <CardDescription>Ingrese sus credenciales para acceder a su panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTitle>Error de inicio de sesión</AlertTitle>
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl><Input type="email" placeholder="ejemplo@agrovista.co" {...field} disabled={isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Recordarme
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Leyenda de Seguridad */}
      <div className="mt-4 max-w-sm flex items-center justify-center gap-1.5 text-center text-xs text-stone-500 dark:text-stone-400 px-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Conexión cifrada de grado bancario (SSL/TLS 1.3). Sus datos están 100% protegidos.</span>
      </div>
    </div>
  );
}
