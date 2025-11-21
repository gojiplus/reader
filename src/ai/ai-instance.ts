import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { logger } from '@/lib/logger';

// Flag to indicate AI initialization status and store error message
let isAiInitialized = false;
let aiInitializationError: string | null = null;
let ai: ReturnType<typeof genkit> | null = null; // Declare ai as potentially null

try {
  // Log the API key status ONLY during server startup for debugging
  // IMPORTANT: Avoid logging the actual key value in production environments
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GOOGLE_GENAI_API_KEY') {
    aiInitializationError =
      'AI Instance: GOOGLE_GENAI_API_KEY is missing or set to the placeholder value "YOUR_GOOGLE_GENAI_API_KEY". AI features will be disabled. Please update your .env.local file and restart the Genkit server (npm run genkit:dev).';
    logger.error(aiInitializationError);
    isAiInitialized = false;
  } else {
    logger.ai('GOOGLE_GENAI_API_KEY found. Initializing Genkit...');

    // Initialize Genkit only if the API key seems valid
    ai = genkit({
      plugins: [
        googleAI({
          apiKey, // Pass the apiKey directly
        }),
      ],
      model: gemini15Flash,
      // Remove model definition here, specify in prompt/generate calls
      // model: 'googleai/gemini-pro', // Example model
      // logLevel: 'debug', // Removed - not a valid GenkitOptions property
      // enableTracing: true, // Removed - not a valid GenkitOptions property

      // errorHandler is not a valid GenkitOptions property - removed
    });

    isAiInitialized = true; // Assume initialized if genkit() doesn't throw immediately
    logger.ai('Genkit configuration attempted.');
    // We can't *guarantee* success until a call is made, but mark as initialized for now.
    // The errorHandler will catch runtime key issues.
  }
} catch (initErr) {
  // Catch errors during the synchronous part of genkit() setup
  aiInitializationError = `Genkit failed to initialize: ${initErr instanceof Error ? initErr.message : String(initErr)}`;
  logger.error(aiInitializationError);
  isAiInitialized = false;
  ai = null; // Ensure ai is null if initialization throws
}

// Export the 'ai' instance (potentially null) and the status flags
export { ai, isAiInitialized, aiInitializationError };
