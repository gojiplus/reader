import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyIdToken, fixWordsWithIterations } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  fixWordsWithIterations: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  applicationDefault: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken })),
}));

vi.mock('@/lib/word-processing', () => ({ fixWordsWithIterations }));

import { POST } from './route';

function makeRequest(body: unknown, token?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return new NextRequest('http://localhost/api/analyze-text', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/analyze-text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    fixWordsWithIterations.mockReturnValue('Fixed text.');
  });

  it('rejects requests without a bearer token', async () => {
    const response = await POST(makeRequest({ text: 'Split text' }));

    expect(response.status).toBe(401);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects invalid Firebase ID tokens', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const response = await POST(makeRequest({ text: 'Split text' }, 'invalid-token'));

    expect(response.status).toBe(401);
    expect(fixWordsWithIterations).not.toHaveBeenCalled();
  });

  it('rejects empty text after authentication', async () => {
    const response = await POST(makeRequest({ text: '' }, 'valid-token'));

    expect(response.status).toBe(400);
    expect(fixWordsWithIterations).not.toHaveBeenCalled();
  });

  it('repairs text for an authenticated user', async () => {
    const response = await POST(makeRequest({ text: 'Split text' }, 'valid-token'));

    expect(response.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(fixWordsWithIterations).toHaveBeenCalledWith('Split text');
    await expect(response.json()).resolves.toEqual({ text: 'Fixed text.' });
  });
});
