
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth, storage } from '@/lib/firebase/clientApp'; // Import Storage too
import { collection, addDoc, query, where, doc, onSnapshot, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore'; // Firestore functions
import { deleteObject, ref } from 'firebase/storage'; // Storage delete function
import { FileUpload, type FileUploadMetadata } from '@/components/feature/file-upload'; // Import updated type
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Book, Loader2, ArrowLeft, LogOut, Trash2, LogIn, Headphones, AudioLines } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// Import Browser TTS functions
import { stopSpeech } from '@/services/tts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { signOut } from 'firebase/auth';
import { convertFileToText } from '@/services/file-conversion'; // Keep for extracting text on demand
import { AiCard } from './sections/ai';
import { AudioGenerationState, BookItem, TextExtractionState, UserAnswers, ViewMode } from '@/lib/interfaces';
import { BookContent } from './sections/bookContent';
// Remove direct import of ai-instance to prevent bundling server-side code on client
// import { ai, isAiInitialized, aiInitializationError } from '@/ai/ai-instance';




// Moved HomeContent outside to access useSidebar and useAuth hooks
function HomeContent() {
  const { isMobile } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  // Initialize audioState with the audioUrl from the selected book if available
  const [audioState, setAudioState] = useState<AudioGenerationState>({ loading: false, error: null, audioUrl: selectedBook?.audioStorageUrl || null });
  const [textExtractionState, setTextExtractionState] = useState<TextExtractionState>({ loading: false, error: null });
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);


  // Fetch books from Firestore for the logged-in user
   useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user && db) {
      setBooksLoading(true);
      console.log(`[Firestore] Setting up listener for books with userId: ${user.uid}`);
      const booksCollection = collection(db, 'books');
      const q = query(booksCollection, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userBooks = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // textContent is loaded on demand, don't expect it from snapshot initially
          textContent: undefined, // Explicitly undefined until loaded
          audioStorageUrl: doc.data().audioStorageUrl || undefined, // Get audio URL
          createdAt: doc.data().createdAt || serverTimestamp(),
        })) as BookItem[];
        console.log(`[Firestore] Snapshot received. ${querySnapshot.docs.length} books found.`);
        setBooks(userBooks);
        setBooksLoading(false);
      }, (error) => {
        console.error("[Firestore] Error fetching books:", error);
        toast({ variant: "destructive", title: "Error Loading Books", description: "Could not fetch your bookshelf. Check Firestore rules or connection." });
        setBooksLoading(false);
      });
    } else if (!db && user) {
        console.error("[Firestore] Firestore instance (db) is not available. Cannot fetch books.");
        toast({ variant: "destructive", title: "Database Error", description: "Could not connect to the database to fetch books." });
        setBooksLoading(false);
    } else {
      // No user or db, clear books and stop loading
      setBooks([]);
      setBooksLoading(false);
      if (!user && !authLoading) {
         console.log("[Auth] No user logged in, clearing books.");
      }
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
         console.log("[Firestore] Unsubscribed from book updates.");
      }
    };
   }, [user, authLoading, toast]); // Added authLoading dependency


    const addBook = useCallback(async (metadata: FileUploadMetadata) => {
        if (!user) {
            toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to add books." });
            console.error("[addBook] User not logged in.");
            return; // Return here to prevent further execution
        }
         if (!db) {
            console.error("[Firestore] Firestore instance (db) is not available. Cannot add book.");
            toast({ variant: "destructive", title: "Database Error", description: "Could not connect to the database to save the book." });
            return; // Return here
         }

        try {
            console.log("[addBook] Preparing to add book metadata:", metadata); // <-- Add log
            const booksCollection = collection(db, 'books');
            // Prepare data for Firestore, using metadata from storage upload
            // textContent is NOT included here, it's loaded on demand
            const newBookData = {
                userId: user.uid,
                name: metadata.fileName,
                contentType: metadata.contentType,
                size: metadata.size,
                storageUrl: metadata.storageUrl,
                createdAt: serverTimestamp(), // Use Firestore server timestamp
                audioStorageUrl: null, // Initialize audio URL field explicitly
            };
            console.log("[addBook] Calling addDoc..."); // <-- Add log
            const docRef = await addDoc(booksCollection, newBookData);
            console.log("[Firestore] Book added to Firestore with ID: ", docRef.id); // <-- Add log
            toast({ // Move toast here to confirm DB entry
                title: "Book Added",
                description: `"${metadata.fileName}" added to your library.`,
            });
            // No need to manually add to state, onSnapshot will handle it
        } catch (e) {
            console.error("[Firestore] Error adding book metadata to Firestore: ", e);
            toast({
                variant: "destructive",
                title: "Error Saving Book",
                description: "Could not save the book metadata to your library.",
            });
            // Consider deleting the uploaded file from storage if DB entry fails?
            // await deleteFileFromStorage(metadata.storageUrl); // Requires implementation
        }
    }, [user, toast]);


    const deleteBook = async (bookToDelete: BookItem) => {
        if (!user || !db || !storage) {
             toast({ variant: "destructive", title: "Deletion Failed", description: "Required services unavailable." });
             return;
        }

        // If the book being deleted is currently selected, reset the view
        if (selectedBook?.id === bookToDelete.id) {
             handleGoBackToLibrary();
        }

        console.log(`Attempting to delete book: ${bookToDelete.name} (ID: ${bookToDelete.id})`);
        console.log(`Main file URL: ${bookToDelete.storageUrl}`);
        console.log(`Audio file URL: ${bookToDelete.audioStorageUrl}`);

        try {
            // 1. Delete Firestore document
            // Security rule `request.auth.uid == resource.data.userId` should handle authorization
            await deleteDoc(doc(db, "books", bookToDelete.id));
            toast({
                title: "Book Metadata Deleted",
                description: `"${bookToDelete.name}" metadata removed.`,
            });

             // 2. Delete the main file from Firebase Storage
             try {
                 const fileRef = ref(storage, bookToDelete.storageUrl); // Use the storage URL
                 await deleteObject(fileRef);
                 console.log(`[Storage] Successfully deleted main file: ${bookToDelete.storageUrl}`);
                 toast({ title: "Main File Deleted", description: `Main file for "${bookToDelete.name}" deleted.` });
             } catch (storageError: any) {
                 console.error(`[Storage] Error deleting main file ${bookToDelete.storageUrl}:`, storageError);
                  // If file not found, it might have been deleted already or URL was wrong
                 if (storageError.code !== 'storage/object-not-found') {
                      toast({ variant: "destructive", title: "Storage Deletion Failed", description: `Could not delete the main file for "${bookToDelete.name}". Manual cleanup may be needed.` });
                 } else {
                     console.warn(`[Storage] Main file not found (may have been deleted already): ${bookToDelete.storageUrl}`);
                 }
             }

            // 3. Delete the associated audio file from storage if it exists
            if (bookToDelete.audioStorageUrl) {
                 try {
                     const audioRef = ref(storage, bookToDelete.audioStorageUrl);
                     await deleteObject(audioRef);
                     console.log(`[Storage] Successfully deleted audio file: ${bookToDelete.audioStorageUrl}`);
                     toast({ title: "Audio File Deleted", description: `Audio file for "${bookToDelete.name}" deleted.` });
                 } catch (audioStorageError: any) {
                     console.error(`[Storage] Error deleting audio file ${bookToDelete.audioStorageUrl}:`, audioStorageError);
                     if (audioStorageError.code !== 'storage/object-not-found') {
                          toast({ variant: "destructive", title: "Audio Deletion Failed", description: `Could not delete the audio file for "${bookToDelete.name}".` });
                     } else {
                          console.warn(`[Storage] Audio file not found (may have been deleted already): ${bookToDelete.audioStorageUrl}`);
                     }
                 }
            }

            // onSnapshot will update the local state automatically after Firestore delete

        } catch (error) {
            console.error("Error deleting book:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: `Could not delete "${bookToDelete.name}" metadata. Check Firestore rules or connection.`,
            });
        }
    };


  const handleSelectBook = (book: BookItem) => {
    if (selectedBook?.id !== book.id) {
        // Explicitly stop any ongoing speech before switching books
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            console.log("Stopping speech due to book selection change.");
            stopSpeech(); // Ensure stopSpeech resets state correctly
        }
         // Stop any playing audio file
         if (audioPlayerRef.current) {
             audioPlayerRef.current.pause();
             audioPlayerRef.current.currentTime = 0; // Reset playback position
             console.log("Paused and reset audio file player.");
         }


        // Set audio state based on the newly selected book's audio URL
        setAudioState({ loading: false, error: null, audioUrl: book.audioStorageUrl || null });
        setTextExtractionState({ loading: false, error: null });

        // Set the new book (textContent might be loaded later)
        // Clear existing textContent when selecting a *new* book
        setSelectedBook({ ...book, textContent: undefined });
        console.log("Selected new book:", book.name, "ID:", book.id, "Audio URL:", book.audioStorageUrl);
    } else if (viewMode !== 'reader') {
        // If same book is clicked again but we are in library view, switch to reader
        // No need to stop speech as it shouldn't be playing in library view
         console.log("Re-selecting book to enter reader mode:", book.name);
         // Stop any playing audio file if re-entering
         if (audioPlayerRef.current) {
             audioPlayerRef.current.pause();
             audioPlayerRef.current.currentTime = 0;
             console.log("Paused and reset audio file player on re-entry.");
         }
        // Set audio state based on the re-selected book's audio URL
        setAudioState({ loading: false, error: null, audioUrl: book.audioStorageUrl || null });
        setTextExtractionState({ loading: false, error: null });
         // Clear text content if re-entering reader, forces reload check
         setSelectedBook(prev => prev ? { ...prev, textContent: undefined } : null);
    }

    setViewMode('reader'); // Ensure we are in reader view
  };

   // Function to fetch and update text content for a book
   const loadTextContent = useCallback(async (book: BookItem) => {
       if (!book) {
            console.log("[Text Load] Skipping: No book selected.");
            return;
       }
       // If textContent is already loaded and valid (not an error message), skip.
       if (book.textContent && !book.textContent.startsWith('Error loading text:')) {
            console.log(`[Text Load] Skipping: Text already loaded for ${book.name}.`);
            return;
       }
       if (textExtractionState.loading) {
            console.log("[Text Load] Skipping: Text extraction already in progress.");
            return;
       }
       if (book.contentType !== 'application/pdf') {
           toast({ variant: "default", title: "Text Extraction Not Supported", description: `Text extraction is currently only supported for PDF files, not ${book.contentType}.` });
           // Set textContent to a message indicating it's not supported
           setSelectedBook(prev => prev?.id === book.id ? { ...prev, textContent: `Text extraction not supported for ${book.contentType}.` } : prev);
           return;
       }


       console.log(`[Text Load] Starting text extraction for book: ${book.name}, ID: ${book.id}`);
       setTextExtractionState({ loading: true, error: null });
       try {
           // Fetch the file from storage URL
           console.log(`[Text Load] Fetching PDF from URL: ${book.storageUrl}`);
           const response = await fetch(book.storageUrl);
           if (!response.ok) {
               throw new Error(`Failed to fetch PDF file from storage (status: ${response.status})`);
           }
           const blob = await response.blob();
           const file = new File([blob], book.name, { type: book.contentType });
           console.log(`[Text Load] PDF fetched successfully (size: ${file.size} bytes). Starting extraction...`);


           // Extract text using the service
           const extractedText = await convertFileToText(file, user);
           console.log(`[Text Load] Text extraction successful for ${book.id}, length: ${extractedText.length}`);


            // Update the selected book state locally ONLY if the current selected book hasn't changed
           setSelectedBook(prev => {
               if (prev && prev.id === book.id) {
                   console.log(`[Text Load] Updating selected book state with text content for ID: ${book.id}`);
                   return { ...prev, textContent: extractedText };
               }
               console.log(`[Text Load] Selected book changed during text extraction (Current: ${prev?.id}, Extracted: ${book.id}). Not updating state.`);
               return prev; // Don't update if the selected book has changed
           });


            // Optional: Update Firestore with the extracted text for future caching
            // Be mindful of the 1MB document limit! Only do this if text is typically small.
            /*
            if (db && user && book.id && extractedText.length < 800000) { // Example limit check
                 const bookRef = doc(db, "books", book.id);
                 try {
                     await updateDoc(bookRef, { textContent: extractedText });
                     console.log(`[Firestore] Cached extracted text for book ${book.id}`);
                 } catch (updateError) {
                      console.error(`[Firestore] Failed to cache text content for book ${book.id}:`, updateError);
                      // Non-critical error, don't need to bother user
                 }
            }
            */

           setTextExtractionState({ loading: false, error: null });
           toast({ title: "Text Ready", description: "Book content is ready for reading and processing." });

       } catch (error) {
           console.error("[Text Load] Error loading/extracting text content:", error);
           const errorMsg = error instanceof Error ? error.message : "Unknown error during text extraction.";
           setTextExtractionState({ loading: false, error: errorMsg });
           toast({ variant: "destructive", title: "Text Extraction Failed", description: errorMsg });
            // Update state to show error in text area
           setSelectedBook(prev => {
               if (prev && prev.id === book.id) {
                    console.log(`[Text Load] Updating selected book state with error message for ID: ${book.id}`);
                   return { ...prev, textContent: `Error loading text: ${errorMsg}` };
               }
                console.log(`[Text Load] Selected book changed during error handling. Not updating state.`);
               return prev;
           });
       }
   }, [toast, textExtractionState.loading]); // Dependencies


    // Trigger text loading when entering reader mode or when selectedBook changes IF text not present
    useEffect(() => {
        if (viewMode === 'reader' && selectedBook && !selectedBook.textContent && !textExtractionState.loading) {
            console.log(`[Effect] Trigger: Load text for selected book ${selectedBook.name}`);
            loadTextContent(selectedBook);
        }
         else if (viewMode === 'reader' && selectedBook && selectedBook.textContent) {
             console.log(`[Effect] Text content already available for ${selectedBook.name}`);
             // Also ensure audio state is synced if text is already loaded
             if (audioState.audioUrl !== selectedBook.audioStorageUrl) {
                 console.log(`[Effect] Syncing audio state for ${selectedBook.name}. Current: ${audioState.audioUrl}, Book: ${selectedBook.audioStorageUrl}`);
                 setAudioState(prev => ({ ...prev, audioUrl: selectedBook.audioStorageUrl || null }));
             }
         }
         else if (viewMode === 'reader' && !selectedBook) {
             console.log("[Effect] In reader mode but no book selected.");
         } else if (viewMode === 'library') {
              console.log("[Effect] In library mode.");
         }
    }, [viewMode, selectedBook, textExtractionState.loading, loadTextContent, audioState.audioUrl]);


  const handleGoBackToLibrary = () => {
     // Explicitly stop speech when going back
     if (typeof window !== 'undefined' && window.speechSynthesis) {
        console.log("Stopping speech due to navigating back to library.");
        stopSpeech(); // Ensure stopSpeech resets state correctly
     }
      // Stop any playing audio file
      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0; // Reset playback position
          console.log("Paused and reset audio file player when going back to library.");
      }

     // Reset all reader-specific states
    setSelectedBook(null);
    setViewMode('library');
     setAudioState({ loading: false, error: null, audioUrl: null });
     setTextExtractionState({ loading: false, error: null });
     console.log("Navigated back to library, state reset.");
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    try {
        if (!auth) {
            console.error("Logout failed: Auth instance is not available.");
            toast({ variant: 'destructive', title: 'Logout Failed', description: 'Authentication service unavailable.' });
            return;
        }
        await signOut(auth);
        toast({ title: 'Logged Out', description: 'You have been logged out successfully.' });
        // Reset all application state on logout
        handleGoBackToLibrary(); // Reset reader view first
        setBooks([]); // Clear books list
        router.push('/auth'); // Redirect to auth page after logout
    } catch (error) {
        console.error("Logout failed:", error);
        toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log you out.' });
    }
  };


   // Cleanup TTS on component unmount or when viewMode changes
   useEffect(() => {
      return () => {
         if (typeof window !== 'undefined' && window.speechSynthesis) {
            console.log("Stopping speech due to component unmount or view change.");
            stopSpeech();
         }
          // Stop audio player on unmount/view change
          if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
          }
      };
   }, [viewMode]); // Re-run cleanup if viewMode changes

  useEffect(() => { setMounted(true); }, []);

  // Render Loading state or Authentication error centrally
  if (authLoading || !mounted) {
       // Still determining auth state or not yet mounted on client
      return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
   if (!user) {
       // Auth state resolved, but no user. AuthProvider handles redirect, but we can render null or minimal layout here.
       // This helps prevent flashing the main UI before redirect completes.
       return null; // Or a simple placeholder/message
   }


  return (
    <>
      {/* Sidebar */}
       <SidebarProvider>
          <Sidebar collapsible="icon">
             <SidebarHeader className="items-center border-b border-sidebar-border">
               <div className="flex items-center gap-2">
                  <AudioLines className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">AudioBook Buddy</h1>
               </div>
               {mounted && isMobile && <div className="ml-auto"><SidebarTrigger /></div>}
             </SidebarHeader>
             <SidebarContent className="p-0 flex flex-col">
                 <div className="p-4 flex-grow overflow-hidden">
                     <p className="mb-2 font-medium text-foreground group-data-[collapsible=icon]:hidden">Your Library</p>
                      {booksLoading ? (
                        <div className="mt-4 space-y-2 group-data-[collapsible=icon]:hidden">
                             {[...Array(3)].map((_, i) => (
                                 <div key={i} className="flex items-center space-x-2 p-2 rounded bg-muted/50 animate-pulse">
                                     <Book className="h-4 w-4 text-muted-foreground/50" />
                                     <div className="h-4 bg-muted-foreground/30 rounded w-3/4"></div>
                                 </div>
                             ))}
                        </div>
                      ) : books.length === 0 ? (
                          <div className="mt-4 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">Upload a PDF file.</div>
                      ) : (
                          <ScrollArea className="h-[calc(100vh-280px)] group-data-[collapsible=icon]:h-auto">
                              <ul className="space-y-1 pr-4 group-data-[collapsible=icon]:pr-0">
                              {books.map((book) => (
                                <li key={book.id} className="group/book-item relative">
                                  <Button
                                    variant={selectedBook?.id === book.id && viewMode === 'reader' ? "secondary" : "ghost"}
                                    className={cn(
                                        `w-full justify-start text-left h-auto py-2 px-2`,
                                        selectedBook?.id === book.id && viewMode === 'reader' && 'font-semibold'
                                    )}
                                    onClick={() => handleSelectBook(book)}
                                    title={book.name}
                                  >
                                    <Book className="h-4 w-4 mr-2 flex-shrink-0 group-data-[collapsible=icon]:mr-0" />
                                    {/* Make sure span is visible in expanded mode */}
                                    <span className="flex-grow ml-1 group-data-[collapsible=icon]">{book.name}</span>
                                    {book.audioStorageUrl && ( // Check for generated audio URL
                                         <Headphones className="h-3 w-3 ml-auto text-muted-foreground flex-shrink-0 group-data-[collapsible=icon]:hidden" title="Generated audio available"/>
                                    )}
                                  </Button>
                                   <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-1/2 -translate-y-1/2 mr-1 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover/book-item:opacity-100 focus:opacity-100 group-data-[collapsible=icon]:hidden"
                                                aria-label={`Delete book ${book.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete "{book.name}" {book.audioStorageUrl ? 'and its associated audio file ' : ''}from Firestore and Storage.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteBook(book)} className={buttonVariants({ variant: "destructive" })}>
                                                Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                      )}
                </div>

                 <div className="border-t border-sidebar-border p-4 mt-auto group-data-[collapsible=icon]:p-2">
                     {/* Pass the updated addBook function */}
                    <FileUpload onUploadSuccess={addBook} />
                </div>

                 <div className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
                     <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                         <div className="flex-grow truncate group-data-[collapsible=icon]:hidden">
                            <p className="text-sm font-medium text-foreground truncate" title={user?.email || 'User'}>{user?.email || 'User'}</p>
                        </div>
                         <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-auto group-data-[collapsible=icon]:ml-0" title="Logout">
                            <LogOut className="h-4 w-4" />
                         </Button>
                     </div>
                 </div>
             </SidebarContent>
           </Sidebar>
      </SidebarProvider>

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col">
         {mounted && isMobile && (
             <header className="flex h-14 items-center gap-2 border-b bg-card px-4 sticky top-0 z-10">
                 {/* Always show SidebarTrigger on mobile */}
                 <SidebarTrigger />
                 {/* Conditionally show Back button *next* to trigger */}
                 {viewMode === 'reader' && (
                     <Button variant="ghost" size="icon" onClick={handleGoBackToLibrary} aria-label="Back to Library" className="ml-1">
                         <ArrowLeft className="h-5 w-5" />
                     </Button>
                 )}
                 <div className="flex items-center gap-2 flex-grow justify-center">
                     <AudioLines className="h-6 w-6 text-primary" />
                     <h1 className="text-xl font-semibold text-foreground">AudioBook Buddy</h1>
                 </div>
                 <div className="w-8">
                     {!user && !authLoading && (
                         <Button variant="ghost" size="icon" onClick={() => router.push('/auth')} title="Login">
                             <LogIn className="h-5 w-5" />
                         </Button>
                     )}
                 </div>
             </header>
         )}
        <main className="flex flex-1 flex-col items-stretch p-4 md:p-6 overflow-hidden">
          {viewMode === 'library' && (
             <div className="flex flex-1 flex-col items-center justify-center text-center">
                 <AudioLines size={48} className="text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Welcome, {user?.email || 'User'}!</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {books.length > 0 ? "Select a book from your library." : "Upload a PDF file to begin."}
                </p>
                 {books.length === 0 && !booksLoading && (<p className="text-sm text-primary animate-pulse">Use 'Upload File' in the sidebar.</p>)}
             </div>
          )}

          {viewMode === 'reader' && selectedBook && (
            <div className="flex flex-1 flex-col lg:flex-row gap-4 md:gap-6 max-w-7xl mx-auto w-full overflow-hidden">
                {mounted && !isMobile && (
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
                         <Button variant="outline" size="icon" onClick={handleGoBackToLibrary} aria-label="Back to Library"><ArrowLeft className="h-5 w-5" /></Button>
                     </div>
                 )}

              {/* Book Content Area */}
              <BookContent
                selectedBook={selectedBook}
                textExtractionState={textExtractionState}              
              />

              {/* AI Features & Audio Area */}
              <AiCard
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                textExtractionState={textExtractionState}
                audioPlayerRef={audioPlayerRef}
                viewMode={viewMode}
              />
            </div>
          )}
        </main>
      </SidebarInset>
    </>
  );
}


// Wrap HomeContent with Providers if needed (Auth is now in layout)
export default function Home() {
  return (
      // AuthProvider is in RootLayout now
      <SidebarProvider>
          <HomeContent />
      </SidebarProvider>
  );
}


