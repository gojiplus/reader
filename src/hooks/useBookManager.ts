'use client';

import {
  collection,
  addDoc,
  query,
  where,
  doc,
  onSnapshot,
  orderBy,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useState, useEffect, useCallback } from 'react';
import type { FileUploadMetadata } from '@/components/feature/file-upload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, ErrorCategory } from '@/lib/error-handler';
import { db, storage } from '@/lib/firebase/clientApp';
import { AudioGenerationState, BookItem, TextExtractionState } from '@/lib/interfaces';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('useBookManager');

export const useBookManager = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { handleError } = useErrorHandler('useBookManager');

  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [audioState, setAudioState] = useState<AudioGenerationState>({
    loading: false,
    error: null,
    audioUrl: null,
  });
  const [textExtractionState, setTextExtractionState] = useState<TextExtractionState>({
    loading: false,
    error: null,
  });

  // Fetch books from Firestore for the logged-in user
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user && db) {
      setBooksLoading(true);
      logger.info(`Setting up listener for books with userId: ${user.uid}`);

      const booksCollection = collection(db, 'books');
      const q = query(
        booksCollection,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const userBooks = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // textContent is loaded on demand, don't expect it from snapshot initially
            textContent: undefined, // Explicitly undefined until loaded
            audioStorageUrl: doc.data().audioStorageUrl || undefined, // Get audio URL
            createdAt: doc.data().createdAt || serverTimestamp(),
          })) as BookItem[];

          logger.info(`Snapshot received. ${querySnapshot.docs.length} books found.`);
          setBooks(userBooks);
          setBooksLoading(false);
        },
        error => {
          const errorInfo = handleError(error, {
            category: ErrorCategory.FIREBASE,
            action: 'fetch_books',
          });

          toast({
            variant: 'destructive',
            title: errorInfo.title,
            description: errorInfo.message,
          });
          setBooksLoading(false);
        }
      );
    } else if (!db && user) {
      const errorInfo = handleError(new Error('Firestore instance not available'), {
        category: ErrorCategory.FIREBASE,
        action: 'database_connection',
      });

      toast({
        variant: 'destructive',
        title: errorInfo.title,
        description: errorInfo.message,
      });
      setBooksLoading(false);
    } else {
      // No user or db, clear books and stop loading
      setBooks([]);
      setBooksLoading(false);
      if (!user && !authLoading) {
        logger.info('No user logged in, clearing books.');
      }
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        logger.debug('Unsubscribed from book updates.');
      }
    };
  }, [user, authLoading, toast, handleError]);

  // Update audio state when selected book changes
  useEffect(() => {
    setAudioState(prev => ({
      ...prev,
      audioUrl: selectedBook?.audioStorageUrl || null,
    }));
  }, [selectedBook]);

  const handleBookUpload = useCallback(
    async (fileMetadata: FileUploadMetadata) => {
      if (!user || !db) {
        const errorInfo = handleError(new Error('User not authenticated or database unavailable'), {
          category: ErrorCategory.AUTHENTICATION,
          action: 'book_upload',
        });

        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
        return;
      }

      try {
        logger.info(`Uploading book: ${fileMetadata.title}`);

        const newBook = {
          title: fileMetadata.title,
          author: fileMetadata.author || 'Unknown Author',
          fileName: fileMetadata.fileName,
          fileSize: fileMetadata.fileSize,
          fileType: fileMetadata.fileType,
          storageUrl: fileMetadata.storageUrl,
          userId: user.uid,
          createdAt: serverTimestamp(),
          textContent: undefined, // Will be loaded on demand
          audioStorageUrl: undefined, // Will be set when audio is generated
        };

        await addDoc(collection(db, 'books'), newBook);
        logger.info(`Book uploaded successfully: ${fileMetadata.title}`);

        toast({
          title: 'Book Uploaded',
          description: `"${fileMetadata.title}" has been added to your library.`,
        });
      } catch (error) {
        const errorInfo = handleError(error, {
          category: ErrorCategory.FIREBASE,
          action: 'book_upload',
          bookTitle: fileMetadata.title,
        });

        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
      }
    },
    [user, toast, handleError]
  );

  const handleDeleteBook = useCallback(
    async (bookToDelete: BookItem) => {
      if (!user || !db || !storage) {
        const errorInfo = handleError(new Error('Services unavailable'), {
          category: ErrorCategory.FIREBASE,
          action: 'book_delete',
        });

        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
        return;
      }

      try {
        logger.info(`Deleting book: ${bookToDelete.title}`);

        // Delete the book document from Firestore
        await deleteDoc(doc(db, 'books', bookToDelete.id));

        // Delete the original file from Storage
        const fileRef = ref(storage, bookToDelete.storageUrl);
        await deleteObject(fileRef);

        // Delete audio file if it exists
        if (bookToDelete.audioStorageUrl) {
          const audioRef = ref(storage, bookToDelete.audioStorageUrl);
          await deleteObject(audioRef);
        }

        logger.info(`Book deleted successfully: ${bookToDelete.title}`);

        toast({
          title: 'Book Deleted',
          description: `"${bookToDelete.title}" has been removed from your library.`,
        });

        // Clear selection if the deleted book was selected
        if (selectedBook?.id === bookToDelete.id) {
          setSelectedBook(null);
        }
      } catch (error) {
        const errorInfo = handleError(error, {
          category: ErrorCategory.FIREBASE,
          action: 'book_delete',
          bookTitle: bookToDelete.title,
        });

        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
      }
    },
    [user, selectedBook, toast, handleError]
  );

  return {
    books,
    booksLoading,
    selectedBook,
    setSelectedBook,
    audioState,
    setAudioState,
    textExtractionState,
    setTextExtractionState,
    handleBookUpload,
    handleDeleteBook,
  };
};
