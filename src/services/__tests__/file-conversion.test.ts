import type { User } from 'firebase/auth';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { convertFileToText } from '@/services/file-conversion';

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument, GlobalWorkerOptions: { workerSrc: '' } }));
vi.mock('@/services/fix-words', () => ({
  fixSplitWordsWithWordList: vi.fn(async (_user: User, text: string) => text),
}));

const user = { uid: 'test-reader' } as User;
const file = () => new File(['pdf bytes'], 'book.pdf', { type: 'application/pdf' });

beforeEach(() => {
  getDocument.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it('extracts every page and releases page resources and the worker', async () => {
  const cleanup = vi.fn();
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocument.mockReturnValue({
    destroy,
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn(async (number: number) => ({
        getTextContent: async () => ({ items: [{ str: `Page ${number}` }] }),
        cleanup,
      })),
    }),
  });
  await expect(convertFileToText(file(), user)).resolves.toBe('Page 1\n\nPage 2');
  expect(cleanup).toHaveBeenCalledTimes(2);
  expect(destroy).toHaveBeenCalledTimes(1);
});

it('releases the worker even when the PDF cannot be loaded', async () => {
  const destroy = vi.fn().mockResolvedValue(undefined);
  const error = Object.assign(new Error('Invalid PDF structure'), {
    name: 'InvalidPDFException',
  });
  getDocument.mockReturnValue({ destroy, promise: Promise.reject(error) });
  await expect(convertFileToText(file(), user)).rejects.toThrow('not a valid PDF');
  expect(destroy).toHaveBeenCalledTimes(1);
});
