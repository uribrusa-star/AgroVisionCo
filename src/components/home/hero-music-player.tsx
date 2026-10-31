'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Music, Volume2 } from 'lucide-react';

export function HeroMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowMenu(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {!isPlaying ? (
        <button
          type="button"
          className="relative group cursor-pointer focus:outline-none"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.volume = volume;
              audioRef.current.play().catch(() => {});
              setIsPlaying(true);
              setShowMenu(true);
              resetTimeout();
            }
          }}
          aria-label="Reproducir música de bienvenida"
        >
          <Image
            src="/logo.png"
            alt="Logo AgroVista"
            width={40}
            height={40}
            className="h-10 w-auto group-hover:scale-105 transition-transform"
          />
        </button>
      ) : (
        <div 
          className="relative flex items-center"
          onMouseEnter={() => {
            setShowMenu(true);
            resetTimeout();
          }}
          onMouseMove={resetTimeout}
        >
          <button
            type="button"
            className="cursor-pointer text-green-600 dark:text-green-400 hover:text-green-700 animate-pulse focus:outline-none"
            onClick={() => {
              setIsPlaying(false);
              setShowMenu(false);
              if (audioRef.current) {
                audioRef.current.pause();
              }
            }}
            aria-label="Pausar música"
          >
            <Music className="w-8 h-8 drop-shadow-sm" />
          </button>
          
          {/* Music Player Popover (Minimalist) */}
          <div 
            className={`absolute top-full left-0 mt-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 shadow-sm rounded-md p-3 flex flex-col gap-4 min-w-[140px] z-50 transition-all duration-500 ease-in-out ${
              showMenu ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium tracking-wider text-stone-500 uppercase">Volumen</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-stone-400" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setVolume(newVol);
                  if (audioRef.current) {
                    audioRef.current.volume = newVol;
                  }
                  resetTimeout();
                }}
                className="w-full accent-stone-700 dark:accent-stone-400 h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
      <audio 
        ref={audioRef} 
        src="/huevo-de-pascua.mp3" 
        preload="none" 
        loop
      />
      <span className="text-xl font-bold text-green-800 dark:text-green-400 font-headline">AgroVista</span>
    </div>
  );
}
