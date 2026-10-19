# Reader

Reader turns uploaded PDFs into a private reading and listening workspace. It extracts text in the browser, reads it with the Web Speech API, and uses Gemini for summaries, quizzes, and sentence explanations.

## What works

- Email/password authentication with Firebase Authentication
- Per-user PDF storage and library metadata with Firebase Storage and Firestore
- PDF text extraction with PDF.js
- Browser text-to-speech with pause, resume, and stop controls
- Gemini summaries, quizzes, and sentence explanations
- Responsive reader and library views

Only text-based PDFs are supported. Reader does not currently extract text from EPUB files, scanned PDFs, or image-only PDFs.

## Development

Reader uses Node.js 22 LTS (22.22.2 or newer) and npm 12.2.0. Copy the environment template and add credentials for a Firebase project with Email/Password Authentication, Firestore, and Storage enabled.

```bash
cp .env.example .env.local
npm install --global npm@12.2.0
npm ci
npm run dev
```

The development server runs at <http://localhost:9002>. Gemini-backed features require `GEMINI_API_KEY`. Authenticated server routes use Application Default Credentials; Google hosting supplies them automatically, while local development can set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file.

Deploy the checked-in Firebase rules before using a shared environment:

```bash
firebase deploy --only firestore:rules,storage
```

## Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm audit --omit=dev
npm test
npm run build
```

The unit suite covers the state hooks, logging, error handling, and AI actions using mocked Gemini responses. Firebase, Gemini, and browser speech synthesis still require integration testing against configured services.
