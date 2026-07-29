'use client';

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { CloudRain, Wind, Thermometer, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type WeatherData = {
  temperature: number;
  windSpeed: number;
  rainProbability: number;
};

export function WeatherCard() {
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
    <Card className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-border/50 shadow-sm px-4 py-2 hover:bg-white/90 dark:hover:bg-slate-900/90 transition-colors">
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-1 h-[24px]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando clima...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5" title="Temperatura">
            <div className="bg-orange-500/10 text-orange-600 p-1.5 rounded-md">
              <Thermometer className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">{weather?.temperature}°C</span>
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex items-center gap-1.5" title="Velocidad del viento">
            <div className="bg-blue-500/10 text-blue-600 p-1.5 rounded-md">
              <Wind className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">{weather?.windSpeed} km/h</span>
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex items-center gap-1.5" title="Probabilidad de lluvia">
            <div className="bg-cyan-500/10 text-cyan-600 p-1.5 rounded-md">
              <CloudRain className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">{weather?.rainProbability}%</span>
          </div>
        </>
      )}
    </Card>
  );
}
