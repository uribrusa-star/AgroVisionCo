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
                    <Skeleton className="h-20 w-full rounded-2xl bg-stone-200/70" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <Skeleton className="h-72 w-full rounded-2xl bg-stone-200/70" />
                        <Skeleton className="h-72 w-full rounded-2xl bg-stone-200/70" />
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
        <div className="min-h-screen bg-[#FAF9F6] text-[#18201C] px-4 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 selection:bg-emerald-100 selection:text-emerald-900">
            {/* Header Compacto y Elegante: Diseñado para entrar completo en el primer pantallazo en PC */}
            <header className="max-w-5xl mx-auto text-center mb-4 sm:mb-5 lg:mb-6">
                {/* Fila superior de insignia institucional y marca */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0F2A1D] border border-emerald-900/40 text-[10px] sm:text-[11px] font-semibold text-emerald-300 uppercase tracking-wider shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Pasaporte de Trazabilidad
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-stone-300 text-[10px] sm:text-[11px] text-stone-700 shadow-2xs">
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0">
                            <Image src="/logo.png" alt="AgroVista" width={14} height={14} className="object-contain" />
                        </div>
                        <span className="font-semibold text-[#0D2618]">AgroVista</span>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-300 text-[10px] sm:text-[11px] font-mono text-stone-700">
                        <span className="text-stone-400 font-sans text-[10px] uppercase font-bold">Lote:</span>
                        <span className="font-bold text-[#0D2618]">{id}</span>
                    </div>
                </div>

                {/* Título principal optimizado en altura */}
                <h1 className="text-2xl sm:text-3xl lg:text-3xl font-extrabold tracking-tight text-[#0D2618] font-headline">
                    Historia de tu Frutilla
                </h1>
                <p className="text-[11px] sm:text-xs md:text-sm text-stone-600 mt-1 max-w-xl mx-auto leading-normal">
                    Certificación de origen, buenas prácticas e historial agronómico verificado en Coronda, Santa Fe.
                </p>
            </header>

            {/* Layout Principal: 2 columnas en PC (lg) con altura equilibrada para ver todo de una sola vez */}
            <main className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
                    
                    {/* COLUMNA 1: Resumen del Cultivo */}
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
                        {/* Cabecera oscura compacta */}
                        <CardHeader className="bg-[#0F2A1D] text-white px-4 py-3 sm:px-5 sm:py-3.5 border-b border-emerald-950 shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shrink-0">
                                        <Sprout className="h-4 w-4" />
                                    </div>
                                    Resumen del Cultivo
                                </CardTitle>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                                    Datos Certificados
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent className="p-3.5 sm:p-4.5 flex-1 flex flex-col justify-between space-y-3">
                            {/* 4 tarjetas en 2 columnas y 2 filas tanto en móvil como en PC */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                {/* Fecha de Cosecha */}
                                <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-500 truncate">Fecha Cosecha</p>
                                        <p className="font-bold text-[11px] sm:text-xs md:text-sm text-[#0D2618] mt-0.5 leading-tight truncate">
                                            {new Date(data.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Establecimiento (Quinta) */}
                                <div 
                                    onClick={() => setShowEstablishmentModal(true)}
                                    className="flex items-center gap-2 p-2 sm:p-2.5 bg-[#FAF9F6] hover:bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 cursor-pointer transition-all shadow-2xs group"
                                >
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-500 truncate">
                                                Establecimiento
                                            </p>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-[#196F3D] group-hover:text-emerald-700 flex items-center shrink-0">
                                                Fotos ↗
                                            </span>
                                        </div>
                                        <p className="font-bold text-[11px] sm:text-xs md:text-sm text-[#0D2618] mt-0.5 truncate group-hover:text-[#196F3D] transition-colors">
                                            {data.establishmentName || 'Quinta Las Fresas'}
                                        </p>
                                    </div>
                                </div>

                                {/* Lote de Origen */}
                                <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-500 truncate">Lote Origen</p>
                                        <p className="font-bold text-[11px] sm:text-xs md:text-sm text-[#0D2618] mt-0.5 truncate">
                                            {data.batchId}
                                        </p>
                                    </div>
                                </div>

                                {/* Recolector */}
                                <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-500 truncate">Cuadrillero</p>
                                        <p className="font-bold text-[11px] sm:text-xs md:text-sm text-[#0D2618] mt-0.5 truncate">
                                            {data.collectorName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta Destacada con Sello Oficial BPA Propio */}
                            {data.bpaCertified && (
                                <div 
                                    onClick={() => setShowBpaModal(true)}
                                    className="p-2.5 sm:p-3 bg-[#0F2A1D] hover:bg-[#133525] rounded-xl border border-emerald-800/80 cursor-pointer transition-all shadow-sm flex items-center justify-between gap-3 group mt-1"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Sello Oficial BPA AgroVista con dimensiones fijas garantizadas */}
                                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] sm:min-w-[56px] sm:min-h-[56px] sm:max-w-[56px] sm:max-h-[56px] rounded-full bg-white border border-emerald-600/60 shadow-md overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                                            <Image 
                                                src="/logoBPA-sinfondo.png" 
                                                alt="Sello Oficial BPA AgroVista" 
                                                fill
                                                sizes="(max-width: 640px) 48px, 56px"
                                                className="object-contain p-0.5"
                                                priority
                                            />
                                        </div>
                                        <div className="min-w-0 text-white">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                                                    Buenas Prácticas Agrícolas
                                                </span>
                                                <span className="text-[8px] font-extrabold bg-emerald-800 text-emerald-200 px-1 py-0.2 rounded border border-emerald-600/50">
                                                    G.A.P.
                                                </span>
                                            </div>
                                            <p className="font-bold text-xs sm:text-sm text-white mt-0.5 truncate group-hover:text-emerald-200 transition-colors">
                                                Inocuidad & Cuidado de Origen
                                            </p>
                                            <p className="text-[10px] text-emerald-100/70 truncate">
                                                Período de carencia cumplido, agua segura y control biológico.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-700/50 shrink-0 group-hover:bg-emerald-800 transition-colors">
                                        Ver Sello <ArrowUpRight className="h-3 w-3" />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* COLUMNA 2: Cadena de Custodia y Trazabilidad */}
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden">
                        {/* Cabecera oscura compacta */}
                        <CardHeader className="bg-[#0F2A1D] text-white px-4 py-3 sm:px-5 sm:py-3.5 border-b border-emerald-950 shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shrink-0">
                                        <Truck className="h-4 w-4" />
                                    </div>
                                    Cadena de Custodia y Trazabilidad
                                </CardTitle>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                                    Seguimiento Total
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent className="p-3.5 sm:p-4.5 flex-1 flex flex-col justify-center">
                            <ul className="space-y-3 sm:space-y-3.5 relative">
                                {/* Línea conectora sobria en verde bosque */}
                                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[#0F2A1D]/20 hidden sm:block" />

                                <li className="flex items-start gap-3 relative">
                                    <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                                        <Sprout className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-xs sm:text-sm text-[#0D2618]">1. Cosecha en Campo</p>
                                            <span className="text-[9px] font-bold text-[#196F3D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">Completado</span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5 leading-snug">
                                            Fruto cosechado a mano en punto óptimo de maduración por cuadrilleros registrados y capacitados.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 relative">
                                    <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                                        <Package className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-xs sm:text-sm text-[#0D2618]">2. Empaque y Control de Calidad</p>
                                            <span className="text-[9px] font-bold text-[#196F3D] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">Completado</span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5 leading-snug">
                                            Selección cuidadosa, descarte de fruta defectuosa y acondicionamiento higiénico en bandejas de origen.
                                        </p>
                                    </div>
                                </li>

                                <li className="flex items-start gap-3 relative">
                                    <div className="w-8 h-8 rounded-lg bg-[#0F2A1D] border border-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                                        <Truck className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-xs sm:text-sm text-[#0D2618]">3. Logística y Distribución Comercial</p>
                                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">En Destino</span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5 leading-snug">
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
                    <Card className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden mt-5 sm:mt-6">
                        <CardHeader className="bg-[#0F2A1D] text-white px-4 py-3 sm:px-5 sm:py-3.5 border-b border-emerald-950">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shrink-0">
                                        <Leaf className="h-4 w-4" />
                                    </div>
                                    Historial de Fenología del Lote
                                </CardTitle>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                                    Bitácora Agronómica
                                </span>
                            </div>
                            <CardDescription className="text-emerald-100/70 text-[11px] mt-0.5">
                                Registros fisiológicos documentados durante el ciclo de floración y cuajado del cultivo.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 pt-4">
                            <ul className="space-y-3">
                                {data.phenologyLogs.map((log, index) => {
                                    const Icon = phenologyIcons[log.developmentState] || Info;
                                    return (
                                        <li key={index} className="p-3.5 bg-[#FAF9F6] rounded-xl border border-stone-200 hover:border-stone-300 transition-colors space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-md bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <p className="font-bold text-xs sm:text-sm text-[#0D2618]">{log.developmentState}</p>
                                                    {(() => {
                                                        const rawBatch = log.batchId || (log.batchIds && log.batchIds.length > 0 ? log.batchIds.join(', ') : null);
                                                        if (!rawBatch) return null;
                                                        const match = rawBatch.match(/Lote\s*(\d+)/i) || rawBatch.match(/L(\d+)/i);
                                                        const displayBatch = match ? `L${match[1].padStart(3, '0')}` : rawBatch.split(':')[0].trim();
                                                        return (
                                                            <span className="text-[9px] font-bold bg-stone-200/80 text-stone-700 px-1.5 py-0.2 rounded border border-stone-300">
                                                                {displayBatch}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-[11px] text-stone-600 font-mono font-medium">
                                                    {new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>

                                            <p className="text-xs text-stone-700 leading-relaxed">
                                                {log.notes}
                                            </p>

                                            {(log.flowerCount && log.flowerCount > 0) || (log.fruitCount && log.fruitCount > 0) ? (
                                                <div className="flex flex-wrap gap-2 pt-0.5">
                                                    {log.flowerCount && log.flowerCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white text-stone-800 px-2 py-0.5 rounded border border-stone-300 shadow-2xs">
                                                            <Flower className="h-3 w-3 text-stone-500" />
                                                            {log.flowerCount} Flores
                                                        </span>
                                                    ) : null}
                                                    {log.fruitCount && log.fruitCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-[#196F3D] px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                                            <Grape className="h-3 w-3 text-[#196F3D]" />
                                                            {log.fruitCount} Frutos
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {log.images && log.images.length > 0 && (
                                                <div className={`mt-2 grid gap-2 ${log.images.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
                                                    {log.images.map((img, imgIdx) => (
                                                        <div 
                                                            key={imgIdx}
                                                            className="relative aspect-square rounded-lg overflow-hidden border border-stone-300 shadow-2xs cursor-pointer group bg-stone-100"
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
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-stone-800 shadow-md flex items-center gap-1">
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
            <footer className="max-w-4xl mx-auto text-center mt-8 pt-4 border-t border-stone-200/80 space-y-1.5">
                <p className="text-[11px] text-stone-500">
                    Sistema de Trazabilidad Agrícola • <span className="font-semibold text-stone-700">AgroVista</span>
                </p>
                <div className="flex items-center justify-center gap-2.5 text-[10px] text-stone-500">
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

            {/* MODAL BPA CERTIFICACIÓN CON SELLO AL 100% */}
            <Dialog open={showBpaModal} onOpenChange={setShowBpaModal}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-2xl bg-white text-[#18201C] border border-stone-200 shadow-2xl flex flex-col">
                    <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-emerald-950 bg-[#0F2A1D] text-white relative z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] sm:min-w-[56px] sm:min-h-[56px] sm:max-w-[56px] sm:max-h-[56px] rounded-full bg-white border border-emerald-600/60 shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                                <Image 
                                    src="/logoBPA-sinfondo.png" 
                                    alt="Sello Oficial BPA" 
                                    fill
                                    sizes="(max-width: 640px) 48px, 56px"
                                    className="object-contain p-0.5" 
                                />
                            </div>
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[9px] font-bold uppercase tracking-wider mb-1">
                                    <ShieldCheck className="h-3 w-3" /> Protocolo AgroVista G.A.P.
                                </div>
                                <DialogTitle className="text-lg sm:text-xl font-extrabold text-white">
                                    Buenas Prácticas Agrícolas
                                </DialogTitle>
                                <DialogDescription className="text-emerald-100/80 text-[11px] sm:text-xs pt-0.5 leading-relaxed">
                                    Inocuidad alimentaria, cuidado ambiental y trazabilidad auditados en origen.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-5 pt-3.5 space-y-3 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5 sm:col-span-2">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Award className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-[#0D2618] flex items-center gap-1.5">
                                        Auditoría Oficial del Establecimiento
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                        Inspección técnica de lotes, registros fitosanitarios y condiciones de empaque conforme a estándares de calidad provincial y nacional.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-[#0D2618] flex items-center gap-1.5">
                                        Carencia PHI Cumplida
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                        Período de carencia fitosanitaria verificado al 100% antes del corte de la fruta. Cero residuos químicos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-[#0D2618] flex items-center gap-1.5">
                                        Agua y Riego Seguro
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                        Riego por goteo automatizado con análisis periódico de fuentes de agua.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Leaf className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-[#0D2618] flex items-center gap-1.5">
                                        Manejo Integrado (MIP)
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                        Monitoreo continuo de plagas y priorización de control biológico en lote.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Package className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-[#0D2618] flex items-center gap-1.5">
                                        Higiene de Recolección
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[#196F3D] shrink-0" />
                                    </h4>
                                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                                        Manipulación protegida, bandejas higiénicas y despacho ágil hacia destino comercial.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[10px] text-stone-500 font-mono font-semibold">
                                CERTIFICADO DIGITAL AGROVISTA • AUDITADO
                            </p>
                            <Button 
                                onClick={() => setShowBpaModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-5 border-stone-300 hover:bg-stone-50 h-8"
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
                    <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-emerald-950 bg-[#0F2A1D] text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 flex items-center justify-center shrink-0">
                                <Home className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                    <span className="truncate">{data?.establishmentName || 'Quinta Las Fresas'}</span>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                </DialogTitle>
                                <DialogDescription className="text-[11px] text-emerald-100/70 mt-0.5 truncate">
                                    {data?.establishmentData?.locality || 'Coronda'}, {data?.establishmentData?.province || 'Santa Fe'} • Producción Frutillera Certificada
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-5 pt-3.5 space-y-3.5 overflow-y-auto flex-1">
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
                                <div className="space-y-2">
                                    <div 
                                        className="relative h-44 sm:h-56 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs group cursor-pointer"
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
                                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                                            <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded font-mono text-[10px]">
                                                {activeEstablishmentImg + 1} / {rawImages.length}
                                            </span>
                                            <span className="bg-stone-900/80 backdrop-blur-md px-2 py-0.5 rounded font-medium text-[10px] flex items-center gap-1">
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
                                                    className={`relative h-12 w-16 sm:h-14 sm:w-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-stone-100 ${
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Home className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Sistema Productivo</p>
                                    <p className="text-xs font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.system || 'Microtúneles de Precisión'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Sprout className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Variedades Cultivadas</p>
                                    <p className="text-xs font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.variety || 'San Andreas, Camarosa'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <Droplet className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Sistema de Riego</p>
                                    <p className="text-xs font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.irrigationSystem || 'Riego por goteo automatizado'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0F2A1D] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Dirección Técnica</p>
                                    <p className="text-xs font-bold text-[#0D2618] mt-0.5 truncate">
                                        {data?.establishmentData?.technicalManager || 'Ing. Agrónomo Colegiado'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2.5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[10px] text-stone-500 font-mono font-semibold">
                                ORIGEN E INOCUIDAD AUDITADOS • AGROVISTA
                            </p>
                            <Button 
                                onClick={() => setShowEstablishmentModal(false)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs font-semibold px-5 border-stone-300 hover:bg-stone-50 h-8"
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
