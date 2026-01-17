
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
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';


const LoginSchema = z.object({
  email: z.string().email("Por favor ingrese un correo válido."),
  password: z.string().min(1, "La contraseña es requerida."),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { isClient, currentUser, loading, setCurrentUser } = useContext(AppDataContext);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    if (isClient && currentUser) {
      router.replace('/dashboard');
    }
  }, [isClient, currentUser, router]);

  const onSubmit = async (values: LoginFormValues) => {
    startTransition(async () => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentUser(result.user, values.rememberMe);
        toast({
            title: `¡Bienvenido de nuevo, ${result.user.name}!`,
            description: "Ha iniciado sesión correctamente.",
        });
        router.push('/dashboard');
      } else {
        form.setError("root", { message: "Correo electrónico o contraseña incorrectos."});
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo.png" alt="AgroVision Logo" width={64} height={64} />
          </div>
          <CardTitle className="text-2xl font-headline">Bienvenido a AgroVision</CardTitle>
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
                    <FormControl><Input type="email" placeholder="ejemplo@agrovision.co" {...field} disabled={isPending} /></FormControl>
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
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
