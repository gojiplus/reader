import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import wordListPath from 'word-list';
import z from 'zod';

// Load the word list once and create a Set for fast lookup
const words = fs.readFileSync(wordListPath, 'utf8').split('\n');
const wordSet = new Set(words.map(w => w.trim().toLowerCase()));

const MAX_ITERATIONS = 3

/**
 * Given an array of strings, return a sentence, taking into account common punctuation rules.
 * @param words 
 * @returns 
 */
function formatSentence(words: string[]) {
  if (!Array.isArray(words) || words.length === 0) return '';

  const punctuation = ['.', '!', '?', ',', ';', ':', '\'', '-'];
  let sentence = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (punctuation.includes(word)) {
      // Attach punctuation directly to previous word
      sentence = sentence.trimEnd() + word;
    } else if (i === 0) {
      // Capitalize the first word
      sentence += word.charAt(0).toUpperCase() + word.slice(1);
    } else {
      // Add space before word
      sentence += ' ' + word;
    }
  }

  // Ensure sentence ends with terminal punctuation
  const lastChar = sentence[sentence.length - 1];
  if (!['.', '!', '?'].includes(lastChar)) {
    sentence += '.';
  }

  return sentence;
}


/**
 * Fix split words in text by merging adjacent tokens if their concatenation is a valid word.
 * This is useful for fixing words that were split due to spaces in PDF extraction.
 */
export function fixSplitWordsWithWordList(text: string): string {
  // Split text into tokens (words and punctuation)
  text = text.replace(/\s{2,}/g, ' ');
  const tokens = text.split(/\b/).filter(x => x != " ");
  const fixedTokens: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const current = tokens[i].trim();
    const next = tokens[i + 1]?.trim?.();

    if (
        next &&
        /^[a-zA-Z]+$/.test(current) &&
        /^[a-zA-Z]+$/.test(next) && 
        !wordSet.has(current.toLowerCase())
    ) {
      const merged = (current + next).toLowerCase();
      if (wordSet.has(merged)) {
        fixedTokens.push(current + next);
        i += 2;
        continue;
      }
    }
    fixedTokens.push(current);
    i += 1;
  }

  return formatSentence(fixedTokens);
}


const InputSchema = z.object({
  text: z.string(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log("[API Analyze Text] Received POST request.");
  
  try {    
    // 1. Verify Authentication
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.warn("[API Analyze Text] Unauthorized: Missing authentication token.");
      return NextResponse.json({ error: 'Unauthorized: Missing authentication token.' }, { status: 401 });
    }
    
    try {
      
      // 2. Parse and Validate Input
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error("[API Analyze Text] Failed to parse request body:", parseError);
        return NextResponse.json({ error: 'Invalid request body: Must be valid JSON.' }, { status: 400 });
      }
      
      const validationResult = InputSchema.safeParse(body);
      if (!validationResult.success) {
        const issues = validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        console.error("[API Analyze Text] Invalid input:", issues);
        return NextResponse.json({ error: `Invalid input: ${issues}` }, { status: 400 });
      }
      
      const { text } = validationResult.data;
      console.log(`[API Analyze Text] Processing request for text length: ${text.length}`);
      
      try {
        // Upload the buffer with a single API call
        let fixedText = fixSplitWordsWithWordList(text)
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            fixedText = fixSplitWordsWithWordList(fixedText)
        }
        
        console.log(`[API Analyze Text] Fixed text, new length: ${fixedText.length}`);
        
        try {
          // Create the text          
          return NextResponse.json({ text: fixedText }, { status: 200 });
        } catch (urlError: any) {
          console.error("[API Analyze Text] Failed to send return text:", urlError);
          return NextResponse.json({ error: `Failed to send return text: ${urlError.message}` }, { status: 500 });
        }
      } catch (uploadError: any) {
        console.error("[API Analyze Text] Failed to send process words:", uploadError);
        return NextResponse.json({ error: `Failed to send process words: ${uploadError.message}` }, { status: 500 });
      }
    } catch (authError: any) {
      console.error("[API Analyze Text] Auth verification failed:", authError);
      return NextResponse.json({ error: `Authentication failed: ${authError.message}` }, { status: 401 });
    }
  } catch (error: any) {
    console.error("[API Analyze Text] Unexpected error:", error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
