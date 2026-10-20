import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import { expect, it, vi } from 'vitest';
import { AiCard } from '@/app/sections/ai';
import { summarizeAudiobookChapter } from '@/ai/flows/summarize-audiobook-chapter';
import { stopSpeech } from '@/services/tts';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'reader' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/ai/flows/summarize-audiobook-chapter', () => ({ summarizeAudiobookChapter: vi.fn() }));
vi.mock('@/ai/flows/generate-quiz-questions', () => ({ generateQuizQuestions: vi.fn() }));
vi.mock('@/services/tts', () => ({ stopSpeech: vi.fn() }));

it('resets generated content and stops speech when the selected book changes', async () => {
  vi.mocked(summarizeAudiobookChapter).mockResolvedValue({ summary: 'First book summary.' });
  const selectedBook = {
    id: 'first',
    userId: 'reader',
    name: 'First',
    contentType: 'text/plain',
    size: 12,
    storageUrl: '',
    textContent: 'First book text.',
    createdAt: Timestamp.now(),
  };
  const props = {
    selectedBook,
    textExtractionState: { loading: false, error: null },
    viewMode: 'reader' as const,
  };
  const user = userEvent.setup();
  const { rerender } = render(<AiCard {...props} />);
  await user.click(screen.getByRole('button', { name: 'Chapter Summary' }));
  await user.click(screen.getByRole('button', { name: 'Generate Summary' }));
  expect(await screen.findByText('First book summary.')).toBeInTheDocument();
  rerender(<AiCard {...props} selectedBook={{ ...selectedBook, id: 'second' }} />);
  expect(screen.queryByText('First book summary.')).not.toBeInTheDocument();
  expect(stopSpeech).toHaveBeenCalled();
});
