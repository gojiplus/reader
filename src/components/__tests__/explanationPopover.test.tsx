import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ExplanationPopover } from '@/components/explanationPopover';
import { generateExplanation } from '@/ai/flows/explain-sentence';

vi.mock('@/ai/flows/explain-sentence', () => ({ generateExplanation: vi.fn() }));
vi.mock('@/services/tts', () => ({ pauseSpeech: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

it('shows a failed explanation and waits for an explicit retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(generateExplanation)
    .mockRejectedValueOnce(new Error('AI service request failed.'))
    .mockResolvedValueOnce({ explanation: 'Plants convert sunlight into stored energy.' });
  const user = userEvent.setup();
  render(
    <ExplanationPopover
      sentence='Photosynthesis stores energy.'
      position={{ top: 100, left: 100 }}
    />
  );
  await user.click(screen.getByRole('button', { name: 'Explain' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to get an explanation');
  expect(generateExplanation).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() =>
    expect(screen.getByText('Plants convert sunlight into stored energy.')).toBeInTheDocument()
  );
  expect(generateExplanation).toHaveBeenCalledTimes(2);
});
