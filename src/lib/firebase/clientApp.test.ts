import { deleteApp } from 'firebase/app';
import { afterAll, expect, it, vi } from 'vitest';

vi.unmock('@/lib/firebase/clientApp');

const { app, auth, db, storage, firebaseConfigValid, initError } = await import('./clientApp');

afterAll(async () => {
  if (app) await deleteApp(app);
});

it('initializes the real Firebase services against the same app registry', () => {
  expect(initError).toBeNull();
  expect(firebaseConfigValid).toBe(true);
  expect(app).not.toBeNull();
  expect(auth?.app).toBe(app);
  expect(db?.app).toBe(app);
  expect(storage?.app).toBe(app);
});
