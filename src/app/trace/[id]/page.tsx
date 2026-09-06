'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, Sprout, User, CheckCircle, Info, Truck, Package, Leaf, TestTube2, Droplet, AlertCircle, Home, Flower, Grape, Sun, ShieldCheck, Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

type TraceabilityData = {
    establishmentName?: string;
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
    bpaCertified?: boolean;
    bpaDetails?: {
        phiCompliant?: boolean;
        zeroResiduesGuaranteed?: boolean;
        waterQualityInspected?: boolean;
        mipPracticesCount?: number;
        sanitaryControlsCount?: number;
        harvestHygieneVerified?: boolean;
    };
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
    const [showBpaModal, setShowBpaModal] = useState(false);
    const [showEstablishmentModal, setShowEstablishmentModal] = useState(false);
    const [activeEstablishmentImg, setActiveEstablishmentImg] = useState<number>(0);

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
                   <Image src="/logo.png" alt="AgroVista Logo" width={64} height={64} />
                </div>
                <h1 className="text-4xl font-bold text-gray-800 font-headline">Historia de tu Frutilla</h1>
                <p className="text-lg text-gray-600 mt-2">Verificado por AgroVista</p>
            </header>

            <main className="max-w-4xl mx-auto space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-primary">
                            <Sprout /> Resumen del Cultivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-green-50 rounded-xl border border-green-100">
                            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">Fecha de Cosecha</p>
                                <p className="font-bold text-xs sm:text-base md:text-lg text-gray-800 leading-snug">{new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>

                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowEstablishmentModal(true)}
                            className="flex items-center gap-3 p-3.5 sm:p-4 bg-purple-50 hover:bg-purple-100/80 rounded-xl border border-purple-200/60 shadow-sm hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                        >
                            <div className="p-2 sm:p-2.5 rounded-lg bg-purple-500/10 text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Home className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[11px] sm:text-xs text-purple-700 font-bold uppercase tracking-wider flex items-center gap-1">
                                        Establecimiento
                                        <Sparkles className="h-3 w-3 text-purple-500 animate-pulse shrink-0" />
                                    </p>
                                    <span className="text-[9px] font-semibold text-purple-600 bg-purple-200/60 px-1.5 py-0.5 rounded-full shrink-0">Ver Galería ➔</span>
                                </div>
                                <p className="font-extrabold text-xs sm:text-base md:text-lg text-purple-950 leading-snug break-words mt-0.5 group-hover:text-purple-700 transition-colors">
                                    {data.establishmentName || 'Quinta Las Fresas'}
                                </p>
                                <p className="text-[10px] text-purple-600/90 underline decoration-dotted underline-offset-2 mt-0.5 truncate">
                                    Presiona para ver fotos e instalaciones
                                </p>
                            </div>
                        </motion.div>

                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">Lote de Origen</p>
                                <p className="font-bold text-xs sm:text-base md:text-lg text-gray-800 leading-snug break-words">{data.batchId}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <User className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">Recolector</p>
                                <p className="font-bold text-xs sm:text-base md:text-lg text-gray-800 leading-snug break-words">{data.collectorName}</p>
                            </div>
                        </div>

                        {data.bpaCertified && (
                            <motion.div 
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => setShowBpaModal(true)}
                                className="sm:col-span-2 flex items-center gap-3.5 p-3.5 sm:p-4 bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950 rounded-xl text-white shadow-md cursor-pointer border border-emerald-500/40 group relative overflow-hidden mt-1"
                            >
                                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-400/10 rounded-full blur-md pointer-events-none" />
                                <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400 animate-pulse" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300">
                                        <Award className="h-3 w-3 text-amber-400" /> Sello Oficial BPA
                                    </div>
                                    <p className="font-extrabold text-xs sm:text-base mt-0.5 group-hover:text-emerald-200 transition-colors flex items-center justify-between">
                                        <span>Verificado G.A.P.</span>
                                    </p>
                                    <p className="text-[10px] text-emerald-100/90 underline decoration-dotted underline-offset-2 mt-0.5">
                                        Presiona para ver garantía de inocuidad
                                    </p>
                                </div>
                            </motion.div>
                        )}
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
            </main>
            <footer className="text-center mt-12">
                <p className="text-sm text-gray-500">ID de Trazabilidad: <span className="font-mono">{id}</span></p>
                <p className="text-xs text-gray-400 mt-1">Impulsado por AgroVista</p>
            </footer>

            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl [&>button]:z-[100] [&>button]:text-white [&>button]:bg-white/20 [&>button]:hover:bg-white/40 [&>button]:border [&>button]:border-white/30">
                    <DialogHeader className="absolute top-0 left-0 right-14 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent text-white opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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

            <Dialog open={showBpaModal} onOpenChange={setShowBpaModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-2xl bg-background text-foreground border border-border shadow-xl flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/30 relative z-10 flex-shrink-0">
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                             <Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /> Certificación Oficial AgroVista G.A.P.
                         </div>
                         <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-foreground">
                             <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" /> Buenas Prácticas Agrícolas
                         </DialogTitle>
                        <p className="text-muted-foreground text-xs sm:text-sm pt-1 leading-relaxed">
                            Garantía oficial de inocuidad, respeto por el medio ambiente, seguridad alimentaria y trazabilidad total de tu lote de frutilla.
                        </p>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-4 relative z-10 space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                                        Libre de Residuos (PHI 0)
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Período de carencia fitosanitaria (PHI) 100% verificado y cumplido antes del corte de la fruta. Cero residuos químicos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                                    <Droplet className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                                        Riego y Agua Seguro
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Riego localizado por goteo con fuentes de agua analizadas e inspeccionadas periódicamente.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                                        Manejo Integrado (MIP)
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Prioridad al control biológico y monitoreo fenológico constante por ingenieros agrónomos matriculados.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                                        Cosecha e Higiene Total
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Recolección manual cuidadosa con trazabilidad por cuadrillero, empaque higiénico y cadena de frío ininterrumpida.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" /> CERTIFICADO DIGITAL AGROVISION — VERIFICADO
                            </p>
                            <Button 
                                onClick={() => setShowBpaModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL PERFIL E INSTALACIONES DEL ESTABLECIMIENTO */}
            <Dialog open={showEstablishmentModal} onOpenChange={setShowEstablishmentModal}>
                <DialogContent className="max-w-2xl bg-background text-foreground border border-border p-0 overflow-hidden rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 relative z-10 border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <Home className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                                    {data?.establishmentName || 'Quinta Las Fresas'}
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </DialogTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    {(data as any)?.establishmentData?.locality || 'Coronda'}, {(data as any)?.establishmentData?.province || 'Santa Fe'} · Producción Sustentable Certificada
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-4 relative z-10 space-y-5 overflow-y-auto flex-1">
                        {/* GALERÍA / CARRUSEL DE IMÁGENES DE LA QUINTA */}
                        {((data as any)?.establishmentData?.images || [
                          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                        ]).length > 0 && (
                            <div className="space-y-2.5">
                                <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden border bg-muted shadow-sm group">
                                    <img 
                                        src={((data as any)?.establishmentData?.images || [
                                          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                                          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                                          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                                        ])[activeEstablishmentImg] || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'}
                                        alt="Instalaciones del Establecimiento"
                                        className="w-full h-full object-cover transition-all duration-200"
                                        loading="eager"
                                        decoding="async"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                                        <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full font-mono text-[11px]">
                                            {activeEstablishmentImg + 1} / {((data as any)?.establishmentData?.images || [1,2,3]).length}
                                        </span>
                                        <span className="bg-primary/80 backdrop-blur-md px-2.5 py-1 rounded-full font-medium text-[11px]">
                                            Instalaciones & Cultivo
                                        </span>
                                    </div>
                                </div>

                                {/* THUMBNAILS DE GALERÍA DE CARGA RÁPIDA */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {((data as any)?.establishmentData?.images || [
                                      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                                      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                                      'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                                    ]).map((imgUrl: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveEstablishmentImg(idx)}
                                            className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 bg-muted ${
                                                activeEstablishmentImg === idx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FICHA TÉCNICA INSTITUCIONAL DEL ESTABLECIMIENTO */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                                    <Home className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Sistema Productivo</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                                        {(data as any)?.establishmentData?.system || 'Bajo túnel / Microtúneles de Precisión'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Variedades Cultivadas</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                                        {(data as any)?.establishmentData?.variety || 'San Andreas, Camarosa'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                                    <Droplet className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Sistema de Riego</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                                        {(data as any)?.establishmentData?.irrigationSystem || 'Riego localizado por goteo automatizado'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Gestión Técnica</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                                        {(data as any)?.establishmentData?.technicalManager || 'Ing. Agr. Juan Pérez'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /> Origen & Inocuidad Verificados por AgroVision
                            </p>
                            <Button 
                                onClick={() => setShowEstablishmentModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6"
                            >
                                Cerrar Galería
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
