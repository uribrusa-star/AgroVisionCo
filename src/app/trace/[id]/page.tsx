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
                <div className="w-full max-w-4xl space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl bg-stone-200/70" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-80 w-full rounded-2xl bg-stone-200/70" />
                        <Skeleton className="h-80 w-full rounded-2xl bg-stone-200/70" />
                    </div>
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
        <div className="min-h-screen bg-[#FAF9F6] text-[#18201C] p-4 sm:p-6 md:p-8 lg:p-10 selection:bg-emerald-100 selection:text-emerald-900">
            {/* Header Sobrio con Acentos Oscuros B2B */}
            <header className="max-w-4xl mx-auto text-center mb-8 sm:mb-12 pt-2 sm:pt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0F2A1D] border border-emerald-900/40 text-[11px] font-semibold text-emerald-300 uppercase tracking-wider mb-4 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Pasaporte Digital de Trazabilidad
                </div>

                <div className="flex items-center justify-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-stone-300 p-1.5 shadow-xs flex items-center justify-center">
                        <Image src="/logo.png" alt="AgroVista Logo" width={30} height={30} className="object-contain" priority />
                    </div>
                    <span className="text-base font-bold tracking-tight text-[#0D2618]">AgroVista</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0D2618] font-headline">
                    Historia de tu Frutilla
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-stone-600 mt-2.5 max-w-lg mx-auto leading-relaxed">
                    Certificación de origen, buenas prácticas e historial agronómico verificado por AgroVista en Coronda, Santa Fe.
                </p>
                <div className="mt-3.5 inline-flex items-center gap-2 text-xs font-mono text-stone-700 bg-white px-3.5 py-1.5 rounded-lg border border-stone-300 shadow-2xs">
                    <span className="text-stone-400 font-sans font-semibold text-[11px] uppercase">Lote ID:</span>
                    <span className="font-bold text-[#0D2618]">{id}</span>
                </div>
            </header>

            {/* Layout Principal: 2 columnas en PC (lg) y 1 columna en móvil */}
            <main className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    
                    {/* COLUMNA 1: Resumen del Cultivo */}
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        {/* Cabecera con tono oscuro distinguido */}
                        <CardHeader className="bg-[#0F2A1D] text-white p-5 sm:p-6 border-b border-emerald-950">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-white">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300">
                                        <Sprout className="h-5 w-5" />
                                    </div>
                                    Resumen del Cultivo
                                </CardTitle>
                                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2.5 py-0.5 rounded-full">
                                    Datos Certificados
                                </span>
                            </div>
                            <CardDescription className="text-emerald-100/70 text-xs mt-1">
                                Parámetros clave de producción documentados al momento de la cosecha.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                {/* Fecha de Cosecha */}
                                <div className="flex items-center gap-3 p-3.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Fecha de Cosecha</p>
                                        <p className="font-bold text-sm sm:text-base text-[#0D2618] mt-0.5 leading-snug">
                                            {new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Establecimiento (Quinta) */}
                                <div 
                                    onClick={() => setShowEstablishmentModal(true)}
                                    className="flex items-center gap-3 p-3.5 bg-[#FAF9F6] hover:bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 cursor-pointer transition-all shadow-2xs group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Home className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                                Establecimiento
                                            </p>
                                            <span className="text-[10px] font-bold text-[#196F3D] group-hover:text-emerald-700 flex items-center gap-0.5">
                                                Galería <ArrowUpRight className="h-2.5 w-2.5" />
                                            </span>
                                        </div>
                                        <p className="font-bold text-sm sm:text-base text-[#0D2618] mt-0.5 truncate group-hover:text-[#196F3D] transition-colors">
                                            {data.establishmentName || 'Quinta Las Fresas'}
                                        </p>
                                    </div>
                                </div>

                                {/* Lote de Origen */}
                                <div className="flex items-center gap-3 p-3.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Leaf className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Lote de Origen</p>
                                        <p className="font-bold text-sm sm:text-base text-[#0D2618] mt-0.5 truncate">
                                            {data.batchId}
                                        </p>
                                    </div>
                                </div>

                                {/* Recolector */}
                                <div className="flex items-center gap-3 p-3.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Cuadrillero / Recolector</p>
                                        <p className="font-bold text-sm sm:text-base text-[#0D2618] mt-0.5 truncate">
                                            {data.collectorName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta Destacada con Sello Oficial BPA Propio */}
                            {data.bpaCertified && (
                                <div 
                                    onClick={() => setShowBpaModal(true)}
                                    className="p-4 sm:p-4.5 bg-[#0F2A1D] hover:bg-[#133525] rounded-xl border border-emerald-800/80 cursor-pointer transition-all shadow-md flex items-center justify-between gap-4 group mt-2"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Sello Oficial BPA AgroVista con fondo blanco circular */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 shrink-0 flex items-center justify-center shadow-md border border-emerald-700/40 group-hover:scale-105 transition-transform">
                                            <Image 
                                                src="/logoBPA-sinfondo.png" 
                                                alt="Sello Oficial BPA AgroVista" 
                                                width={60} 
                                                height={60} 
                                                className="object-contain"
                                                priority
                                            />
                                        </div>
                                        <div className="min-w-0 text-white">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                                                    Buenas Prácticas Agrícolas
                                                </span>
                                                <span className="text-[9px] font-extrabold bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-600/50">
                                                    G.A.P.
                                                </span>
                                            </div>
                                            <p className="font-bold text-sm sm:text-base text-white mt-0.5 truncate group-hover:text-emerald-200 transition-colors">
                                                Inocuidad & Cuidado de Origen
                                            </p>
                                            <p className="text-[11px] text-emerald-100/70 truncate">
                                                Período de carencia respetado, agua segura y manejo biológico.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700/50 shrink-0 group-hover:bg-emerald-800 transition-colors">
                                        Ver Certificado <ArrowUpRight className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* COLUMNA 2: Cadena de Custodia y Trazabilidad */}
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        {/* Cabecera con tono oscuro distinguido */}
                        <CardHeader className="bg-[#0F2A1D] text-white p-5 sm:p-6 border-b border-emerald-950">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-white">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    Cadena de Custodia y Trazabilidad
                                </CardTitle>
                                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2.5 py-0.5 rounded-full">
                                    Seguimiento Total
                                </span>
                            </div>
                            <CardDescription className="text-emerald-100/70 text-xs mt-1">
                                Ruta productiva desde el surco hasta el punto de venta final.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
                            <ul className="space-y-5 relative">
                                {/* Línea conectora sobria en verde bosque */}
                                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-[#0F2A1D]/20 hidden sm:block" />

                                <li className="flex items-start gap-4 relative">
                                    <div className="w-10 h-10 rounded-xl bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-xs">
                                        <Sprout className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm sm:text-base text-[#0D2618]">1. Cosecha en Campo</p>
                                            <span className="text-[10px] font-bold text-[#196F3D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">Completado</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                                            Fruto cosechado a mano en el punto óptimo de maduración por cuadrilleros registrados y capacitados.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-4 relative">
                                    <div className="w-10 h-10 rounded-xl bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-xs">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm sm:text-base text-[#0D2618]">2. Empaque y Control de Calidad</p>
                                            <span className="text-[10px] font-bold text-[#196F3D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">Completado</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                                            Selección cuidadosa, descarte de fruta defectuosa y acondicionamiento higiénico en bandejas de origen.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-4 relative">
                                    <div className="w-10 h-10 rounded-xl bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-xs">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm sm:text-base text-[#0D2618]">3. Logística y Distribución Comercial</p>
                                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">En Destino</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                                            Transporte directo y ágil desde la quinta hacia mercados mayoristas y verdulerías, garantizando la frescura del fruto recién cortado.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                </div>

                {/* FILA INFERIOR (ANCHO COMPLETO): Historial de Fenología del Lote */}
                {data.phenologyLogs && data.phenologyLogs.length > 0 && (
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-sm overflow-hidden mt-6 sm:mt-8">
                        <CardHeader className="bg-[#0F2A1D] text-white p-5 sm:p-6 border-b border-emerald-950">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-white">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300">
                                        <Leaf className="h-5 w-5" />
                                    </div>
                                    Historial de Fenología del Lote
                                </CardTitle>
                                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2.5 py-0.5 rounded-full">
                                    Bitácora Agronómica
                                </span>
                            </div>
                            <CardDescription className="text-emerald-100/70 text-xs mt-1">
                                Registros de desarrollo fisiológico documentados durante el ciclo de floración y cuajado del cultivo.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-5 sm:p-6 pt-5">
                            <ul className="space-y-3.5">
                                {data.phenologyLogs.map((log, index) => {
                                    const Icon = phenologyIcons[log.developmentState] || Info;
                                    return (
                                        <li key={index} className="p-4 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <p className="font-bold text-sm sm:text-base text-[#0D2618]">{log.developmentState}</p>
                                                    {(() => {
                                                        const rawBatch = log.batchId || (log.batchIds && log.batchIds.length > 0 ? log.batchIds.join(', ') : null);
                                                        if (!rawBatch) return null;
                                                        const match = rawBatch.match(/Lote\s*(\d+)/i) || rawBatch.match(/L(\d+)/i);
                                                        const displayBatch = match ? `L${match[1].padStart(3, '0')}` : rawBatch.split(':')[0].trim();
                                                        return (
                                                            <span className="text-[10px] font-bold bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded border border-stone-300">
                                                                {displayBatch}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-xs text-stone-600 font-mono font-medium">
                                                    {new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>

                                            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                                                {log.notes}
                                            </p>

                                            {(log.flowerCount && log.flowerCount > 0) || (log.fruitCount && log.fruitCount > 0) ? (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {log.flowerCount && log.flowerCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white text-stone-800 px-2.5 py-0.5 rounded border border-stone-300 shadow-2xs">
                                                            <Flower className="h-3.5 w-3.5 text-stone-500" />
                                                            {log.flowerCount} Flores
                                                        </span>
                                                    ) : null}
                                                    {log.fruitCount && log.fruitCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-[#196F3D] px-2.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                                            <Grape className="h-3.5 w-3.5 text-[#196F3D]" />
                                                            {log.fruitCount} Frutos
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {log.images && log.images.length > 0 && (
                                                <div className={`mt-2.5 grid gap-2.5 ${log.images.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
                                                    {log.images.map((img, imgIdx) => (
                                                        <div 
                                                            key={imgIdx}
                                                            className="relative aspect-square rounded-xl overflow-hidden border border-stone-300 shadow-xs cursor-pointer group bg-stone-100"
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
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 px-2.5 py-1 rounded-md text-[11px] font-bold text-stone-800 shadow-md flex items-center gap-1">
                                                                    <Info className="h-3.5 w-3.5 text-[#196F3D]" /> Ampliar
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
            <footer className="max-w-4xl mx-auto text-center mt-12 pt-6 border-t border-stone-200/80 space-y-2">
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

            {/* MODAL BPA CERTIFICACIÓN CON SELLO OFICIAL Y CONTRASTE B2B */}
            <Dialog open={showBpaModal} onOpenChange={setShowBpaModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-2xl bg-white text-[#18201C] border border-stone-200 shadow-2xl flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-emerald-950 bg-[#0F2A1D] text-white relative z-10 shrink-0">
                        <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-full bg-white p-1 shrink-0 flex items-center justify-center shadow-md">
                                <Image 
                                    src="/logoBPA-sinfondo.png" 
                                    alt="Sello Oficial BPA" 
                                    width={52} 
                                    height={52} 
                                    className="object-contain" 
                                />
                            </div>
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold uppercase tracking-wider mb-1">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Protocolo AgroVista G.A.P.
                                </div>
                                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
                                    Buenas Prácticas Agrícolas
                                </DialogTitle>
                                <DialogDescription className="text-emerald-100/80 text-xs sm:text-sm pt-0.5 leading-relaxed">
                                    Inocuidad alimentaria, cuidado ambiental y trazabilidad auditados en origen.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-6 pt-4 space-y-3.5 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3 sm:col-span-2">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Award className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#0D2618] flex items-center gap-1.5">
                                        Auditoría Oficial del Establecimiento
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Inspección técnica de lotes, registros fitosanitarios y condiciones de empaque conforme a estándares de calidad provincial y nacional.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#0D2618] flex items-center gap-1.5">
                                        Carencia PHI Cumplida
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Período de carencia fitosanitaria verificado al 100% antes del corte de la fruta. Cero residuos químicos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#0D2618] flex items-center gap-1.5">
                                        Agua y Riego Seguro
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Riego por goteo automatizado con análisis periódico de fuentes de agua.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Leaf className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#0D2618] flex items-center gap-1.5">
                                        Manejo Integrado (MIP)
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Monitoreo continuo de plagas y priorización de control biológico en lote.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Package className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-[#0D2618] flex items-center gap-1.5">
                                        Higiene de Recolección
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-stone-600 mt-1 leading-relaxed">
                                        Manipulación protegida, bandejas higiénicas y despacho ágil hacia destino comercial.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[11px] text-stone-500 font-mono font-semibold">
                                CERTIFICADO DIGITAL AGROVISTA • AUDITADO
                            </p>
                            <Button 
                                onClick={() => setShowBpaModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6 border-stone-300 hover:bg-stone-50"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL PERFIL E INSTALACIONES DEL ESTABLECIMIENTO */}
            <Dialog open={showEstablishmentModal} onOpenChange={setShowEstablishmentModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl bg-white text-[#18201C] border border-stone-200 p-0 overflow-hidden rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-emerald-950 bg-[#0F2A1D] text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 flex items-center justify-center shrink-0">
                                <Home className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
                                    <span className="truncate">{data?.establishmentName || 'Quinta Las Fresas'}</span>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                </DialogTitle>
                                <DialogDescription className="text-xs text-emerald-100/70 mt-0.5 truncate">
                                    {data?.establishmentData?.locality || 'Coronda'}, {data?.establishmentData?.province || 'Santa Fe'} • Producción Frutillera Certificada
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
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
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
                                                        activeEstablishmentImg === idx ? 'border-[#0F2A1D] ring-2 ring-[#0F2A1D]/20' : 'border-transparent opacity-60 hover:opacity-100'
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
                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Home className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Sistema Productivo</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.system || 'Microtúneles de Precisión'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Variedades Cultivadas</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.variety || 'San Andreas, Camarosa'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Sistema de Riego</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.irrigationSystem || 'Riego por goteo automatizado'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Dirección Técnica</p>
                                    <p className="text-xs sm:text-sm font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.technicalManager || 'Ing. Agrónomo Colegiado'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[11px] text-stone-500 font-mono font-semibold">
                                ORIGEN E INOCUIDAD AUDITADOS • AGROVISTA
                            </p>
                            <Button 
                                onClick={() => setShowEstablishmentModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-6 border-stone-300 hover:bg-stone-50"
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
