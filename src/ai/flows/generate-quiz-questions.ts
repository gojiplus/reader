'use server';

import { z } from 'zod/v4';
import { generateStructured } from '@/ai/gemini';

const InputSchema = z.object({
  text: z.string().trim().min(50),
  numQuestions: z.number().int().min(1).max(10).default(3),
});
const QuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).length(4),
    answer: z.string().trim().min(1),
  })
  .refine(question => question.options.includes(question.answer), {
    message: 'The answer must match one of the four options.',
    path: ['answer'],
  });

export type Question = z.output<typeof QuestionSchema>;
export type GenerateQuizQuestionsInput = z.input<typeof InputSchema>;
export type GenerateQuizQuestionsOutput = { questions: Question[] };

export async function generateQuizQuestions(
  input: GenerateQuizQuestionsInput
): Promise<GenerateQuizQuestionsOutput> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid input: provide at least 50 characters and request 1-10 questions.');
  }
  const { text, numQuestions } = parsed.data;

  return generateStructured(
    `Generate exactly ${numQuestions} distinct multiple-choice questions based on the text below. Each question must have exactly four plausible, distinguishable options and one correct answer. The answer must exactly match one of the options.

Text:
${text}`,
    z.object({ questions: z.array(QuestionSchema).length(numQuestions) })
  );
}
