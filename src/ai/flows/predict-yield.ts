'use server';

/**
 * @fileOverview Predicts future crop yield based on various data points.
 *
 * - predictYield - A function that calls the prediction flow.
 * - PredictYieldInput - The input type for the function.
 * - PredictYieldOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherForecast } from '../tools/weather-tool';

const PredictYieldInputSchema = z.object({
  batchId: z.string().describe('El ID del lote para el cual se hace la predicción.'),
  batchVarieties: z.string().describe('Las variedades plantadas en el lote.'),
  batchArea: z.number().describe('El tamaño del lote en hectáreas.'),
  varietyKnowledge: z.string().describe('Conocimiento botánico y teórico sobre las variedades plantadas en el lote.'),
  latitude: z.number().describe('La latitud del establecimiento.'),
  longitude: z.number().describe('La longitud del establecimiento.'),
  recentHarvests: z.string().describe('JSON string con los datos de las últimas cosechas del lote (puede estar vacío si aún no hay).'),
  agronomistLogs: z.string().describe('JSON string con la bitácora de actividades agronómicas recientes (fertilización, riego, etc.).'),
  phenologyLogs: z.string().describe('JSON string con la bitácora de seguimiento fenológico reciente (floración, fructificación).'),
  environmentalLogs: z.string().describe('JSON string con los registros de condiciones ambientales recientes (temperatura, humedad).'),
});
export type PredictYieldInput = z.infer<typeof PredictYieldInputSchema>;

const PredictYieldOutputSchema = z.object({
  prediction: z
    .string()
    .describe(
      'Una predicción de rendimiento para la próxima semana, cualitativa y concisa. Debe incluir un porcentaje estimado de cambio (aumento/disminución) y las razones clave.'
    ),
  confidence: z
    .enum(['Alta', 'Media', 'Baja'])
    .describe('El nivel de confianza en la predicción.'),
});
export type PredictYieldOutput = z.infer<typeof PredictYieldOutputSchema>;

export async function predictYield(
  input: PredictYieldInput
): Promise<PredictYieldOutput> {
  return predictYieldFlow(input);
}

const prompt = ai.definePrompt({
    name: 'predictYieldPrompt',
    input: {schema: PredictYieldInputSchema},
    output: {schema: PredictYieldOutputSchema},
    tools: [getWeatherForecast],
    prompt: `Eres un ingeniero agrónomo experto en frutillas con capacidades de análisis de datos y modelado predictivo. Tu tarea es generar una proyección de rendimiento para un lote específico para la próxima semana.

    **Instrucciones:**
    1.  **Obtén el pronóstico del tiempo**: Usa la herramienta 'getWeatherForecast' con la latitud y longitud proporcionadas para obtener el pronóstico climático para los próximos 7 días.
    2.  **Analiza en silencio los datos proporcionados**: Revisa el pronóstico del tiempo, los datos de cosechas recientes, las actividades agronómicas, el estado fenológico, las condiciones ambientales pasadas, y CRUCIALMENTE, la genética de la variedad ({{{varietyKnowledge}}}) y el tamaño del lote ({{{batchArea}}} ha).
    3.  **Sintetiza la información**: Identifica los factores clave que influirán en el rendimiento.
        *   Si **hay** cosechas recientes: ¿La tendencia es ascendente, descendente o estable? ¿Cómo impacta la fenología actual y la genética de la variedad en el próximo pico de cosecha de las {{{batchArea}}} hectáreas?
        *   Si **no hay** cosechas recientes: Utiliza el estado fenológico (ej. inicio de floración), el clima proyectado y la ficha técnica de la variedad para estimar cuándo comenzará la cosecha y proyectar el primer volumen esperado para un lote de {{{batchArea}}} hectáreas.
    4.  **Genera una Predicción (en español)**:
        *   Redacta una predicción clara y concisa (máximo 2-3 frases).
        *   Si hay historial de cosecha, incluye una estimación porcentual del cambio. Si no hay historial, estima un volumen inicial en kg basándote en la variedad y el tamaño del lote.
        *   Justifica la predicción mencionando factores influyentes (clima, fenología o curva de la variedad).
    5.  **Establece el Nivel de Confianza**: Basado en la calidad y consistencia de los datos, determina si tu confianza en la predicción es 'Alta', 'Media' o 'Baja'.

    **Datos para el Análisis:**
    -   **Ubicación**: Latitud {{{latitude}}}, Longitud {{{longitude}}}
    -   **Lote a Predecir**: {{{batchId}}}
    -   **Variedades**: {{{batchVarieties}}}
    -   **Tamaño del Lote**: {{{batchArea}}} hectáreas
    -   **Ficha Botánica de las Variedades**: {{{varietyKnowledge}}}
    -   **Cosechas Recientes del Lote**: {{{recentHarvests}}}
    -   **Actividades Agronómicas Recientes**: {{{agronomistLogs}}}
    -   **Fenología Reciente**: {{{phenologyLogs}}}
    -   **Condiciones Ambientales Pasadas**: {{{environmentalLogs}}}

    Genera únicamente el contenido para la predicción y la confianza en el formato de salida JSON especificado.
    `,
  });

const predictYieldFlow = ai.defineFlow(
  {
    name: 'predictYieldFlow',
    inputSchema: PredictYieldInputSchema,
    outputSchema: PredictYieldOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('La predicción de rendimiento no generó una respuesta.');
    }
    return output;
  }
);
