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
    descripcion: z.string().describe('Una breve descripción detallada de por qué se considera este diagnóstico basándose en los síntomas visuales.'),
});

const DiagnosePlantOutputSchema = z.object({
  diagnosticoPrincipal: z.string().describe('El nombre del diagnóstico más probable.'),
  posiblesDiagnosticos: z.array(PossibleDiagnosisSchema).describe('Una lista de 1 a 3 posibles diagnósticos con su probabilidad.'),
  recomendacionGeneral: z.string().describe('Una recomendación técnica detallada para el manejo o confirmación del problema.'),
  nivelDeConfianza: z.enum(['bajo', 'medio', 'alto']).describe('El nivel de confianza técnica del análisis basado en la claridad de la imagen y los síntomas.'),
  mensajeIA: z.string().optional().describe('Un mensaje adicional para el usuario si la imagen no es clara o si hay dudas razonables.'),
});
export type DiagnosePlantOutput = z.infer<typeof DiagnosePlantOutputSchema>;

export async function diagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnosePlantPrompt',
  input: {schema: DiagnosePlantInputSchema},
  output: {schema: DiagnosePlantOutputSchema},
  prompt: `Eres un Ingeniero Agrónomo experto en fitopatología y entomología aplicada al cultivo de frutilla (Fragaria x ananassa). Tu tarea es realizar un diagnóstico técnico preciso a partir de una imagen y una descripción.

    **Base de Conocimiento Especializada:**
    - **Enfermedades Fúngicas:** Botrytis cinerea (podredumbre gris), Sphaerotheca macularis (Oídio), Mycosphaerella fragariae (Viruela), Colletotrichum spp. (Antracnosis), Phytophthora cactorum (Podredumbre de la corona).
    - **Plagas:** Tetranychus urticae (Araña roja - monitorear telarañas y bronceado), Frankliniella occidentalis (Trips - daño en flores y deformación de frutos), Pulgones (Aphis spp. - melaza y enrollamiento).
    - **Fisiopatías y Nutrición:** Deficiencia de Hierro (clorosis intervienenal en hojas jóvenes), Deficiencia de Nitrógeno (hojas viejas amarillentas), Escaldado por sol (frutos blancos/marrones), Albino (frutos sin color por exceso de N o falta de luz).

    **Instrucciones de Análisis:**
    1.  Examina la imagen ({{media url=photoDataUri}}) buscando patrones específicos: manchas, esporas, micelios, insectos, o decoloraciones.
    2.  Cruza los hallazgos visuales con la descripción del usuario: "{{{description}}}".
    3.  Si la imagen es borrosa, está muy lejos o no muestra una planta de frutilla con claridad, establece 'nivelDeConfianza' en 'bajo' y explica por qué en 'mensajeIA'.
    4.  Genera 'diagnosticoPrincipal' y una lista de 'posiblesDiagnosticos' (máximo 3) con sus probabilidades.
    5.  En 'recomendacionGeneral', proporciona pasos técnicos: monitoreo de lupa, ajuste de riego, remoción de material infectado, o pruebas de laboratorio. NO menciones marcas comerciales de agroquímicos.
    
    Responde estrictamente en formato JSON siguiendo el esquema definido.
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
