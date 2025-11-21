import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';
import { fixWordsWithIterations } from '@/lib/word-processing';

const InputSchema = z.object({
  text: z.string(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.warn('[API Analyze Text] Received POST request.');

  try {
    // 1. Verify Authentication
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.warn('[API Analyze Text] Unauthorized: Missing authentication token.');
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token.' },
        { status: 401 }
      );
    }

    try {
      // 2. Parse and Validate Input
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error('[API Analyze Text] Failed to parse request body:', parseError);
        return NextResponse.json(
          { error: 'Invalid request body: Must be valid JSON.' },
          { status: 400 }
        );
      }

      const validationResult = InputSchema.safeParse(body);
      if (!validationResult.success) {
        const issues = validationResult.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        console.error('[API Analyze Text] Invalid input:', issues);
        return NextResponse.json({ error: `Invalid input: ${issues}` }, { status: 400 });
      }

      const { text } = validationResult.data;
      console.warn(`[API Analyze Text] Processing request for text length: ${text.length}`);

      try {
        // Process the text with word fixing iterations
        const fixedText = fixWordsWithIterations(text);

        console.warn(`[API Analyze Text] Fixed text, new length: ${fixedText.length}`);

        try {
          // Return the processed text
          return NextResponse.json({ text: fixedText }, { status: 200 });
        } catch (urlError: unknown) {
          const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error';
          console.error('[API Analyze Text] Failed to send return text:', urlError);
          return NextResponse.json(
            { error: `Failed to send return text: ${errorMessage}` },
            { status: 500 }
          );
        }
      } catch (uploadError: unknown) {
        const errorMessage =
          uploadError instanceof Error ? uploadError.message : 'Unknown processing error';
        console.error('[API Analyze Text] Failed to process words:', uploadError);
        return NextResponse.json(
          { error: `Failed to process words: ${errorMessage}` },
          { status: 500 }
        );
      }
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unknown auth error';
      console.error('[API Analyze Text] Auth verification failed:', authError);
      return NextResponse.json(
        { error: `Authentication failed: ${errorMessage}` },
        { status: 401 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API Analyze Text] Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
