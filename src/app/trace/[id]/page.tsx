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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                            <Calendar className="h-8 w-8 text-green-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Fecha de Cosecha</p>
                                <p className="font-bold text-base md:text-lg text-gray-800">{new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <Home className="h-8 w-8 text-purple-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Establecimiento</p>
                                <p className="font-bold text-base md:text-lg text-gray-800 break-words" title={data.establishmentName || 'AgroVista'}>{data.establishmentName || 'AgroVista'}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <Leaf className="h-8 w-8 text-blue-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Lote de Origen</p>
                                <p className="font-bold text-base md:text-lg text-gray-800">{data.batchId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <User className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Recolector</p>
                                <p className="font-bold text-base md:text-lg text-gray-800 truncate max-w-[120px] sm:max-w-full" title={data.collectorName}>{data.collectorName}</p>
                            </div>
                        </div>
                        <motion.div 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowBpaModal(true)}
                            className="flex items-center gap-3.5 p-4 bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950 rounded-xl text-white shadow-md cursor-pointer border border-emerald-500/40 group relative overflow-hidden"
                        >
                            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-400/10 rounded-full blur-md pointer-events-none" />
                            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="h-7 w-7 text-emerald-400 animate-pulse" />
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                    <Award className="h-3 w-3 text-amber-400" /> Sello Oficial BPA
                                </div>
                                <p className="font-extrabold text-sm sm:text-base mt-0.5 group-hover:text-emerald-200 transition-colors flex items-center justify-between">
                                    <span>Verificado G.A.P.</span>
                                </p>
                                <p className="text-[10px] text-emerald-100/90 underline decoration-dotted underline-offset-2 mt-0.5">
                                    Presiona para ver garantía
                                </p>
                            </div>
                        </motion.div>
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
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-950 via-emerald-950 to-green-900 text-white border-2 border-emerald-500/50 shadow-2xl flex flex-col [&>button]:z-[100] [&>button]:text-white [&>button]:bg-emerald-500/30 [&>button]:hover:bg-emerald-500/60 [&>button]:border [&>button]:border-emerald-400/40">
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                    <DialogHeader className="p-4 sm:p-6 pb-2 text-center relative z-10 flex-shrink-0 pr-14">
                         <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 mx-auto">
                             <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 animate-pulse flex-shrink-0" /> Certificación Oficial AgroVista G.A.P.
                         </div>
                         <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                             <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400 flex-shrink-0" /> Buenas Prácticas Agrícolas
                        </DialogTitle>
                        <p className="text-emerald-100/90 text-xs sm:text-sm md:text-base max-w-lg mx-auto pt-1.5 leading-relaxed">
                            Garantía oficial de inocuidad, respeto por el medio ambiente, seguridad alimentaria y trazabilidad total de tu lote de frutilla.
                        </p>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-2 relative z-10 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                            <div className="p-3.5 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3 hover:bg-white/15 transition-all">
                                <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0 mt-0.5">
                                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                        Libre de Residuos (PHI 0)
                                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-1 leading-relaxed">
                                        Período de carencia fitosanitaria (PHI) 100% verificado y cumplido antes del corte de la fruta. Cero residuos químicos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3 hover:bg-white/15 transition-all">
                                <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/20 text-blue-300 flex-shrink-0 mt-0.5">
                                    <Droplet className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                        Riego y Agua Seguro
                                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-1 leading-relaxed">
                                        Riego localizado por goteo con fuentes de agua analizadas e inspeccionadas periódicamente.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3 hover:bg-white/15 transition-all">
                                <div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0 mt-0.5">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                        Manejo Integrado (MIP)
                                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-1 leading-relaxed">
                                        Prioridad al control biológico y monitoreo fenológico constante por ingenieros agrónomos matriculados.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3 hover:bg-white/15 transition-all">
                                <div className="p-2 sm:p-2.5 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0 mt-0.5">
                                    <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                                        Cosecha e Higiene Total
                                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-emerald-100/80 mt-1 leading-relaxed">
                                        Recolección manual cuidadosa con trazabilidad por cuadrillero, empaque higiénico y cadena de frío ininterrumpida.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                            <p className="text-[10px] sm:text-xs text-emerald-200/90 flex items-center justify-center gap-1.5 font-mono">
                                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" /> CERTIFICADO DIGITAL AGROVISION — VERIFICADO
                            </p>
                            <Button 
                                onClick={() => setShowBpaModal(false)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl w-full sm:w-auto shadow-md transition-all text-xs sm:text-sm"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
