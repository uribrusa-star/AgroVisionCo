'use server';

/**
 * @fileOverview An AI agent for validating packaging data.
 *
 * - validatePackagingData - A function that validates packaging data using AI.
 * - ValidatePackagingDataInput - The input type for the validatePackagingData function.
 * - ValidatePackagingDataOutput - The return type for the validatePackagingData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidatePackagingDataInputSchema = z.object({
  kilogramsPackaged: z
    .number()
    .describe('The quantity in kilos for a specific packaging entry.'),
  packerId: z.string().describe('The unique identifier for the packer.'),
  hoursWorked: z.number().describe('The hours worked for this packaging entry.'),
  costPerHour: z.number().describe('The cost per hour for packaging.'),
  historicalPackagingData: z
    .string()
    .describe(
      'Historical packaging data for this packer as a JSON string. Includes kilograms, hours, and cost.'
    ),
});
export type ValidatePackagingDataInput = z.infer<
  typeof ValidatePackagingDataInputSchema
>;

const ValidatePackagingDataOutputSchema = z.object({
  isValid: z
    .boolean()
    .describe(
      'Whether the packaging data is valid or if there are any outliers or inconsistencies.'
    ),
  reason:
    z.string().describe(
      'The reason why the packaging data is considered invalid, if applicable. Must be in Spanish.'
    ).optional(),
});
export type ValidatePackagingDataOutput = z.infer<
  typeof ValidatePackagingDataOutputSchema
>;

export async function validatePackagingData(
  input: ValidatePackagingDataInput
): Promise<ValidatePackagingDataOutput> {
  return validatePackagingDataFlow(input);
}

const prompt = ai.definePrompt({
    name: 'validatePackagingDataPrompt',
    input: {schema: ValidatePackagingDataInputSchema},
    output: {schema: ValidatePackagingDataOutputSchema},
    prompt: `You are an AI expert in agricultural logistics data validation. Your task is to analyze the given packaging data for strawberries and determine if it is valid, comparing it with historical data for the same packer.

    Consider factors like reasonable packaging amounts for the hours worked, consistency with historical productivity (kg/hour), and any potential anomalies in cost or quantity.

    **Important**: The response for the 'reason' field, if the data is invalid, must be in Spanish.

    Respond with a JSON object indicating whether the data is valid and, if not, the reason for the invalidity in Spanish.

    Packaging Data:
    Packer ID: {{{packerId}}}
    Kilos Packaged: {{{kilogramasPackaged}}}
    Hours Worked: {{{hoursWorked}}}
    Cost Per Hour: {{{costPerHour}}}
    Historical Data: {{{historicalPackagingData}}}

    Given your expertise and access to the historical data, please perform a thorough validation of the provided packaging data.
    `,
  });

const validatePackagingDataFlow = ai.defineFlow(
  {
    name: 'validatePackagingDataFlow',
    inputSchema: ValidatePackagingDataInputSchema,
    outputSchema: ValidatePackagingDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('La validación de datos de embalaje no generó una respuesta.');
    }
    return output;
  }
);
