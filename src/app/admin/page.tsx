'use client';

import React, { useContext, useState } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Building, ShieldCheck, ShieldAlert, Power, PowerOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const { currentUser, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  
  // En una app real, esto vendría del servidor. 
  // Para la demo local, simulamos una lista de establecimientos donde incluimos el actual
  const [establishments, setEstablishments] = useState([
    {
      id: establishmentData?.id || 'est-1',
      name: establishmentData?.producer || 'Finca Las Fresas',
      manager: establishmentData?.technicalManager || 'Ing. Agr. Juan Pérez',
      location: establishmentData?.location?.locality || 'Coronda',
      isActive: establishmentData?.isActive ?? true,
      hasGoodPracticesSeal: establishmentData?.hasGoodPracticesSeal ?? false,
    },
    {
      id: 'est-2',
      name: 'Agricola San Martín',
      manager: 'Ing. Carlos Gómez',
      location: 'Desvío Arijón',
      isActive: true,
      hasGoodPracticesSeal: false,
    }
  ]);

  const toggleGoodPractices = (id: string, currentValue: boolean) => {
    setEstablishments(prev => prev.map(est => 
      est.id === id ? { ...est, hasGoodPracticesSeal: !currentValue } : est
    ));
    toast({
      title: !currentValue ? "Sello Otorgado" : "Sello Revocado",
      description: `Se ha ${!currentValue ? 'aprobado' : 'retirado'} el Sello de Buenas Prácticas Agrícolas.`,
    });
  };

  const toggleActiveStatus = (id: string, currentValue: boolean) => {
    setEstablishments(prev => prev.map(est => 
      est.id === id ? { ...est, isActive: !currentValue } : est
    ));
    toast({
      title: !currentValue ? "Establecimiento Habilitado" : "Establecimiento Suspendido",
      description: `El acceso a la plataforma ha sido ${!currentValue ? 'restaurado' : 'bloqueado'}.`,
      variant: currentValue ? 'destructive' : 'default',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-stone-900">Panel de Control</h1>
          <p className="text-stone-500">Gestión global de establecimientos AgroVista</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-[#2d4a22]" />
            Establecimientos Registrados
          </CardTitle>
          <CardDescription>Administra los accesos y certificaciones de los clientes de AgroVista.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Establecimiento</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Encargado / Técnico</TableHead>
                  <TableHead className="text-center">Sello BPA</TableHead>
                  <TableHead className="text-center">Estado de Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {establishments.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-medium">{est.name}</TableCell>
                    <TableCell>{est.location}</TableCell>
                    <TableCell>{est.manager}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant={est.hasGoodPracticesSeal ? "default" : "outline"} className={est.hasGoodPracticesSeal ? "bg-green-600 hover:bg-green-700" : ""}>
                          {est.hasGoodPracticesSeal ? <ShieldCheck className="h-3 w-3 mr-1"/> : <ShieldAlert className="h-3 w-3 mr-1"/>}
                          {est.hasGoodPracticesSeal ? 'Certificado' : 'Sin Sello'}
                        </Badge>
                        <Switch 
                          checked={est.hasGoodPracticesSeal}
                          onCheckedChange={() => toggleGoodPractices(est.id, est.hasGoodPracticesSeal)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-2">
                         <Badge variant={est.isActive ? "default" : "destructive"} className={est.isActive ? "bg-[#2d4a22] hover:bg-[#1a2d13]" : ""}>
                          {est.isActive ? <Power className="h-3 w-3 mr-1"/> : <PowerOff className="h-3 w-3 mr-1"/>}
                          {est.isActive ? 'Habilitado' : 'Suspendido'}
                        </Badge>
                        <Switch 
                          checked={est.isActive}
                          onCheckedChange={() => toggleActiveStatus(est.id, est.isActive)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
