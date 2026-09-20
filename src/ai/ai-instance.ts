import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { logger } from '@/lib/logger';

let isAiInitialized = false;
let aiInitializationError: string | null = null;
let ai: ReturnType<typeof genkit> | null = null;

try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    aiInitializationError =
      'AI Instance: GEMINI_API_KEY is missing or set to a placeholder. AI features are disabled. Update .env.local and restart the server.';
    logger.error(aiInitializationError);
  } else {
    logger.ai('GEMINI_API_KEY found. Initializing Genkit...');
    ai = genkit({
      plugins: [googleAI({ apiKey })],
      model: googleAI.model('gemini-flash-latest'),
    });
    isAiInitialized = true;
    logger.ai('Genkit initialized.');
  }
} catch (initErr) {
  aiInitializationError = `Genkit failed to initialize: ${initErr instanceof Error ? initErr.message : String(initErr)}`;
  logger.error(aiInitializationError);
  ai = null;
}

export { ai, isAiInitialized, aiInitializationError };
