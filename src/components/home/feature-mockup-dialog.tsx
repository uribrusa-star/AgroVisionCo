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
      <DialogTrigger asChild>
        <div className={`rounded-2xl shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group relative aspect-[3320/1896] bg-stone-100 dark:bg-stone-800 ${className ?? 'mb-6'}`}>
          <Image
            src={previewSrc}
            alt={altText}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 65vw"
            quality={100}
            unoptimized={true}
            className="object-contain object-top group-hover:scale-[1.015] transition-transform duration-300"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="bg-white/95 dark:bg-stone-900/95 text-stone-900 dark:text-stone-100 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
              <Maximize2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              Ampliar captura en alta definición
            </span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl p-0 border-none bg-transparent shadow-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Vista para celulares */}
        <div className="sm:hidden max-h-[85vh] overflow-y-auto rounded-2xl bg-black/80 backdrop-blur-md p-1.5 scrollbar-hide">
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
