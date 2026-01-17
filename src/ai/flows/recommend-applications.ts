'use server';

/**
 * @fileOverview Generates application recommendations for crops.
 *
 * - recommendApplications - A function that calls the recommendation generation flow.
 * - RecommendApplicationsInput - The input type for the function.
 * - RecommendApplicationsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherForecast } from '@/ai/tools/weather-tool';

const RecommendApplicationsInputSchema = z.object({
  latitude: z.number().describe('La latitud para la cual obtener el pronóstico del tiempo.'),
  longitude: z.number().describe('La longitud para la cual obtener el pronóstico del tiempo.'),
  supplies: z.string().describe('JSON string con el inventario de insumos disponibles (fertilizantes, fungicidas, insecticidas). Incluye `name`, `type` y `composition`.'),
  agronomistLogs: z.string().describe('JSON string con la bitácora de actividades agronómicas recientes para entender el manejo actual.'),
  phenologyLogs: z.string().describe('JSON string con la bitácora de seguimiento fenológico reciente (floración, fructificación, etc.) para entender el estado actual del cultivo.'),
});
export type RecommendApplicationsInput = z.infer<typeof RecommendApplicationsInputSchema>;

const RecommendationSchema = z.object({
    recommendation: z.string().describe('La recomendación de aplicación o labor a realizar. Debe ser clara y accionable.'),
    reason: z.string().describe('La justificación técnica de por qué se recomienda esta acción, basada en los datos provistos.'),
    urgency: z.enum(['Alta', 'Media', 'Baja']).describe('El nivel de urgencia de la recomendación.'),
    suggestedProducts: z.array(z.string()).describe('Una lista de nombres de productos del inventario de insumos que son adecuados para esta aplicación.')
});

const RecommendApplicationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('Un arreglo de una o más recomendaciones de aplicación generadas por la IA.'),
});
export type RecommendApplicationsOutput = z.infer<typeof RecommendApplicationsOutputSchema>;

export async function recommendApplications(
  input: RecommendApplicationsInput
): Promise<RecommendApplicationsOutput> {
  return recommendApplicationsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'recommendApplicationsPrompt',
    input: {schema: RecommendApplicationsInputSchema},
    output: {schema: RecommendApplicationsOutputSchema},
    tools: [getWeatherForecast],
    prompt: `Eres un ingeniero agrónomo experto en el cultivo de frutillas, encargado de planificar las aplicaciones y labores para la semana. Tu objetivo es generar recomendaciones proactivas y eficientes.

    **Instrucciones:**
    1.  **Obtén el pronóstico**: Usa la herramienta 'getWeatherForecast' con la latitud y longitud para obtener el pronóstico del tiempo.
    2.  **Analiza en silencio los datos proporcionados**: Revisa el estado fenológico ({{{phenologyLogs}}}), las actividades recientes ({{{agronomistLogs}}}), el inventario de insumos ({{{supplies}}}) y el pronóstico del tiempo.
    3.  **Identifica necesidades y oportunidades**:
        *   ¿Hay una plaga o enfermedad registrada que necesite tratamiento? Cruza esta información con los fungicidas/insecticidas disponibles en el inventario, revisando su campo 'composition'.
        *   ¿El estado fenológico (ej. inicio de floración) requiere una fertilización específica? Busca un fertilizante adecuado en el inventario revisando su 'composition'.
        *   ¿El pronóstico del tiempo (ej. lluvias) aumenta el riesgo de enfermedades como Botrytis? Recomienda una aplicación preventiva si tienes un fungicida apropiado.
        *   ¿Hay un período prolongado sin una labor cultural importante (ej. deshoje)? Recomiéndala.
    4.  **Genera Recomendaciones (en español)**:
        *   Crea una o más recomendaciones detalladas.
        *   **Recomendación**: Debe ser una acción específica. Ej: "Realizar aplicación preventiva de fungicida para control de Botrytis."
        *   **Justificación**: Explica por qué. Ej: "Debido a las lluvias pronosticadas y al estado de fructificación, el riesgo de Botrytis es alto."
        *   **Urgencia**: 'Alta' para problemas inminentes o críticos, 'Media' para oportunidades de optimización, 'Baja' para mantenimiento.
        *   **Productos Sugeridos**: Lista los nombres de los productos del inventario que sirven para la labor. Si es una labor cultural, deja el arreglo vacío.
    5.  Genera al menos una recomendación, incluso si es solo de monitoreo o mantenimiento general.

    **Datos para el Análisis:**
    -   **Ubicación**: Latitud {{{latitude}}}, Longitud {{{longitude}}}
    -   **Insumos Disponibles**: {{{supplies}}}
    -   **Actividades Recientes**: {{{agronomistLogs}}}
    -   **Fenología Reciente**: {{{phenologyLogs}}}

    Genera únicamente la salida JSON con el arreglo de recomendaciones.
    `,
  });

const recommendApplicationsFlow = ai.defineFlow(
  {
    name: 'recommendApplicationsFlow',
    inputSchema: RecommendApplicationsInputSchema,
    outputSchema: RecommendApplicationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('La recomendación de aplicaciones no generó una respuesta.');
    }
    return output;
  }
);
