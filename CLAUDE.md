# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Basic Development
- `npm run dev` - Start Next.js development server on port 9002
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code linting
- `npm run typecheck` - Run TypeScript type checking without emitting files

### AI Development (Genkit)
- `npm run genkit:dev` - Start Genkit development server for AI flows
- `npm run genkit:watch` - Start Genkit server with file watching
- **Important**: Genkit server must run in parallel to Next.js for AI features to work

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI**: Tailwind CSS, ShadCN UI components, Radix UI primitives  
- **Authentication**: Firebase Auth (email/password)
- **Database**: Firestore for metadata storage
- **File Storage**: Firebase Storage for PDF/EPUB files and generated audio
- **AI**: Google Genkit with Gemini for summarization and quiz generation
- **PDF Processing**: pdfjs-dist for text extraction
- **TTS**: Browser SpeechSynthesis API

### Key Architectural Patterns

#### Client-Server AI Separation
- AI code runs server-side only via Genkit (`src/ai/`)
- Client communicates with AI through API routes (`src/app/api/`)
- Never import server AI code directly in client components

#### Firebase Configuration Validation
- Comprehensive environment variable validation in `src/lib/firebase/clientApp.ts`
- Checks for placeholder values like "YOUR_API_KEY"
- Graceful degradation when Firebase config is invalid

#### File Upload Architecture
- Files stored in user-scoped paths: `audiobooks/{userId}/...`
- Metadata stored in Firestore with user ID validation
- Security rules enforce user isolation for both storage and database

#### PDF Worker Configuration
- Custom webpack config copies PDF.js worker to `/_next/static/chunks/`
- Worker path explicitly set in `src/services/file-conversion.ts`
- This prevents "worker not found" errors in production

### Core Services

#### Authentication (`src/contexts/AuthContext.tsx`)
- Wraps Firebase Auth state management
- Provides loading states and error handling
- Redirects to `/auth` when user is not authenticated

#### File Processing (`src/services/`)
- `file-conversion.ts`: PDF text extraction using pdfjs-dist
- `tts.ts`: Browser-based text-to-speech
- `storage.ts`: Firebase Storage upload/download operations
- `fix-words.ts`: Text cleanup using word-list library

#### AI Flows (`src/ai/flows/`)
- `summarize-audiobook-chapter.ts`: Chapter summarization
- `generate-quiz-questions.ts`: Quiz generation with multiple choice
- `explain-sentence.ts`: Sentence explanation for comprehension

### Security Implementation

#### Firestore Rules (`firestore.rules`)
- User can only access books where `userId == request.auth.uid`
- Prevents cross-user data access
- Rules must be deployed with `firebase deploy --only firestore:rules`

#### Storage Rules (`storage.rules`)
- User-scoped file access: `audiobooks/{userId}/...`
- Only authenticated users can access their own files

#### Environment Variables
- Firebase config: `NEXT_PUBLIC_FIREBASE_*` (client-accessible)
- AI API key: `GOOGLE_GENAI_API_KEY` (server-only, no NEXT_PUBLIC prefix)

### State Management Patterns

#### View State
- Single page app with `ViewMode` ('library' | 'reader')
- Selected book state drives content display
- Audio and text extraction states tracked separately

#### Real-time Updates
- Firestore snapshots for live book list updates
- `onSnapshot` used for reactive UI updates

## Development Workflow

### Running the Application
1. Ensure `.env.local` has valid Firebase and Google AI credentials
2. Start Genkit server: `npm run genkit:dev`
3. Start Next.js server: `npm run genkit:dev` 
4. Access at `http://localhost:9002`

### Adding AI Features
- Create new flows in `src/ai/flows/`
- Export flow in `src/ai/dev.ts` for development
- Add API route in `src/app/api/` to expose to client
- Use Zod schemas for input/output validation

### Working with Firebase
- Test rules locally with Firebase emulators
- Deploy rules before testing: `firebase deploy --only firestore:rules,storage:rules`
- Use rules simulator in Firebase console for testing

### PDF Processing
- Worker path is critical - check `next.config.ts` webpack config
- Test with various PDF formats, handle password-protected files gracefully
- Text extraction happens client-side for immediate feedback

## Configuration Files

### Essential Config
- `next.config.ts`: Webpack PDF worker config, TypeScript/ESLint ignores
- `tailwind.config.ts`: ShadCN theme configuration
- `components.json`: ShadCN component generation settings
- `firebase.json`: Firebase CLI deployment configuration

### Environment Setup
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_GENAI_API_KEY=
```

## Common Issues

### Firebase Errors
- Check `.env.local` for placeholder values
- Verify services enabled in Firebase console
- Ensure rules are deployed, not just saved locally

### PDF Worker Errors
- Check webpack config in `next.config.ts`
- Verify worker file exists at `/_next/static/chunks/pdf.worker.min.mjs`
- Worker setup happens in `src/services/file-conversion.ts`

### AI Integration Issues  
- Genkit server must be running separately
- Check `GOOGLE_GENAI_API_KEY` is valid (not placeholder)
- Review Genkit terminal logs for specific API errors

### Build Issues
- TypeScript errors ignored in build (`ignoreBuildErrors: true`)
- ESLint ignored during builds (`ignoreDuringBuilds: true`)
- This allows rapid iteration but run `npm run typecheck` manually