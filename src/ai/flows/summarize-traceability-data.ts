'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTraceabilityDataInputSchema = z.object({
  batchName: z.string().describe('El nombre o identificador del lote.'),
  establishmentName: z.string().describe('El nombre del establecimiento.'),
  eventsData: z.string().describe('JSON string con la cronología de eventos (fechas, tipos, descripciones y notas).')
});

export type SummarizeTraceabilityDataInput = z.infer<typeof SummarizeTraceabilityDataInputSchema>;

export async function summarizeTraceabilityData(
  input: SummarizeTraceabilityDataInput
): Promise<string> {
  return summarizeTraceabilityDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTraceabilityDataPrompt',
  input: {schema: SummarizeTraceabilityDataInputSchema},
  output: {schema: z.string()},
  prompt: `Eres un ingeniero agrónomo experto. Tu tarea es leer la cronología de eventos de trazabilidad de un lote de frutillas y redactar una síntesis ejecutiva narrativa en 2 o 3 párrafos de cómo se desarrolló el ciclo del cultivo.

  **Instrucciones:**
  1. Analiza los datos en silencio: Revisa los eventos cronológicos ({{{eventsData}}}) del lote {{{batchName}}} en el establecimiento {{{establishmentName}}}.
  2. Redacta una narrativa en español, estructurada y profesional. Destaca hitos importantes como el inicio de plantación, los desafíos climáticos o fitosanitarios enfrentados, las acciones preventivas/correctivas tomadas, y el progreso de las cosechas.
  3. No escribas una lista, escribe un resumen narrativo de lectura fluida.
  4. Usa formato Markdown con doble asterisco (**) para resaltar en negrita fechas clave, cantidades importantes o eventos críticos (ej. **fuertes vientos**, **inicio de cosecha**, **750 kg**).
  5. Asegúrate de separar las ideas en 2 o 3 párrafos bien estructurados usando saltos de línea.
  
  **Datos:**
  - Lote: {{{batchName}}}
  - Establecimiento: {{{establishmentName}}}
  - Eventos Cronológicos: {{{eventsData}}}
  
  Devuelve únicamente el texto de la narrativa en formato Markdown.
  `,
});

const summarizeTraceabilityDataFlow = ai.defineFlow(
  {
    name: 'summarizeTraceabilityDataFlow',
    inputSchema: SummarizeTraceabilityDataInputSchema,
    outputSchema: z.string(),
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('No se pudo generar la síntesis de trazabilidad.');
    }
    return output;
  }
);
