import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateExplanation } from '@/ai/flows/explain-sentence';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions';
import { summarizeAudiobookChapter } from '@/ai/flows/summarize-audiobook-chapter';

vi.mock('server-only', () => ({}));

const fetchMock = vi.fn();
const text =
  'Plants use sunlight to convert water and carbon dioxide into sugars through photosynthesis.';
const question = {
  question: 'What provides energy for photosynthesis?',
  options: ['Sunlight', 'Salt', 'Sand', 'Sound'],
  answer: 'Sunlight',
};

function respond(output: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: { role: 'model', parts: [{ text: JSON.stringify(output) }] },
            finishReason: 'STOP',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Gemini server actions through the real SDK', () => {
  it('generates a validated explanation with a structured request', async () => {
    respond({ explanation: 'Plants turn sunlight into stored energy.' });
    await expect(generateExplanation({ text })).resolves.toEqual({
      explanation: 'Plants turn sunlight into stored energy.',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(
      /generativelanguage\.googleapis\.com\/.*gemini-flash-latest:generateContent/
    );
    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toContain(text);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema.required).toEqual(['explanation']);
  });

  it('generates a summary', async () => {
    respond({ summary: 'Photosynthesis stores energy in sugars.' });
    await expect(summarizeAudiobookChapter({ chapterText: text })).resolves.toEqual({
      summary: 'Photosynthesis stores energy in sugars.',
    });
  });

  it('generates the requested number of valid quiz questions', async () => {
    respond({ questions: [question] });
    await expect(generateQuizQuestions({ text, numQuestions: 1 })).resolves.toEqual({
      questions: [question],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.responseJsonSchema.properties.questions.minItems).toBe(1);
    expect(body.generationConfig.responseJsonSchema.properties.questions.maxItems).toBe(1);
  });

  it('defaults to three quiz questions', async () => {
    respond({ questions: [question, question, question] });
    expect((await generateQuizQuestions({ text })).questions).toHaveLength(3);
  });

  it('rejects invalid inputs before making an API request', async () => {
    await expect(generateExplanation({ text: '  ' })).rejects.toThrow('Invalid input');
    await expect(summarizeAudiobookChapter({ chapterText: 'short' })).rejects.toThrow(
      'Invalid input'
    );
    await expect(generateQuizQuestions({ text, numQuestions: 11 })).rejects.toThrow(
      'Invalid input'
    );
    await expect(generateQuizQuestions({ text: 'short', numQuestions: 1 })).rejects.toThrow(
      'Invalid input'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'YOUR_GEMINI_API_KEY'])(
    'rejects a missing or placeholder API key: %s',
    async key => {
      vi.stubEnv('GEMINI_API_KEY', key);
      await expect(generateExplanation({ text })).rejects.toThrow('not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('rejects answers outside the quiz options', async () => {
    respond({ questions: [{ ...question, answer: 'Moonlight' }] });
    await expect(generateQuizQuestions({ text, numQuestions: 1 })).rejects.toThrow(
      'invalid response'
    );
  });

  it('rejects the wrong number of quiz questions', async () => {
    respond({ questions: [question] });
    await expect(generateQuizQuestions({ text, numQuestions: 2 })).rejects.toThrow(
      'invalid response'
    );
  });

  it('rejects empty and malformed output', async () => {
    respond({ explanation: '' });
    await expect(generateExplanation({ text })).rejects.toThrow('invalid response');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 })
    );
    await expect(generateExplanation({ text })).rejects.toThrow('no text');
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not JSON' }] } }] }),
        { status: 200 }
      )
    );
    await expect(generateExplanation({ text })).rejects.toThrow('invalid response');
  });

  it('returns a safe error when the provider rejects a request', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 403, message: 'private provider detail' } }), {
        status: 403,
      })
    );
    await expect(generateExplanation({ text })).rejects.toThrow('AI service request failed');
  });
});
