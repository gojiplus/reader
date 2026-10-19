'use server';

import { z } from 'zod/v4';
import { generateStructured } from '@/ai/gemini';

const InputSchema = z.object({ chapterText: z.string().trim().min(10) });
const OutputSchema = z.object({ summary: z.string().trim().min(1) });

export type SummarizeAudiobookChapterInput = z.input<typeof InputSchema>;
export type SummarizeAudiobookChapterOutput = z.output<typeof OutputSchema>;

export async function summarizeAudiobookChapter(
  input: SummarizeAudiobookChapterInput
): Promise<SummarizeAudiobookChapterOutput> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid input: chapter text must contain at least 10 characters.');
  }

  return generateStructured(
    `Summarize the following audiobook chapter in 2-4 sentences, focusing on the key ideas and main points.

Chapter text:
${parsed.data.chapterText}`,
    OutputSchema
  );
}
