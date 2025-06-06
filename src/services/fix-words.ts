import { User } from "firebase/auth";


/**
 * Fix split words in text by merging adjacent tokens if their concatenation is a valid word.
 * This is useful for fixing words that were split due to spaces in PDF extraction.
 */
export const fixSplitWordsWithWordList = async (user: User, text: string): Promise<string> => {
  const idToken = await user.getIdToken();
  // Call the API route
  const response = await fetch('/api/analyze-text', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`, // Include the auth token
      },
      body: JSON.stringify({
          text: text,
      }),
  });
  const data = await response.json();
  return data.text
}
