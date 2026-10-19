'use server';

import { z } from 'zod/v4';
import { generateStructured } from '@/ai/gemini';

const InputSchema = z.object({ text: z.string().trim().min(1) });
const OutputSchema = z.object({ explanation: z.string().trim().min(1) });

export type ExplainInputSchemaInput = z.input<typeof InputSchema>;
export type ExplainOutputSchemaOutput = z.output<typeof OutputSchema>;

export async function generateExplanation(
  input: ExplainInputSchemaInput
): Promise<ExplainOutputSchemaOutput> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid input: text cannot be empty.');

  return generateStructured(
    `Explain the following text clearly and accurately in 2-3 sentences. Break down complex concepts and define any necessary technical terms.

Text:
${parsed.data.text}`,
    OutputSchema
  );
}
