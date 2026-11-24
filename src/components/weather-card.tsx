'use client';

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { CloudRain, Wind, Thermometer, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type WeatherData = {
  temperature: number;
  windSpeed: number;
  rainProbability: number;
};

interface WeatherCardProps {
  compact?: boolean;
  className?: string;
}

export function WeatherCard({ compact = false, className }: WeatherCardProps = {}) {
  const { establishmentData } = useContext(AppDataContext);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const coords = useMemo(() => {
    if (establishmentData?.location?.coordinates) {
      const [lat, lng] = establishmentData.location.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return { lat: -31.9533, lng: -60.9346 }; // Default: Coronda
  }, [establishmentData]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=auto`);
        
        if (!res.ok) {
            setError(true);
            setLoading(false);
            return;
        }
        
        const data = await res.json();
        
        // Get current hour index to find probability of rain
        const currentHour = new Date().getHours();
        const rainProb = data.hourly?.precipitation_probability?.[currentHour] || 0;
        
        setWeather({
          temperature: data.current?.temperature_2m || 0,
          windSpeed: data.current?.wind_speed_10m || 0,
          rainProbability: rainProb,
        });
      } catch (err) {
        // Silently catch network errors to avoid Next.js dev overlay
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords.lat, coords.lng]);

  if (error) return null;

  return (
    <Card
      className={cn(
        "flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-border/50 shadow-xs hover:bg-white/90 dark:hover:bg-slate-900/90 transition-colors shrink-0",
        compact
          ? "gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs"
          : "gap-4 px-4 py-2 shadow-sm",
        className
      )}
    >
      {loading ? (
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", compact ? "text-[11px] py-0.5" : "text-sm py-1 h-[24px]")}>
          <Loader2 className={cn("animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />
          <span>{compact ? "Clima..." : "Cargando clima..."}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-0.5 sm:gap-1" title="Temperatura">
            <div className={cn("bg-orange-500/10 text-orange-600 rounded", compact ? "p-0.5" : "p-1.5")}>
              <Thermometer className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            </div>
            <span className={cn("font-bold text-foreground", compact ? "text-[11px] sm:text-xs" : "text-sm")}>
              {weather?.temperature}°C
            </span>
          </div>

          <div className={cn("w-px bg-border/60", compact ? "h-3" : "h-6")}></div>

          <div
            className="flex items-center gap-0.5 sm:gap-1"
            title="Velocidad del viento"
          >
            <div className={cn("bg-blue-500/10 text-blue-600 rounded", compact ? "p-0.5" : "p-1.5")}>
              <Wind className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            </div>
            <span className={cn("font-semibold text-foreground", compact ? "text-[11px] sm:text-xs" : "text-sm")}>
              {weather?.windSpeed} <span className={cn(compact ? "text-[9px] sm:text-[10px] text-muted-foreground" : "text-xs")}>km/h</span>
            </span>
          </div>

          <div className={cn("w-px bg-border/60", compact ? "h-3" : "h-6")}></div>

          <div
            className="flex items-center gap-0.5 sm:gap-1"
            title="Probabilidad de lluvia"
          >
            <div className={cn("bg-cyan-500/10 text-cyan-600 rounded", compact ? "p-0.5" : "p-1.5")}>
              <CloudRain className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            </div>
            <span className={cn("font-semibold text-foreground", compact ? "text-[11px] sm:text-xs" : "text-sm")}>
              {weather?.rainProbability}%
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
