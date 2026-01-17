'use server';

/**
 * @fileOverview Summarizes the complete agronomist log data for a technical report.
 *
 * - summarizeAgronomistReport - A function that summarizes agronomist data for a PDF report.
 * - SummarizeAgronomistReportInput - The input type for the function.
 * - SummarizeAgronomistReportOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAgronomistReportInputSchema = z.object({
  agronomistLogs: z
    .string()
    .describe('JSON string con la bitácora de aplicaciones, riegos, labores culturales, etc.'),
  phenologyLogs: z
    .string()
    .describe('JSON string con la bitácora de seguimiento fenológico del cultivo.'),
});
export type SummarizeAgronomistReportInput = z.infer<typeof SummarizeAgronomistReportInputSchema>;

const SummarizeAgronomistReportOutputSchema = z.object({
  technicalAnalysis: z
    .string()
    .describe(
      'Análisis técnico y objetivo de las bitácoras. Interpreta las prácticas realizadas, su frecuencia y posible impacto.'
    ),
  conclusionsAndRecommendations: z
    .string()
    .describe(
      'Conclusiones clave y recomendaciones agronómicas para mejorar el manejo del cultivo.'
    ),
});
export type SummarizeAgronomistReportOutput = z.infer<typeof SummarizeAgronomistReportOutputSchema>;

export async function summarizeAgronomistReport(
  input: SummarizeAgronomistReportInput
): Promise<SummarizeAgronomistReportOutput> {
  return summarizeAgronomistReportFlow(input);
}

const prompt = ai.definePrompt({
    name: 'summarizeAgronomistReportPrompt',
    input: {schema: SummarizeAgronomistReportInputSchema},
    output: {schema: SummarizeAgronomistReportOutputSchema},
    prompt: `Eres un consultor agrónomo experto en la producción de frutillas. Tu tarea es generar el contenido para un informe técnico en español, basado en las bitácoras proporcionadas. El informe debe ser profesional, técnico y orientado a la acción.

    **Instrucciones:**
    1.  **Analiza los datos en silencio**: Revisa toda la información de la bitácora de actividades ({{{agronomistLogs}}}) y la bitácora de fenología ({{{phenologyLogs}}}).
    2.  **Redacta las siguientes secciones en español, usando un lenguaje técnico y preciso:**

        *   **Análisis Técnico**: Redacta un análisis objetivo y detallado.
            *   Evalúa las prácticas de manejo registradas. ¿Son consistentes? ¿Hay patrones en las aplicaciones de fertilizantes o fitosanitarios?
            *   Relaciona las actividades de la bitácora con los estados fenológicos. ¿Se aplicaron los productos correctos en el momento adecuado (ej. fertilizantes de floración durante la floración)?
            *   Identifica posibles áreas de mejora o riesgos basándote en las notas y observaciones de las bitácoras. Por ejemplo, si se registra "Botritis" y luego una "Fumigación", evalúa si la respuesta fue oportuna.

        *   **Conclusiones y Recomendaciones**: Basado en tu análisis, proporciona de 2 a 4 conclusiones clave y recomendaciones agronómicas.
            *   Las recomendaciones deben ser específicas y técnicas. Por ejemplo: "Ajustar la dosis de nitrógeno en la etapa de fructificación para evitar un exceso de vigor vegetativo" o "Implementar un programa de monitoreo de ácaros más frecuente en los meses de mayor temperatura".
            *   Justifica cada recomendación con los datos de las bitácoras.

    **Datos para el Análisis:**
    -   **Bitácora de Actividades Agronómicas**: {{{agronomistLogs}}}
    -   **Bitácora de Fenología**: {{{phenologyLogs}}}

    Genera únicamente el contenido para las secciones solicitadas en el formato de salida JSON especificado.
    `,
  });

const summarizeAgronomistReportFlow = ai.defineFlow(
  {
    name: 'summarizeAgronomistReportFlow',
    inputSchema: SummarizeAgronomistReportInputSchema,
    outputSchema: SummarizeAgronomistReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('El resumen del informe no generó una respuesta.');
    }
    return output;
  }
);
