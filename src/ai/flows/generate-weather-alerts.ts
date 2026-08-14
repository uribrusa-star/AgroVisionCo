'use server';

/**
 * @fileOverview Generates agronomic alerts based on weather forecasts for a given location.
 *
 * - generateWeatherAlerts - A function that calls the alert generation flow.
 * - GenerateWeatherAlertsInput - The input type for the function.
 * - GenerateWeatherAlertsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherForecast } from '@/ai/tools/weather-tool';

const GenerateWeatherAlertsInputSchema = z.object({
  latitude: z.number().describe('La latitud para la cual obtener el pronóstico del tiempo.'),
  longitude: z.number().describe('La longitud para la cual obtener el pronóstico del tiempo.'),
  phenologyLogs: z.string().describe('JSON string con la bitácora de seguimiento fenológico reciente (floración, fructificación, etc.) para entender el estado actual del cultivo.'),
  agronomistLogs: z.string().describe('JSON string con el historial de actividades agronómicas recientes (fumigaciones, fertilización) para contexto adicional.'),
});
export type GenerateWeatherAlertsInput = z.infer<typeof GenerateWeatherAlertsInputSchema>;

const AlertSchema = z.object({
    risk: z.string().describe('El riesgo principal identificado (ej. "Riesgo de Botrytis por Lluvias Intensas", "Heladas Tardías").'),
    eventDate: z.string().optional().describe('El día o período específico donde se prevé la mayor intensidad del evento (ej. "Viernes 18 (35 mm)", "Madrugada del Jueves (1°C)").'),
    recommendation: z.string().describe('Una recomendación clara y accionable indicando el día crítico y la acción preventiva.'),
    urgency: z.enum(['Alta', 'Media', 'Baja']).describe('El nivel de urgencia de la alerta.')
});

const GenerateWeatherAlertsOutputSchema = z.object({
  alerts: z.array(AlertSchema).describe('Un arreglo de una o más alertas y recomendaciones generadas por la IA.'),
});
export type GenerateWeatherAlertsOutput = z.infer<typeof GenerateWeatherAlertsOutputSchema>;

export async function generateWeatherAlerts(
  input: GenerateWeatherAlertsInput
): Promise<GenerateWeatherAlertsOutput> {
  return generateWeatherAlertsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateWeatherAlertsPrompt',
    input: {schema: GenerateWeatherAlertsInputSchema},
    output: {schema: GenerateWeatherAlertsOutputSchema},
    tools: [getWeatherForecast],
    prompt: `Eres un ingeniero agrónomo experto en frutillas y análisis de riesgos climáticos. Tu tarea es generar alertas y recomendaciones basadas en el pronóstico del tiempo para una ubicación específica.

    **Instrucciones Obligatorias:**

    1.  **Obtén y Analiza el Pronóstico:** Utiliza la herramienta \`getWeatherForecast\` con la latitud ({{{latitude}}}) y longitud ({{{longitude}}}) proporcionadas para obtener el pronóstico a 7 días. Este es tu dato principal.
    2.  **Identifica los Días Específicos:** Si el pronóstico indica lluvias o heladas, ESPECIFICA EL DÍA O DÍAS EXACTOS de la semana con mayor intensidad o mayor riesgo acumulado (ejemplo: "Viernes (28 mm)" o "Madrugada del Jueves (1°C)").
    3.  **Cruza la Información:** Compara el pronóstico del tiempo obtenido con el estado actual del cultivo (dado por \`phenologyLogs\` y \`agronomistLogs\`). Por ejemplo, si el pronóstico indica lluvias persistentes y los registros de fenología muestran "Fructificación" o "Maduración", el riesgo de "Botrytis" es ALTO. Si el pronóstico indica temperaturas bajo cero o cercanas a 0°C, el riesgo de "helada" es crítico.
    4.  **Genera Alertas Claras:** Para cada riesgo significativo que identifiques, crea una alerta en español.
        *   **Riesgo:** Sé conciso y claro. Ej: "Riesgo Severo de Botrytis por Lluvias Intensas".
        *   **eventDate:** Indica el día exacto de mayor afectación. Ej: "Viernes 18 de Agosto (32 mm acumulados)".
        *   **Recomendación:** Debe ser una acción concreta especificando qué hacer antes o después del día del evento. Ej: "Se prevé mayor lluvia el Viernes (32mm). Asegurar ventilación de microtúneles el sábado y aplicar fungicida preventivo previo al evento".
        *   **Urgencia:** Determina la urgencia ('Alta', 'Media', 'Baja') basándote en el impacto potencial.
    5.  **Respuesta Mínima:** Siempre debes generar al menos una alerta. Si el clima es ideal y no hay riesgos, genera una alerta de urgencia 'Baja' con un riesgo como "Condiciones óptimas de cultivo" y una recomendación como "Mantener monitoreo regular sin riesgos climáticos inminentes".

    **Datos de Contexto:**
    -   **Estado Fenológico:** {{{phenologyLogs}}}
    -   **Actividades Recientes:** {{{agronomistLogs}}}

    Genera únicamente la salida JSON con el arreglo de alertas. No incluyas ningún texto introductorio o explicaciones adicionales.
    `,
  });

const generateWeatherAlertsFlow = ai.defineFlow(
  {
    name: 'generateWeatherAlertsFlow',
    inputSchema: GenerateWeatherAlertsInputSchema,
    outputSchema: GenerateWeatherAlertsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('La generación de alertas no produjo una respuesta.');
    }
    return output;
  }
);
