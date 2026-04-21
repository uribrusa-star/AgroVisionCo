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
  agronomistLogs: z.string(),
  phenologyLogs: z.string(),
  establishmentData: z.string().optional(),
});
export type SummarizeAgronomistReportInput = z.infer<typeof SummarizeAgronomistReportInputSchema>;

const SummarizeAgronomistReportOutputSchema = z.object({
  executiveSummary: z.object({
    generalStatus: z.enum(['Óptimo', 'Atención', 'Riesgo']),
    climateRisk: z.enum(['Bajo', 'Medio', 'Alto']),
    conclusions: z.array(z.string()),
    mainRecommendation: z.string(),
  }),
  technicalAnalysis: z.object({
    climate: z.object({ desc: z.string(), risk: z.string() }),
    phenology: z.object({ desc: z.string(), risk: z.string() }),
    management: z.object({ desc: z.string(), risk: z.string() }),
    health: z.object({ desc: z.string(), risk: z.string() }),
  }),
  alerts: z.array(z.object({
    date: z.string(),
    event: z.string(),
    risk: z.enum(['Bajo', 'Medio', 'Alto', 'Crítico']),
    recommendation: z.string(),
  })),
  recommendations: z.array(z.object({
    title: z.string(),
    problem: z.string(),
    action: z.string(),
  })),
  aiInsight: z.string(),
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
    prompt: `Eres un consultor agrónomo senior especializado en frutillas en la región de Coronda, Argentina. 
    Tu objetivo es analizar los datos del establecimiento y generar un reporte técnico de alta calidad para el productor.

    **Contexto del Establecimiento:**
    {{{establishmentData}}}

    **Datos a analizar:**
    - Bitácora Agronómica (Fertilizaciones, Riegos, Sanidad): {{{agronomistLogs}}}
    - Bitácora de Fenología (Estados de crecimiento): {{{phenologyLogs}}}

    **Instrucciones de Redacción:**
    1. **Lenguaje Profesional**: Usa terminología técnica precisa (ej. "estrés hídrico", "presión de inóculo", "balance nutricional").
    2. **Capacidad de Síntesis**: Evita párrafos largos. El reporte se mostrará en bloques visuales.
    3. **Objetividad**: Basa tus juicios estrictamente en los datos proporcionados.
    4. **Secciones:**
       - **Executive Summary**: Determina el estado general basándote en la sanidad y fenología actual.
       - **Technical Analysis**: Desglosa la situación en 4 áreas (Clima, Fenología, Manejo, Sanidad).
       - **Alertas**: Identifica los eventos más críticos o riesgosos detectados en los últimos registros.
       - **Recommendations**: Proporciona acciones concretas para resolver problemas detectados.
       - **AI Insight**: Un párrafo integrador que analice la correlación entre el clima, la fenología y las prácticas realizadas.

    Genera el JSON estructurado solicitado.`,
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
