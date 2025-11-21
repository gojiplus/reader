'use client';

import { useState, useCallback } from 'react';
import { ViewMode, BookItem } from '@/lib/interfaces';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('useViewMode');

export const useViewMode = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('library');

  const goToLibrary = useCallback(() => {
    logger.debug('Navigating to library view');
    setViewMode('library');
  }, []);

  const goToReader = useCallback((book?: BookItem) => {
    logger.debug(`Navigating to reader view${book ? ` for book: ${book.title}` : ''}`);
    setViewMode('reader');
  }, []);

  const toggleView = useCallback(
    (book?: BookItem) => {
      if (viewMode === 'library') {
        goToReader(book);
      } else {
        goToLibrary();
      }
    },
    [viewMode, goToLibrary, goToReader]
  );

  return {
    viewMode,
    setViewMode,
    goToLibrary,
    goToReader,
    toggleView,
    isLibraryView: viewMode === 'library',
    isReaderView: viewMode === 'reader',
  };
};
