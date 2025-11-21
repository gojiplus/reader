'use server';

import { z } from 'genkit';
import { ai, isAiInitialized } from '@/ai/ai-instance';

const ExplainInputSchema = z.object({
  text: z.string().min(1, { message: 'Text cannot be empty.' }).describe('The text to explain.'),
});
export type ExplainInputSchemaInput = z.infer<typeof ExplainInputSchema>;

const ExplainOutputSchema = z.object({
  explanation: z
    .string()
    .min(1, { message: 'Explanation cannot be empty.' })
    .describe('The explanation of the text.'),
  error: z.string().optional(),
});
export type ExplainOutputSchemaOutput = z.infer<typeof ExplainOutputSchema>;

// Only define the prompt if AI is initialized
const prompt = ai
  ? ai.definePrompt({
      name: 'explainTextPrompt',
      input: {
        schema: ExplainInputSchema,
      },
      output: {
        schema: ExplainOutputSchema,
      },
      prompt: `You are a helpful assistant that explains text in a clear and concise way. Focus on making the explanation easy to understand while maintaining accuracy.

Text to explain:
{{{text}}}

Provide a clear and concise explanation of the text above. Focus on:
1. Breaking down complex concepts
2. Using simple language
3. Maintaining accuracy
4. Being concise (2-3 sentences)

Output ONLY a valid JSON object matching this structure:
{
  "explanation": "..."
}`,
    })
  : null;

export async function generateExplanation(
  input: ExplainInputSchemaInput
): Promise<ExplainOutputSchemaOutput> {
  try {
    // Check if AI is initialized
    if (!isAiInitialized || !ai || !prompt) {
      return { explanation: '' };
    }

    const { text } = input;

    // Validate input
    const validationResult = ExplainInputSchema.safeParse({ text });
    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      console.error('Explanation Input Validation Error:', issues);
      return { explanation: '' };
    }

    // Generate explanation
    const response = await prompt({ text });
    const output = response?.output;

    if (!output) {
      console.error('AI response is missing output object:', response);
      throw new Error('AI response did not contain an output object.');
    }

    // Validate output
    const outputValidation = ExplainOutputSchema.safeParse(output);
    if (!outputValidation.success) {
      console.error('Invalid output structure from AI:', outputValidation.error.issues);
      console.error('Raw AI Output:', JSON.stringify(output, null, 2));
      const errorDetails = outputValidation.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`AI returned invalid explanation format. Details: ${errorDetails}`);
    }

    return outputValidation.data;
  } catch (error: unknown) {
    console.error('Error during explanation generation:', error);
    let errorMessage = 'Failed to generate explanation due to an unexpected server error.';

    // Check for specific known error types or messages
    if (error instanceof z.ZodError) {
      errorMessage = `Data validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    } else if (error instanceof Error) {
      if (
        error.message.includes('API key not valid') ||
        error.message.includes('Invalid API key')
      ) {
        errorMessage = 'Google AI API key not valid. Please check your configuration.';
      } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Network error: Could not connect to the AI service.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'API rate limit exceeded. Please wait and try again.';
      } else {
        errorMessage = `Failed to generate explanation: ${error.message}`;
      }
    }

    return { explanation: '', error: errorMessage };
  }
}
