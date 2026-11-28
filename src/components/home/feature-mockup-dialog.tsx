'use client';

import React from 'react';
import Image from 'next/image';
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
          <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer">
            {/* Contenedor de la captura 100% limpia sin botones ni overlays */}
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
