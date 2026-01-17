'use server';
/**
 * @fileoverview Defines a Genkit tool for fetching weather forecasts.
 *
 * This file creates a tool that the AI can use to get weather information
 * for a specific latitude and longitude from the Open-Meteo API.
 */

import { ai } from '@/ai/genkit';
import { getWeather } from '@/services/weather-service';
import { z } from 'zod';

export const getWeatherForecast = ai.defineTool(
  {
    name: 'getWeatherForecast',
    description: 'Obtiene el pronóstico del tiempo para una latitud y longitud específicas.',
    inputSchema: z.object({
      latitude: z.number().describe('La latitud para la ubicación.'),
      longitude: z.number().describe('La longitud para la ubicación.'),
    }),
    outputSchema: z.string().describe('Un resumen en texto del pronóstico del tiempo para los próximos 5 días, incluyendo temperaturas, probabilidad de lluvia y velocidad del viento.'),
  },
  async (input) => {
    return await getWeather(input.latitude, input.longitude);
  }
);
