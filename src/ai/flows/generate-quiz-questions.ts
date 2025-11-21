'use server';

/**
 * @fileOverview Generates multiple-choice quiz questions from audiobook content.
 *
 * - generateQuizQuestions - A function that generates quiz questions.
 * - GenerateQuizQuestionsInput - The input type for the generateQuizQuestions function.
 * - GenerateQuizQuestionsOutput - The return type for the generateQuizQuestions function.
 * - Question - The type definition for a single quiz question object.
 */

import { z, GenerateResponse } from 'genkit'; // Import both z and GenerateResponse from genkit
import { ai, isAiInitialized, aiInitializationError } from '@/ai/ai-instance';
import { handleComponentError, ErrorCategory } from '@/lib/error-handler';
import { createComponentLogger } from '@/lib/logger';

const QuestionSchema = z
  .object({
    question: z.string().describe('The quiz question.'),
    options: z
      .array(z.string())
      .length(4, { message: 'Must have exactly 4 options.' })
      .describe('The multiple-choice options (exactly 4).'),
    answer: z.string().describe('The correct answer (must be one of the options).'),
  })
  .refine(data => data.options.includes(data.answer), {
    message: 'Answer must be one of the provided options.',
    path: ['answer'], // specify the path of the error
  });

// Export the Question type derived from the schema
export type Question = z.infer<typeof QuestionSchema>;

const GenerateQuizQuestionsInputSchema = z.object({
  text: z
    .string()
    .min(50, {
      message: 'Text must be at least 50 characters long to generate meaningful questions.',
    })
    .describe('The text content from which to generate quiz questions.'),
  numQuestions: z
    .number()
    .int()
    .min(1, { message: 'Number of questions must be at least 1.' })
    .max(10, { message: 'Number of questions cannot exceed 10.' }) // Add a reasonable max
    .default(3)
    .describe('The number of quiz questions to generate (1-10).'),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .min(1, { message: 'Must generate at least one question.' }) // Ensure at least one question is generated
    .describe('An array of quiz questions.'),
});
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;

const logger = createComponentLogger('GenerateQuizQuestions');

// eslint-disable-next-line require-await
export async function generateQuizQuestions(
  input: GenerateQuizQuestionsInput
): Promise<GenerateQuizQuestionsOutput> {
  // Check if AI is initialized
  if (!ai || !isAiInitialized) {
    const error = new Error(`AI is not initialized: ${aiInitializationError || 'Unknown error'}`);
    const errorInfo = handleComponentError(error, 'GenerateQuizQuestions', {
      category: ErrorCategory.AI,
      action: 'initialization_check',
    });
    throw new Error(errorInfo.message);
  }

  // Validate input using Zod schema before calling the flow
  const validationResult = GenerateQuizQuestionsInputSchema.safeParse(input);
  if (!validationResult.success) {
    const issues = validationResult.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    const error = new Error(`Invalid input for quiz generation: ${issues}`);
    const errorInfo = handleComponentError(error, 'GenerateQuizQuestions', {
      category: ErrorCategory.VALIDATION,
      action: 'input_validation',
    });
    throw new Error(errorInfo.message);
  }

  const generateQuizQuestionsFlow = createGenerateQuizQuestionsFlow();
  return generateQuizQuestionsFlow(validationResult.data);
}

function createGenerateQuizQuestionsFlow() {
  if (!ai || !isAiInitialized) {
    throw new Error(`AI is not initialized: ${aiInitializationError || 'Unknown error'}`);
  }

  const prompt = ai.definePrompt({
    name: 'generateQuizQuestionsPrompt',
    input: {
      schema: GenerateQuizQuestionsInputSchema, // Use the validated input schema
    },
    output: {
      schema: GenerateQuizQuestionsOutputSchema, // Use the defined output schema
    },
    prompt: `You are an expert in creating multiple-choice quizzes based on provided text. Generate exactly {{{numQuestions}}} distinct multiple-choice questions from the text content below.

Text content:
{{{text}}}

Constraints for each question:
1.  The question must be relevant to the provided text.
2.  There must be exactly 4 options.
3.  One option must be the single correct answer.
4.  The correct answer MUST be listed within the 4 options.
5.  Options should be plausible but clearly distinguishable based on the text.

Output ONLY a valid JSON object matching this structure:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    }
    // ... more questions
  ]
}
`, // Updated example to match schema
  });

  const generateQuizQuestionsFlow = ai.defineFlow<
    typeof GenerateQuizQuestionsInputSchema,
    typeof GenerateQuizQuestionsOutputSchema
  >(
    {
      name: 'generateQuizQuestionsFlow',
      inputSchema: GenerateQuizQuestionsInputSchema,
      outputSchema: GenerateQuizQuestionsOutputSchema,
    },
    async (input): Promise<GenerateQuizQuestionsOutput> => {
      logger.info(`Generating quiz questions for input: ${input.text.substring(0, 50)}...`);
      let response: GenerateResponse | undefined;
      try {
        response = await prompt(input);
        logger.debug('AI response received', { response });

        const output = response?.output; // Access output property directly

        if (!output) {
          logger.error('AI response is missing output object', new Error('Missing output'), {
            response,
          });
          throw new Error('AI response did not contain an output object.');
        }

        // Validate the structure and content of the output
        const validation = GenerateQuizQuestionsOutputSchema.safeParse(output);

        if (!validation.success) {
          console.error(
            'Invalid output structure from AI (generateQuizQuestionsFlow):',
            validation.error.issues
          );
          console.error('Raw AI Output causing validation error:', JSON.stringify(output, null, 2)); // Log raw output for debugging
          // Try to provide more specific feedback if possible
          const errorDetails = validation.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
          throw new Error(`AI returned invalid quiz data format. Details: ${errorDetails}`);
        }

        // Ensure the number of questions matches the request (optional, can be handled by frontend if needed)
        if (validation.data.questions.length !== input.numQuestions) {
          console.warn(
            `AI generated ${validation.data.questions.length} questions, but ${input.numQuestions} were requested. Raw AI Output: ${JSON.stringify(output, null, 2)}`
          );
          // If strict number is required, uncomment the following:
          // throw new Error(`AI generated ${validation.data.questions.length} questions instead of the requested ${input.numQuestions}.`);
        }

        console.warn('Quiz generation successful, returning validated data.');
        return validation.data; // Return the validated data
      } catch (error: unknown) {
        console.error('Error during generateQuizQuestionsFlow execution (server-side):', error); // Log the full error object
        let errorMessage = 'Failed to generate quiz questions due to an unexpected server error.';

        // Check for specific known error types or messages
        if (error instanceof z.ZodError) {
          errorMessage = `Data validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
        } else if (error instanceof Error) {
          // Check for specific error messages from Google AI or Genkit
          if (
            error.message.includes('API key not valid') ||
            error.message.includes('Invalid API key') ||
            (error instanceof Error &&
              'details' in error &&
              typeof error.details === 'string' &&
              error.details.includes('API_KEY_INVALID'))
          ) {
            errorMessage =
              'Google AI API key not valid. Please check your GOOGLE_GENAI_API_KEY configuration in .env.local and ensure the Genkit server was restarted after changes.';
          } else if (error.message.includes('invalid quiz data format')) {
            errorMessage = error.message; // Propagate the specific validation error
          } else if (
            error.message.includes('fetch failed') ||
            error.message.includes('ECONNREFUSED')
          ) {
            errorMessage =
              'Network error: Could not connect to the AI service. Ensure the Genkit server is running and can reach Google AI.';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'API rate limit exceeded. Please wait and try again.';
          } else if (error.message.includes('Billing account not configured')) {
            errorMessage =
              'Google Cloud project billing is not configured correctly for the API key used.';
          } else {
            // Use the error message directly if it's somewhat informative
            errorMessage = `Failed to generate quiz: ${error.message}`;
          }
        }

        // Throw a new error with the refined message
        throw new Error(errorMessage);
      }
    }
  );

  return generateQuizQuestionsFlow;
}
