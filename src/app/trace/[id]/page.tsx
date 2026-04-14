'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, Sprout, User, CheckCircle, Info, Truck, Package, Leaf, TestTube2, Droplet, AlertCircle, Home, Flower, Grape, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

type TraceabilityData = {
    harvestDate: string;
    batchId: string;
    collectorName: string;
    phenologyLogs: {
        date: string;
        developmentState: string;
        flowerCount?: number;
        fruitCount?: number;
        notes: string;
        images?: { url: string; hint?: string }[];
    }[];
}

const phenologyIcons: { [key: string]: React.ElementType } = {
    'Floración': Flower,
    'Fructificación': Grape,
    'Maduración': Sun,
    'Desarrollo foliar': Leaf,
    'Fase de fruto verde': Sprout,
    'Cambio de color (Vire)': Sun,
};

export default function TracePage() {
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<TraceabilityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedLogInfo, setSelectedLogInfo] = useState<{ state: string; date: string } | null>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            setError(null);
            fetch(`/api/trace?id=${id}`)
                .then(async res => {
                    const result = await res.json();
                    if (!res.ok) {
                        setError(result.error || `Error: ${res.status}`);
                    } else {
                        setData(result);
                    }
                })
                .catch(err => {
                    console.error("Network or parsing error:", err);
                    setError("No se pudo conectar con el servidor para verificar el código.");
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-2xl space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            Error al Cargar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p>{error}</p>
                        <Button asChild variant="link" className="mt-4">
                            <Link href="/">Volver a la página principal</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <AlertCircle className="h-8 w-8" />
                            No Encontrado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p>No se encontró información para el código de trazabilidad proporcionado.</p>
                         <Button asChild variant="link" className="mt-4">
                            <Link href="/">Volver a la página principal</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 md:p-8">
            <header className="text-center mb-8">
                <div className="inline-block p-4 bg-white rounded-full shadow-md mb-4">
                   <Image src="/logo.png" alt="AgroVision Logo" width={64} height={64} />
                </div>
                <h1 className="text-4xl font-bold text-gray-800 font-headline">Historia de tu Frutilla</h1>
                <p className="text-lg text-gray-600 mt-2">Verificado por AgroVision</p>
            </header>

            <main className="max-w-4xl mx-auto space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-primary">
                            <Sprout /> Resumen del Cultivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                            <Calendar className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-sm text-gray-500">Fecha de Cosecha</p>
                                <p className="font-bold text-lg">{new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                            <Home className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-500">Lote de Origen</p>
                                <p className="font-bold text-lg">{data.batchId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                            <User className="h-8 w-8 text-yellow-600" />
                            <div>
                                <p className="text-sm text-gray-500">Recolector</p>
                                <p className="font-bold text-lg">{data.collectorName}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-primary">
                            <Truck /> Cadena de Trazabilidad
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ul className="space-y-4">
                            <li className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <Sprout className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold">Cosecha en Campo</p>
                                    <p className="text-sm text-gray-500">El producto fue recolectado cuidadosamente a mano.</p>
                                </div>
                            </li>
                             <li className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold">Empaque y Control de Calidad</p>
                                    <p className="text-sm text-gray-500">Se seleccionó la mejor fruta y se empacó para su frescura.</p>
                                </div>
                            </li>
                             <li className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold">Distribución</p>
                                    <p className="text-sm text-gray-500">El producto fue transportado manteniendo la cadena de frío.</p>
                                </div>
                            </li>
                       </ul>
                    </CardContent>
                </Card>
                
                 {data.phenologyLogs && data.phenologyLogs.length > 0 && (
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl text-primary">
                                <Leaf /> Historial de Fenología del Lote
                            </CardTitle>
                             <CardDescription>
                                Evolución del estado de desarrollo del cultivo en el lote de origen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {data.phenologyLogs.map((log, index) => {
                                    const Icon = phenologyIcons[log.developmentState] || Info;
                                    return (
                                        <li key={index} className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm text-primary">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="font-bold text-lg text-primary">{log.developmentState}</p>
                                                    <p className="text-xs text-gray-400">{new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                                
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {log.notes}
                                                </p>
                                                
                                                {(log.flowerCount && log.flowerCount > 0) || (log.fruitCount && log.fruitCount > 0) ? (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {log.flowerCount && log.flowerCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-100">
                                                                <Flower className="h-3 w-3" />
                                                                {log.flowerCount} Flores
                                                            </span>
                                                        ) : null}
                                                        {log.fruitCount && log.fruitCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">
                                                                <Grape className="h-3 w-3" />
                                                                {log.fruitCount} Frutos
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}

                                                {log.images && log.images.length > 0 && (
                                                    <div className={`mt-3 grid gap-2 ${log.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                                        {log.images.map((img, imgIdx) => (
                                                            <motion.div 
                                                                key={imgIdx}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                className="relative aspect-square rounded-xl overflow-hidden border shadow-sm cursor-zoom-in group"
                                                                onClick={() => {
                                                                    setSelectedImage(img.url);
                                                                    setSelectedLogInfo({ 
                                                                        state: log.developmentState, 
                                                                        date: new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) 
                                                                    });
                                                                }}
                                                            >
                                                                <Image 
                                                                    src={img.url} 
                                                                    alt={`${log.developmentState} - ${imgIdx + 1}`} 
                                                                    fill 
                                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 p-2 rounded-full shadow-lg">
                                                                        <Info className="h-4 w-4 text-primary" />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                 <Card className="shadow-lg bg-green-100 border-green-200">
                    <CardHeader className="text-center">
                         <CardTitle className="flex items-center justify-center gap-2 text-green-800">
                             <CheckCircle className="h-6 w-6" /> ¡Calidad Garantizada!
                        </CardTitle>
                        <CardDescription className="text-green-700">
                            Este producto fue cultivado siguiendo buenas prácticas agrícolas para asegurar su calidad y frescura.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
            <footer className="text-center mt-12">
                <p className="text-sm text-gray-500">ID de Trazabilidad: <span className="font-mono">{id}</span></p>
                <p className="text-xs text-gray-400 mt-1">Impulsado por AgroVision</p>
            </footer>

            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl">
                    <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent text-white opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {selectedLogInfo?.state}
                            <span className="text-sm font-normal opacity-80">— {selectedLogInfo?.date}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-[80vh] flex items-center justify-center p-2 sm:p-4">
                        <AnimatePresence mode="wait">
                            {selectedImage && (
                                <motion.div
                                    key={selectedImage}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                    className="relative w-full h-full flex items-center justify-center"
                                >
                                    <Image
                                        src={selectedImage}
                                        alt="Imagen ampliada"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
