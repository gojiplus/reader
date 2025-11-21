'use client';

import { signOut } from 'firebase/auth';
import { Loader2, ArrowLeft, LogIn, AudioLines } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import LibrarySidebar from '@/app/sections/librarySidebar';
import ReaderView from '@/app/sections/readerView';
import { PerformanceDebugger } from '@/components/PerformanceDebugger';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBookManager } from '@/hooks/useBookManager';
import { useViewMode } from '@/hooks/useViewMode';
import { useErrorHandler, ErrorCategory } from '@/lib/error-handler';
import { auth } from '@/lib/firebase/clientApp';
import { BookItem } from '@/lib/interfaces';
import { createComponentLogger } from '@/lib/logger';
import { stopSpeech } from '@/services/tts';

const logger = createComponentLogger('AudiobookApp');

function AppContent() {
  const { isMobile } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { handleError } = useErrorHandler('AudiobookApp');

  const [mounted, setMounted] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  // Custom hooks for state management
  const {
    books,
    booksLoading,
    selectedBook,
    setSelectedBook,
    textExtractionState,
    handleBookUpload,
    handleDeleteBook,
  } = useBookManager();

  const { viewMode, goToLibrary, goToReader, isLibraryView, isReaderView } = useViewMode();

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user && mounted) {
      logger.info('User not authenticated, redirecting to auth page');
      router.push('/auth');
    }
  }, [user, authLoading, mounted, router]);

  const handleLogout = async () => {
    if (!auth) {
      logger.error('Auth instance not available for logout');
      return;
    }

    try {
      logger.info('User logging out');
      stopSpeech(); // Stop any ongoing speech
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth');
    } catch (error) {
      const errorInfo = handleError(error, {
        category: ErrorCategory.AUTHENTICATION,
        action: 'logout',
      });

      toast({
        variant: 'destructive',
        title: errorInfo.title,
        description: errorInfo.message,
      });
    }
  };

  const handleBookSelect = (book: BookItem) => {
    logger.debug(`Book selected: ${book.title}`);
    setSelectedBook(book);
    goToReader(book);
  };

  const handleBackToLibrary = () => {
    logger.debug('Returning to library view');
    setSelectedBook(null);
    goToLibrary();
  };

  // Show loading state during authentication
  if (!mounted || authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto' />
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <LogIn className='h-16 w-16 mx-auto text-muted-foreground' />
          <h1 className='text-2xl font-bold'>Welcome to AudioBook Buddy</h1>
          <p className='text-muted-foreground max-w-md'>
            Please log in to access your audiobook library and continue reading.
          </p>
          <Button onClick={() => router.push('/auth')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Header */}
      <header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex h-14 items-center px-4 lg:px-6'>
          <div className='flex items-center gap-2'>
            {!isMobile && <SidebarTrigger />}
            {isReaderView && (
              <Button variant='ghost' size='sm' onClick={handleBackToLibrary} className='gap-2'>
                <ArrowLeft className='h-4 w-4' />
                {isMobile ? '' : 'Library'}
              </Button>
            )}
            <div className='flex items-center gap-2'>
              <AudioLines className='h-6 w-6' />
              <h1 className='font-semibold'>AudioBook Buddy</h1>
            </div>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <span className='text-sm text-muted-foreground hidden sm:block'>
              Welcome, {user.email}
            </span>
            <Button variant='outline' size='sm' onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className='flex-1 flex'>
        <LibrarySidebar
          books={books}
          booksLoading={booksLoading}
          selectedBook={selectedBook}
          viewMode={viewMode}
          onSelectBook={handleBookSelect}
          onAddBook={handleBookUpload}
          onDeleteBook={handleDeleteBook}
          onLogout={handleLogout}
          mounted={mounted}
        />
        <SidebarInset className='flex-1'>
          {isLibraryView ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center space-y-4'>
                <AudioLines className='h-16 w-16 mx-auto text-muted-foreground' />
                <h2 className='text-2xl font-bold'>Your Audiobook Library</h2>
                <p className='text-muted-foreground max-w-md'>
                  Select a book from the sidebar to start reading, or upload a new PDF or EPUB file.
                </p>
              </div>
            </div>
          ) : selectedBook ? (
            <ReaderView
              selectedBook={selectedBook}
              textExtractionState={textExtractionState}
              setSelectedBook={setSelectedBook}
              audioPlayerRef={audioPlayerRef}
              onBack={() => goToLibrary()}
              viewMode={viewMode}
              mounted={mounted}
            />
          ) : (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center space-y-4'>
                <Loader2 className='h-8 w-8 animate-spin mx-auto' />
                <p className='text-muted-foreground'>Loading book...</p>
              </div>
            </div>
          )}
        </SidebarInset>
      </div>

      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />

      {/* Performance Debugger (development only) */}
      <PerformanceDebugger />
    </div>
  );
}

export default function AudiobookApp() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  );
}
