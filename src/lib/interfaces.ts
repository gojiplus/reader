import { Timestamp } from 'firebase/firestore'; // Firestore functions
import { type SummarizeAudiobookChapterOutput } from '@/ai/flows/summarize-audiobook-chapter';
import { type GenerateQuizQuestionsOutput, type GenerateQuizQuestionsInput, type Question } from '@/ai/flows/generate-quiz-questions';

// Define a type for a book including its content and Firestore ID
// Define types for AI generated content
export type SummaryState = { loading: boolean; data: SummarizeAudiobookChapterOutput | null; error: string | null };
export type QuizState = { loading: boolean; data: GenerateQuizQuestionsOutput | null; error: string | null };
export type UserAnswers = { [questionIndex: number]: string };
export type AudioGenerationState = { loading: boolean; error: string | null; audioUrl?: string | null };
export type TextExtractionState = { loading: boolean; error: string | null };
export type ViewMode = 'library' | 'reader'

export interface BookItem {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User ID
  name: string; // Original filename
  contentType: string; // MIME type
  size: number; // File size
  storageUrl: string; // URL in Firebase Storage
  textContent?: string; // Extracted text content (optional, loaded on demand)
  createdAt: Timestamp; // Firestore Timestamp
  audioStorageUrl?: string; // URL for generated audio file in Storage
}

