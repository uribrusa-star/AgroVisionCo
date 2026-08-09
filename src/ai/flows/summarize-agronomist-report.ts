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
  harvestLogs: z.string().optional(),
  establishmentData: z.string().optional(),
  batchesData: z.string().optional(),
  suppliesData: z.string().optional(),
  varietyKnowledge: z.string().optional(),
});
export type SummarizeAgronomistReportInput = z.infer<typeof SummarizeAgronomistReportInputSchema>;

const SummarizeAgronomistReportOutputSchema = z.object({
  executiveSummary: z.object({
    generalStatus: z.enum(['Óptimo', 'Atención', 'Riesgo']),
    climateRisk: z.enum(['Bajo', 'Medio', 'Alto']),
    stockStatus: z.enum(['Suficiente', 'Alerta', 'Crítico']),
    criticalAlertsCount: z.number(),
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
  graphicalAnalysis: z.object({
    phenology: z.string(),
    monthlyHarvest: z.string(),
    batchYield: z.string(),
  }),
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

    **Lotes y Genética:**
    {{{batchesData}}}
    {{{varietyKnowledge}}}

    **Inventario de Insumos:**
    {{{suppliesData}}}

    **Datos a analizar:**
    - Bitácora Agronómica (Fertilizaciones, Riegos, Sanidad): {{{agronomistLogs}}}
    - Bitácora de Fenología (Estados de crecimiento): {{{phenologyLogs}}}
    - Historial de Cosechas (Rendimientos): {{{harvestLogs}}}

    **Instrucciones de Redacción (CRÍTICO):**
    1. **Lenguaje Directo y Presente:** PROHIBIDO usar tiempos condicionales o hipotéticos (No uses "El gráfico mostraría" o "Se observaría"). Debes afirmar categóricamente basado en los datos: "Se registra...", "La curva de cosecha muestra...", "El rendimiento actual es...".
    2. **Métricas Cuantitativas:** Al hablar de rendimientos, debes calcular matemáticamente los kg/ha cruzando los kilos cosechados con las hectáreas de los lotes indicadas en 'Lotes y Genética'.
    3. **Contexto Operativo en Alertas:** Si generas una alerta de stock bajo, DEBES explicar el impacto operativo ("Riesgo de interrupción del plan de llenado de fruto por falta de Triple 18").
    
    **Secciones:**
       - **Executive Summary:** Evalúa el estado general, el clima y el estado del stock (Suficiente, Alerta, Crítico). Cuenta las alertas críticas y pon el número en \`criticalAlertsCount\`.
       - **Technical Analysis:** Desglosa Clima, Fenología, Manejo, Sanidad. Justifica con datos directos.
       - **Alertas:** Identifica riesgos fitosanitarios o quiebres de inventario (cruzando bitácora vs suppliesData).
       - **Recommendations:** Acciones directas y planificadas (Nutrición, Sanidad).
       - **Graphical Analysis:** Describe analíticamente la curva fenológica, mensual y por lotes asumiendo que el gráfico ya está dibujado al lado del texto. Explica las diferencias de rendimiento entre variedades.
       - **AI Insight:** Una conclusión de valor agronómico gerencial de 3 a 5 líneas que integre todo el escenario.

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
