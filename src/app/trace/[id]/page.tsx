'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Sprout, User, CheckCircle, Info, Truck, Package, Leaf, Droplet, AlertCircle, Home, Flower, Grape, Sun, ShieldCheck, Award, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

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
        batchId?: string;
        batchIds?: string[];
        images?: { url: string; hint?: string }[];
    }[];
    bpaCertified?: boolean;
    bpaDetails?: {
        hasAdminSeal?: boolean;
        phiCompliant?: boolean;
        zeroResiduesGuaranteed?: boolean;
        waterQualityInspected?: boolean;
        mipPracticesCount?: number;
        sanitaryControlsCount?: number;
        harvestHygieneVerified?: boolean;
    };
    establishmentData?: {
        locality?: string;
        province?: string;
        producer?: string;
        system?: string;
        variety?: string;
        irrigationSystem?: string;
        technicalManager?: string;
        images?: string[];
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 sm:p-6">
                <div className="w-full max-w-2xl space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl bg-stone-200/60" />
                    <Skeleton className="h-44 w-full rounded-2xl bg-stone-200/60" />
                    <Skeleton className="h-60 w-full rounded-2xl bg-stone-200/60" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 sm:p-6">
                <Card className="w-full max-w-lg bg-white border border-stone-200/90 shadow-sm rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-red-700 text-lg">
                            <AlertCircle className="h-5 w-5" />
                            Error al Cargar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-stone-600">{error}</p>
                        <Button asChild variant="outline" className="border-stone-300 text-stone-800 hover:bg-stone-50">
                            <Link href="/">Volver a la página principal</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 sm:p-6">
                <Card className="w-full max-w-lg bg-white border border-stone-200/90 shadow-sm rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-[#18201C] text-lg">
                            <AlertCircle className="h-5 w-5 text-stone-500" />
                            No Encontrado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-stone-600">No se encontró información para el código de trazabilidad proporcionado.</p>
                        <Button asChild variant="outline" className="border-stone-300 text-stone-800 hover:bg-stone-50">
                            <Link href="/">Volver a la página principal</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#18201C] p-4 sm:p-6 md:p-8 selection:bg-emerald-100 selection:text-emerald-900">
            {/* Header Sobrio B2B */}
            <header className="max-w-3xl mx-auto text-center mb-8 sm:mb-10 pt-2 sm:pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#196F3D]" />
                    Pasaporte Digital de Trazabilidad
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-stone-200/90 p-1.5 shadow-2xs flex items-center justify-center">
                        <Image src="/logo.png" alt="AgroVista Logo" width={28} height={28} className="object-contain" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-stone-700">AgroVista</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#18201C] font-headline">
                    Historia de tu Frutilla
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-md mx-auto leading-relaxed">
                    Certificación de origen, buenas prácticas e historial agronómico verificado por AgroVista.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-500 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200/60">
                    <span>ID:</span>
                    <span className="font-semibold text-stone-800">{id}</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
                {/* Resumen del Cultivo */}
                <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
                    <CardHeader className="pb-4 border-b border-stone-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#18201C]">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#196F3D]">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                Resumen del Cultivo
                            </CardTitle>
                            <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                Datos Certificados
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Fecha de Cosecha */}
                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-stone-50/70 rounded-xl border border-stone-200/70">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-[#196F3D] flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Fecha de Cosecha</p>
                                <p className="font-bold text-sm sm:text-base text-[#18201C] mt-0.5 leading-snug">
                                    {new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Establecimiento (Quinta) */}
                        <div 
                            onClick={() => setShowEstablishmentModal(true)}
                            className="flex items-center gap-3 p-3.5 sm:p-4 bg-stone-50/70 hover:bg-stone-100/80 rounded-xl border border-stone-200/70 cursor-pointer transition-colors group relative"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-[#196F3D] flex items-center justify-center shrink-0">
                                <Home className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                                        Establecimiento
                                    </p>
                                    <span className="text-[10px] font-medium text-[#196F3D] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-0.5">
                                        Ver fotos <ArrowUpRight className="h-2.5 w-2.5" />
                                    </span>
                                </div>
                                <p className="font-bold text-sm sm:text-base text-[#18201C] mt-0.5 truncate group-hover:text-[#196F3D] transition-colors">
                                    {data.establishmentName || 'Quinta Las Fresas'}
                                </p>
                            </div>
                        </div>

                        {/* Lote de Origen */}
                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-stone-50/70 rounded-xl border border-stone-200/70">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-[#196F3D] flex items-center justify-center shrink-0">
                                <Leaf className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Lote de Origen</p>
                                <p className="font-bold text-sm sm:text-base text-[#18201C] mt-0.5 truncate">
                                    {data.batchId}
                                </p>
                            </div>
                        </div>

                        {/* Recolector */}
                        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-stone-50/70 rounded-xl border border-stone-200/70">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-[#196F3D] flex items-center justify-center shrink-0">
                                <User className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Cuadrillero / Recolector</p>
                                <p className="font-bold text-sm sm:text-base text-[#18201C] mt-0.5 truncate">
                                    {data.collectorName}
                                </p>
                            </div>
                        </div>

                        {/* Sello Oficial BPA (Tarjeta Sobria AgTech) */}
                        {data.bpaCertified && (
                            <div 
                                onClick={() => setShowBpaModal(true)}
                                className="sm:col-span-2 p-4 bg-emerald-50/50 hover:bg-emerald-50/80 rounded-xl border border-emerald-200/80 cursor-pointer transition-colors flex items-center justify-between gap-3 mt-1"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-emerald-200 text-[#196F3D] flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-[#196F3D] uppercase tracking-wider">
                                                Buenas Prácticas Agrícolas
                                            </span>
                                            <span className="text-[9px] font-semibold bg-emerald-100 text-[#196F3D] px-1.5 py-0.2 rounded">
                                                G.A.P.
                                            </span>
                                        </div>
                                        <p className="font-bold text-sm text-[#18201C] mt-0.5 truncate">
                                            Certificación Oficial de Inocuidad Verificada
                                        </p>
                                        <p className="text-[11px] text-stone-600 truncate">
                                            Período de carencia respetado, agua segura y manejo integrado.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-[#196F3D] flex items-center gap-0.5 shrink-0">
                                    Detalles <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cadena de Trazabilidad */}
                <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
                    <CardHeader className="pb-4 border-b border-stone-100">
                        <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#18201C]">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#196F3D]">
                                <Truck className="h-4 w-4" />
                            </div>
                            Cadena de Custodia y Trazabilidad
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <ul className="space-y-4 relative">
                            {/* Línea conectora sobria */}
                            <div className="absolute left-5 top-4 bottom-4 w-px bg-stone-200 hidden sm:block" />

                            <li className="flex items-start gap-3.5 sm:gap-4 relative">
                                <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 text-[#196F3D] flex items-center justify-center shrink-0 z-10">
                                    <Sprout className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm sm:text-base text-[#18201C]">1. Cosecha en Campo</p>
                                        <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">Completado</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-stone-600 mt-0.5 leading-relaxed">
                                        El fruto fue recolectado a mano en el punto óptimo de maduración por personal capacitado.
                                    </p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3.5 sm:gap-4 relative">
                                <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 text-[#196F3D] flex items-center justify-center shrink-0 z-10">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm sm:text-base text-[#18201C]">2. Empaque y Control de Calidad</p>
                                        <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">Completado</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-stone-600 mt-0.5 leading-relaxed">
                                        Selección y clasificación bajo normas de inocuidad y control higiénico de bandejas.
                                    </p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3.5 sm:gap-4 relative">
                                <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200/80 text-[#196F3D] flex items-center justify-center shrink-0 z-10">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm sm:text-base text-[#18201C]">3. Distribución y Cadena de Frío</p>
                                        <span className="text-[10px] font-medium text-[#196F3D] bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">En curso</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-stone-600 mt-0.5 leading-relaxed">
                                        Transporte con temperatura controlada para preservar firmeza, sabor y vida útil en góndola.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Historial de Fenología del Lote */}
                {data.phenologyLogs && data.phenologyLogs.length > 0 && (
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
                        <CardHeader className="pb-4 border-b border-stone-100">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-[#18201C]">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#196F3D]">
                                    <Leaf className="h-4 w-4" />
                                </div>
                                Historial de Fenología del Lote
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-stone-500">
                                Registros de desarrollo agronómico documentados durante el ciclo productivo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="space-y-3.5">
                                {data.phenologyLogs.map((log, index) => {
                                    const Icon = phenologyIcons[log.developmentState] || Info;
                                    return (
                                        <li key={index} className="p-3.5 sm:p-4 bg-stone-50/70 rounded-xl border border-stone-200/70 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-md bg-white border border-stone-200/80 text-[#196F3D] flex items-center justify-center shrink-0">
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <p className="font-bold text-sm sm:text-base text-[#18201C]">{log.developmentState}</p>
                                                    {(() => {
                                                        const rawBatch = log.batchId || (log.batchIds && log.batchIds.length > 0 ? log.batchIds.join(', ') : null);
                                                        if (!rawBatch) return null;
                                                        const match = rawBatch.match(/Lote\s*(\d+)/i) || rawBatch.match(/L(\d+)/i);
                                                        const displayBatch = match ? `L${match[1].padStart(3, '0')}` : rawBatch.split(':')[0].trim();
                                                        return (
                                                            <span className="text-[10px] font-semibold bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded">
                                                                {displayBatch}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-xs text-stone-500 font-mono">
                                                    {new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>

                                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                                {log.notes}
                                            </p>

                                            {(log.flowerCount && log.flowerCount > 0) || (log.fruitCount && log.fruitCount > 0) ? (
                                                <div className="flex flex-wrap gap-2 pt-0.5">
                                                    {log.flowerCount && log.flowerCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-stone-700 px-2.5 py-0.5 rounded border border-stone-200">
                                                            <Flower className="h-3 w-3 text-stone-500" />
                                                            {log.flowerCount} Flores
                                                        </span>
                                                    ) : null}
                                                    {log.fruitCount && log.fruitCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-[#196F3D] px-2.5 py-0.5 rounded border border-emerald-200/60">
                                                            <Grape className="h-3 w-3 text-[#196F3D]" />
                                                            {log.fruitCount} Frutos
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {log.images && log.images.length > 0 && (
                                                <div className={`mt-2 grid gap-2 ${log.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                                    {log.images.map((img, imgIdx) => (
                                                        <div 
                                                            key={imgIdx}
                                                            className="relative aspect-square rounded-lg overflow-hidden border border-stone-200/90 shadow-2xs cursor-pointer group bg-stone-100"
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
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 px-2 py-1 rounded text-[11px] font-medium text-stone-800 shadow-sm flex items-center gap-1">
                                                                    <Info className="h-3 w-3 text-[#196F3D]" /> Ampliar
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Footer Sobrio */}
            <footer className="max-w-3xl mx-auto text-center mt-10 pt-6 border-t border-stone-200/80 space-y-2">
                <p className="text-xs text-stone-500">
                    Sistema de Trazabilidad Agrícola • <span className="font-semibold text-stone-700">AgroVista</span>
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-stone-500">
                    <Link href="/" className="hover:text-[#196F3D] transition-colors underline-offset-2 hover:underline">
                        Página Principal
                    </Link>
                    <span>•</span>
                    <span>Coronda, Santa Fe</span>
                </div>
            </footer>

            {/* MODAL IMAGEN AMPLIADA */}
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl [&>button]:z-[100] [&>button]:text-white [&>button]:bg-white/20 [&>button]:hover:bg-white/40">
                    <DialogHeader className="absolute top-0 left-0 right-14 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent text-white pointer-events-none">
                        <DialogTitle className="text-base font-semibold flex items-center gap-2">
                            {selectedLogInfo?.state}
                            <span className="text-xs font-normal opacity-80">— {selectedLogInfo?.date}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-[80vh] flex items-center justify-center p-2 sm:p-4">
                        <AnimatePresence mode="wait">
                            {selectedImage && (
                                <motion.div
                                    key={selectedImage}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
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

            {/* MODAL BPA CERTIFICACIÓN (B2B SOBRIO) */}
            <Dialog open={showBpaModal} onOpenChange={setShowBpaModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-2xl bg-white text-[#18201C] border border-stone-200 shadow-xl flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-stone-100 bg-stone-50/70 relative z-10 shrink-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#196F3D] border border-emerald-200/80 text-[10px] font-semibold uppercase tracking-wider mb-2 self-start">
                            <ShieldCheck className="h-3.5 w-3.5" /> Protocolo AgroVista G.A.P.
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-[#18201C]">
                            Buenas Prácticas Agrícolas
                        </DialogTitle>
                        <DialogDescription className="text-stone-600 text-xs sm:text-sm pt-1 leading-relaxed">
                            Criterios técnicos de inocuidad alimentaria, sustentabilidad ambiental y trazabilidad auditados en origen.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-4 space-y-3.5 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3 sm:col-span-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Award className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#18201C] flex items-center gap-1.5">
                                        Auditoría Oficial del Establecimiento
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Inspección técnica de lotes, registros fitosanitarios y condiciones de empaque conforme a estándares de calidad provincial y nacional.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#18201C] flex items-center gap-1.5">
                                        Carencia PHI Cumplida
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Período de carencia fitosanitaria verificado al 100% antes del corte de la fruta.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#18201C] flex items-center gap-1.5">
                                        Agua y Riego Seguro
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Riego por goteo automatizado con análisis periódico de fuentes de agua.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Leaf className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#18201C] flex items-center gap-1.5">
                                        Manejo Integrado (MIP)
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Monitoreo continuo de plagas y priorización de control biológico en lote.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Package className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#18201C] flex items-center gap-1.5">
                                        Higiene de Recolección
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Manipulación protegida, bandejas higiénicas y conservación de temperatura.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[11px] text-stone-500 font-mono">
                                CERTIFICADO DIGITAL AGROVISTA • VERIFICADO
                            </p>
                            <Button 
                                onClick={() => setShowBpaModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6 border-stone-300"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL PERFIL E INSTALACIONES DEL ESTABLECIMIENTO (B2B SOBRIO) */}
            <Dialog open={showEstablishmentModal} onOpenChange={setShowEstablishmentModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl bg-white text-[#18201C] border border-stone-200 p-0 overflow-hidden rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-stone-100 bg-stone-50/70 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#196F3D] flex items-center justify-center shrink-0">
                                <Home className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg sm:text-xl font-bold text-[#18201C] flex items-center gap-1.5">
                                    <span className="truncate">{data?.establishmentName || 'Quinta Las Fresas'}</span>
                                    <CheckCircle2 className="h-4 w-4 text-[#196F3D] shrink-0" />
                                </DialogTitle>
                                <DialogDescription className="text-xs text-stone-600 mt-0.5 truncate">
                                    {data?.establishmentData?.locality || 'Coronda'}, {data?.establishmentData?.province || 'Santa Fe'} • Producción Frutillera
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-4 space-y-4 overflow-y-auto flex-1">
                        {/* GALERÍA / CARRUSEL */}
                        {((data?.establishmentData?.images || [
                          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                        ]).length > 0) && (() => {
                            const rawImages: string[] = data?.establishmentData?.images || [
                              'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                              'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
                              'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
                            ];
                            const currentRawUrl = rawImages[activeEstablishmentImg] || rawImages[0];
                            const optimizedMainUrl = getOptimizedImageUrl(currentRawUrl, { width: 800, quality: 75 });

                            return (
                                <div className="space-y-2.5">
                                    <div 
                                        className="relative h-48 sm:h-64 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs group cursor-pointer"
                                        onClick={() => {
                                            setSelectedImage(currentRawUrl);
                                            setSelectedLogInfo({ state: 'Instalaciones del Establecimiento', date: data?.establishmentData?.producer || 'Quinta Las Fresas' });
                                        }}
                                    >
                                        <img 
                                            key={optimizedMainUrl}
                                            src={optimizedMainUrl}
                                            alt="Instalaciones del Establecimiento"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                                            loading="eager"
                                            decoding="async"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              if (target.src !== currentRawUrl) {
                                                target.src = currentRawUrl;
                                              }
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white">
                                            <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded font-mono text-[10px]">
                                                {activeEstablishmentImg + 1} / {rawImages.length}
                                            </span>
                                            <span className="bg-stone-900/80 backdrop-blur-md px-2 py-0.5 rounded font-medium text-[11px] flex items-center gap-1">
                                                Ampliar foto
                                            </span>
                                        </div>
                                    </div>

                                    {/* THUMBNAILS */}
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {rawImages.map((imgUrl: string, idx: number) => {
                                            const thumbUrl = getOptimizedImageUrl(imgUrl, { width: 160, quality: 60 });
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveEstablishmentImg(idx)}
                                                    className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-stone-100 ${
                                                        activeEstablishmentImg === idx ? 'border-[#196F3D] ring-2 ring-[#196F3D]/20' : 'border-transparent opacity-60 hover:opacity-100'
                                                    }`}
                                                >
                                                    <img 
                                                        src={thumbUrl} 
                                                        alt={`Thumb ${idx}`} 
                                                        className="w-full h-full object-cover" 
                                                        loading="lazy" 
                                                        decoding="async" 
                                                        onError={(e) => {
                                                          const target = e.target as HTMLImageElement;
                                                          if (target.src !== imgUrl) {
                                                            target.src = imgUrl;
                                                          }
                                                        }}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* FICHA TÉCNICA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Home className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Sistema Productivo</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#18201C] mt-0.5 truncate">
                                        {data?.establishmentData?.system || 'Microtúneles de Precisión'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Variedades Cultivadas</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#18201C] mt-0.5 truncate">
                                        {data?.establishmentData?.variety || 'San Andreas, Camarosa'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Sistema de Riego</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#18201C] mt-0.5 truncate">
                                        {data?.establishmentData?.irrigationSystem || 'Riego por goteo automatizado'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/80 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#196F3D] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Dirección Técnica</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#18201C] mt-0.5 truncate">
                                        {data?.establishmentData?.technicalManager || 'Ing. Agrónomo Colegiado'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[11px] text-stone-500 font-mono">
                                ORIGEN E INOCUIDAD AUDITADOS • AGROVISTA
                            </p>
                            <Button 
                                onClick={() => setShowEstablishmentModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6 border-stone-300"
                            >
                                Cerrar Ficha
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
