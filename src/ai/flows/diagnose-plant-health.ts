'use server';
/**
 * @fileOverview A plant problem diagnosis AI agent.
 *
 * - diagnosePlant - A function that handles the plant diagnosis process.
 * - DiagnosePlantInput - The input type for the diagnosePlant function.
 * - DiagnosePlantOutput - The return type for the diagnosePlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnosePlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('Una descripción detallada de los síntomas observados en la planta de frutilla.'),
});
export type DiagnosePlantInput = z.infer<typeof DiagnosePlantInputSchema>;

const PossibleDiagnosisSchema = z.object({
    nombre: z.string().describe('El nombre de la plaga o enfermedad (ej. "Oídio", "Araña Roja").'),
    probabilidad: z.number().min(0).max(100).describe('La probabilidad estimada de este diagnóstico (0-100).'),
    descripcion: z.string().describe('Una breve descripción de por qué se considera este diagnóstico.'),
});

const DiagnosePlantOutputSchema = z.object({
  diagnosticoPrincipal: z.string().describe('El nombre del diagnóstico más probable.'),
  posiblesDiagnosticos: z.array(PossibleDiagnosisSchema).describe('Una lista de 1 a 3 posibles diagnósticos con su probabilidad.'),
  recomendacionGeneral: z.string().describe('Una recomendación inicial y general para el manejo del problema detectado.'),
});
export type DiagnosePlantOutput = z.infer<typeof DiagnosePlantOutputSchema>;

export async function diagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnosePlantPrompt',
  input: {schema: DiagnosePlantInputSchema},
  output: {schema: DiagnosePlantOutputSchema},
  prompt: `Eres un Ingeniero Agrónomo experto en fitopatología del cultivo de frutilla. Tu tarea es analizar una imagen y una descripción para diagnosticar problemas sanitarios.

    **Base de Conocimiento de Plagas y Enfermedades Frecuentes en Frutilla:**
    - **Enfermedades:** Botrytis (Moho Gris), Oídio (Cenicilla), Viruela, Antracnosis.
    - **Plagas:** Araña Roja (Tetranychus urticae), Trips (Frankliniella occidentalis), Pulgones.
    - **Otros:** Deficiencias nutricionales (Nitrógeno, Hierro, etc.), quemaduras por sol, daño por helada.

    **Instrucciones:**
    1.  Analiza la imagen ({{media url=photoDataUri}}) y la descripción del usuario ({{{description}}}).
    2.  Compara los síntomas observados con tu base de conocimiento.
    3.  Genera de 1 a 3 posibles diagnósticos. Para cada uno, asigna un nombre, una probabilidad (de 0 a 100) y una breve descripción justificando tu conclusión. La suma de probabilidades no tiene que ser 100.
    4.  Identifica el diagnóstico más probable y asígnalo a 'diagnosticoPrincipal'.
    5.  Basado en el diagnóstico principal, proporciona una recomendación inicial y general. Debe ser una acción preventiva o de monitoreo, no una aplicación de producto específica. Por ejemplo: "Aumentar ventilación en túneles", "Monitorear lotes vecinos", "Realizar análisis foliar para confirmar deficiencia".

    Genera únicamente la salida JSON.
    `,
});

const diagnosePlantFlow = ai.defineFlow(
  {
    name: 'diagnosePlantFlow',
    inputSchema: DiagnosePlantInputSchema,
    outputSchema: DiagnosePlantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('El diagnóstico no generó una respuesta.');
    }
    return output;
  }
);
