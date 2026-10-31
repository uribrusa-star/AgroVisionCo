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
}

export function FeatureMockupDialog({
  title,
  previewSrc,
  mobileSrc,
  desktopSrc,
  altText,
}: FeatureMockupDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="rounded-2xl mb-6 shadow-md overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800 w-full cursor-pointer group">
          <Image
            src={previewSrc}
            alt={altText}
            width={800}
            height={500}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover aspect-[2/1] w-full h-auto group-hover:scale-105 transition-transform duration-500"
          />
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
            unoptimized
            className="w-full h-auto rounded-xl object-contain"
          />
        </div>
        {/* Vista para PC */}
        <div className="hidden sm:block">
          <Image
            src={desktopSrc}
            alt={altText}
            width={1920}
            height={1080}
            quality={100}
            unoptimized
            className="w-full h-auto rounded-lg object-contain max-h-[90vh]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
