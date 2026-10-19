import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod/v4';

export async function generateStructured<T extends z.ZodType>(
  prompt: string,
  schema: T
): Promise<z.output<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error('AI service is not configured. Set GEMINI_API_KEY on the server.');
  }

  const client = new GoogleGenAI({ apiKey });
  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(schema),
        httpOptions: { timeout: 60_000 },
      },
    });
    text = response.text;
  } catch {
    throw new Error('AI service request failed. Please try again.');
  }

  if (!text) {
    throw new Error('AI service returned no text. Please try again.');
  }

  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new Error('AI service returned an invalid response. Please try again.');
  }
}
