import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';
import { fixWordsWithIterations } from '@/lib/word-processing';

const MAX_TEXT_LENGTH = 2_000_000;
const InputSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
});

export const runtime = 'nodejs';

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function getAdminAuth() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

  return getAuth(app);
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.error('[Analyze Text] Firebase token verification failed:', error);
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const input = InputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: 'Text must contain between 1 and 2,000,000 characters.' },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ text: fixWordsWithIterations(input.data.text) });
  } catch (error) {
    console.error('[Analyze Text] Word repair failed:', error);
    return NextResponse.json({ error: 'Text processing failed.' }, { status: 500 });
  }
}
