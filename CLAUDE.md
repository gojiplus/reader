# Reader development guide

Reader is a Next.js 15 App Router application for reading text-based PDFs. Firebase provides email/password authentication, per-user file storage, and Firestore metadata. PDF.js extracts text in the browser, the Web Speech API reads it aloud, and server-side Genkit actions provide summaries, quizzes, and sentence explanations.

## Commands

```bash
npm ci
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The development server runs on port 9002. `npm run genkit:dev` and `npm run genkit:watch` open the optional Genkit development UI; the Next.js application invokes the server actions directly.

## Configuration

Copy `.env.example` to `.env.local`. Firebase browser settings use `NEXT_PUBLIC_FIREBASE_*`. Gemini uses the server-only `GEMINI_API_KEY`. Local authenticated server routes use Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`; Google hosting supplies credentials automatically.

Use Node.js 22.12 or newer; `.nvmrc` selects Node.js 22.

## Architecture

- `src/components/AudiobookApp.tsx` coordinates authentication, library, and reader views.
- `src/hooks/useBookManager.ts` subscribes to the signed-in user's Firestore books and manages uploads and deletion.
- `src/services/file-conversion.ts` extracts text from PDFs with PDF.js. EPUB and image-only PDF extraction are not implemented.
- `src/services/tts.ts` provides browser speech synthesis. Reader does not generate or persist audio files.
- `src/app/api/analyze-text/route.ts` verifies Firebase ID tokens before repairing split PDF words.
- `src/ai/ai-instance.ts` configures the current Google GenAI plugin and `gemini-flash-latest`.
- `src/ai/flows/` contains server actions for summaries, quizzes, and sentence explanations.
- `firestore.rules` and `storage.rules` restrict records and files to their authenticated owner.

The webpack customization copies the PDF.js worker into the Next.js static chunks directory. Keep its configured path synchronized with `src/services/file-conversion.ts`.

## Project rules

- Keep PDF support claims aligned with the implementation.
- Do not disable TypeScript or ESLint checks in production builds.
- Use the typed App Router manifest in `src/app/manifest.ts`.
- Run every check above before merging.
- Deploy changed Firebase rules with `firebase deploy --only firestore:rules,storage`.
