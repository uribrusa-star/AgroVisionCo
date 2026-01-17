'use server';

/**
 * @fileOverview An AI agent for validating production data.
 *
 * - validateProductionData - A function that validates production data using AI.
 * - ValidateProductionDataInput - The input type for the validateProductionData function.
 * - ValidateProductionDataOutput - The return type for the validateProductionData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateProductionDataInputSchema = z.object({
  kilosPerBatch: z
    .number()
    .describe('The production quantity in kilos for a specific batch.'),
  batchId: z.string().describe('The unique identifier for the batch.'),
  timestamp: z.string().describe('The timestamp of the production data entry.'),
  farmerId: z.string().describe('The unique identifier for the farmer.'),
  averageKilosPerBatch: z
    .number()
    .describe(
      'The historical average production quantity in kilos for this farmer.'
    ),
  historicalData: z
    .string()
    .describe(
      'Historical production data as a JSON string. Includes information such as date, batch number, and kilograms.'
    ),
});
export type ValidateProductionDataInput = z.infer<
  typeof ValidateProductionDataInputSchema
>;

const ValidateProductionDataOutputSchema = z.object({
  isValid: z
    .boolean()
    .describe(
      'Whether the production data is valid or if there are any outliers or inconsistencies.'
    ),
  reason: z
    .string()
    .describe(
      'The reason why the production data is considered invalid, if applicable. Must be in Spanish.'
    )
    .optional(),
});
export type ValidateProductionDataOutput = z.infer<
  typeof ValidateProductionDataOutputSchema
>;

export async function validateProductionData(
  input: ValidateProductionDataInput
): Promise<ValidateProductionDataOutput> {
  return validateProductionDataFlow(input);
}

const prompt = ai.definePrompt({
    name: 'validateProductionDataPrompt',
    input: {schema: ValidateProductionDataInputSchema},
    output: {schema: ValidateProductionDataOutputSchema},
    prompt: `You are an AI expert in agricultural data validation. Your task is to analyze the given production data for strawberries and determine if it is valid, comparing it with historical data.

    Consider factors like reasonable yield amounts compared to the farmer's historical average, consistency with historical data, and any potential anomalies.

    **Important**: The response for the 'reason' field, if the data is invalid, must be in Spanish.

    Respond with a JSON object indicating whether the data is valid and, if not, the reason for the invalidity in Spanish.

    Production Data:
    Batch ID: {{{batchId}}}
    Kilos per Batch: {{{kilosPerBatch}}}
    Timestamp: {{{timestamp}}}
    Farmer ID: {{{farmerId}}}
    Average Kilos per Batch: {{{averageKilosPerBatch}}}
    Historical Data: {{{historicalData}}}

    Given your expertise and access to the historical data, please perform a thorough validation of the provided production data.
    `,
  });

const validateProductionDataFlow = ai.defineFlow(
  {
    name: 'validateProductionDataFlow',
    inputSchema: ValidateProductionDataInputSchema,
    outputSchema: ValidateProductionDataOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      // In case of an unexpected empty output from the prompt, default to valid.
      return { isValid: true };
    }
    return output;
  }
);
