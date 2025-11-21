import fs from 'fs';
import wordListPath from 'word-list';

// Load the word list once and create a Set for fast lookup
const words = fs.readFileSync(wordListPath, 'utf8').split('\n');
const wordSet = new Set(words.map(w => w.trim().toLowerCase()));

const MAX_ITERATIONS = 3;

/**
 * Given an array of strings, return a sentence, taking into account common punctuation rules.
 * @param words
 * @returns
 */
function formatSentence(words: string[]) {
  if (!Array.isArray(words) || words.length === 0) return '';

  const punctuation = ['.', '!', '?', ',', ';', ':', "'", '-'];
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
      sentence += ` ${word}`;
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
  const tokens = text.split(/\b/).filter(x => x !== ' ');
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

/**
 * Process text with multiple iterations to fix split words
 */
export function fixWordsWithIterations(text: string): string {
  let fixedText = fixSplitWordsWithWordList(text);
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    fixedText = fixSplitWordsWithWordList(fixedText);
  }
  return fixedText;
}
