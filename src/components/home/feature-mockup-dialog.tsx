'use client';

import React from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FeatureMockupDialogProps {
  title: string;
  previewSrc: string;
  mobileSrc: string;
  desktopSrc: string;
  altText: string;
  className?: string;
}

export function FeatureMockupDialog({
  title,
  previewSrc,
  mobileSrc,
  desktopSrc,
  altText,
  className,
}: FeatureMockupDialogProps) {
  return (
    <Dialog>
      <div className={`w-full ${className ?? 'mb-6'}`}>
        <DialogTrigger asChild>
          <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer group">
            {/* Contenedor de la captura limpia, sin overlays que tapen datos */}
            <div className="relative aspect-[3320/1896] w-full bg-stone-50 dark:bg-stone-900/50">
              <Image
                src={previewSrc}
                alt={altText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 65vw"
                quality={100}
                unoptimized={true}
                className="object-contain object-top"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          </div>
        </DialogTrigger>

        {/* Acción de ampliar ubicada fuera del gráfico */}
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-2.5 ml-auto flex items-center justify-end gap-1.5 text-xs text-stone-500 hover:text-[#196F3D] dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer group"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#196F3D] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Ampliar captura en alta resolución</span>
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Vista para celulares */}
        <div className="sm:hidden max-h-[85vh] overflow-y-auto rounded-2xl bg-black/85 backdrop-blur-md p-1.5 scrollbar-hide">
          <Image
            src={mobileSrc}
            alt={altText}
            width={750}
            height={1334}
            quality={100}
            unoptimized={true}
            className="w-full h-auto rounded-xl object-contain"
          />
        </div>
        {/* Vista para PC */}
        <div className="hidden sm:flex justify-center items-center p-1">
          <Image
            src={desktopSrc}
            alt={altText}
            width={3320}
            height={1896}
            quality={100}
            unoptimized={true}
            className="w-auto h-auto rounded-xl object-contain max-h-[90vh] shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
