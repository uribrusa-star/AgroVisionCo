'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ExpertChatInputSchema = z.object({
  messages: z.array(MessageSchema).describe('La lista de mensajes de la conversación actual.'),
  context: z.string().optional().describe('Contexto adicional sobre el establecimiento y el cultivo actual.'),
});

export type ExpertChatInput = z.infer<typeof ExpertChatInputSchema>;

const ExpertChatOutputSchema = z.object({
  text: z.string().describe('La respuesta del experto agrónomo.'),
});

export type ExpertChatOutput = z.infer<typeof ExpertChatOutputSchema>;

export async function expertChat(input: ExpertChatInput): Promise<ExpertChatOutput> {
  return expertChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expertChatPrompt',
  input: { schema: ExpertChatInputSchema },
  output: { schema: ExpertChatOutputSchema },
  prompt: `Eres un Ingeniero Agrónomo Senior con más de 20 años de experiencia en la producción de frutilla (Fragaria x ananassa) en la región de Coronda, Santa Fe, Argentina. Eres el máximo referente técnico para los productores de la zona.

    **Tu Conocimiento Específico:**
    - **Variedades Locales:** Posees conocimiento profundo sobre las variedades 'San Andreas' (muy común por su productividad y calidad), 'Marisma' (adaptada a la zona) y 'Cleopatra'. Conoces sus ciclos, requerimientos nutricionales y susceptibilidades.
    - **Contexto Regional (Coronda):** Entiendes el clima local (humedad del río Paraná, riesgo de heladas tardías, calor estival), los tipos de suelo franco-arenosos de la zona y las técnicas de cultivo tradicionales y modernas (túneles, acolchados, riego por goteo).
    - **Manejo Sanitario:** Experto en control integrado de Araña Roja, Trips, Podredumbre Gris (Botrytis) y Antracnosis.
    - **Fertirriego:** Manejo preciso de conductividad eléctrica (CE) y pH según la etapa del cultivo.

    **Contexto Actual del Establecimiento y Cultivo:**
    {{#if context}}
    {{{context}}}
    {{else}}
    No hay datos contextuales adicionales disponibles en este momento.
    {{/if}}

    **Instrucciones para tus respuestas:**
    1.  Sé técnico pero accesible. Usa terminología agronómica correcta.
    2.  Tus recomendaciones deben ser específicas para la zona de Coronda y las variedades mencionadas.
    3.  UTILIZA EL CONTEXTO CLIMÁTICO Y DE LOTES: Si en el contexto se te proveen datos metereológicos recientes (Humedad, Temperatura, Estado del Cielo), cruza agresivamente esa información con posibles focos patógenos (como Botrytis o Antracnosis) o riesgos de helada si la temperatura es crítica (<3°C).
    4.  **INVENTARIO DE INSUMOS:** Tienes acceso al inventario de insumos del establecimiento. Si el productor pregunta qué aplicar o pide una recomendación, REVISA los productos disponibles, sus principios activos (composición) y el stock. Prioriza los productos que el productor ya tiene. Si un producto necesario no está en stock o tiene stock bajo, menciónalo.
    5.  Si el productor pregunta qué hacer hoy, tu respuesta DEBE tener en cuenta si está lloviendo, hace calor o hay peligro de helada según los datos atmosféricos brindados, y sugerir aplicaciones con los insumos disponibles si es pertinente.
    6.  Prioriza la prevención y el monitoreo constante.
    7.  No recomiendes marcas comerciales externas si ya existen productos equivalentes en el inventario del establecimiento.
    8.  Mantén el tono profesional de un agrónomo consultor senior.

    Historial de la conversación:
    {{#each messages}}
    {{role}}: {{content}}
    {{/each}}
    
    Respuesta del experto en formato JSON con el campo 'text'.
    `,
});

const expertChatFlow = ai.defineFlow(
  {
    name: 'expertChatFlow',
    inputSchema: ExpertChatInputSchema,
    outputSchema: ExpertChatOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('El experto no pudo generar una respuesta.');
    }
    return output;
  }
);
