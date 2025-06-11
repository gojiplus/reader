import { doc, updateDoc } from 'firebase/firestore'; // Firestore functions
import { Play, Pause, Square, Loader2, Lightbulb, HelpCircle, Check, X, Headphones, AudioLines } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AudioGenerationState, BookItem, QuizState, SummaryState, TextExtractionState, UserAnswers, ViewMode } from "@/lib/interfaces";
import { Button, } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle,  } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { db, auth, storage } from '@/lib/firebase/clientApp'; // Import Storage too
import { generateQuizQuestions, type GenerateQuizQuestionsInput } from '@/ai/flows/generate-quiz-questions';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { speakText, pauseSpeech, resumeSpeech, stopSpeech, getCurrentUtteranceText } from '@/services/tts';
import { summarizeAudiobookChapter } from '@/ai/flows/summarize-audiobook-chapter';
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import usePreviousValue from '@/hooks/usePreviousValue';


interface Props {
  selectedBook: BookItem | null
  setSelectedBook: React.Dispatch<React.SetStateAction<BookItem | null>>
  textExtractionState: TextExtractionState
  audioPlayerRef: React.Ref<HTMLAudioElement>,
  viewMode: ViewMode,
}

export const AiCard = ({
  selectedBook, setSelectedBook, textExtractionState, audioPlayerRef, viewMode,
}: Props) => {
  const { user } = useAuth();
  const previousBook = usePreviousValue<BookItem | null >(selectedBook)

  const { toast } = useToast();
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [audioState, setAudioState] = useState<AudioGenerationState>({ loading: false, error: null, audioUrl: selectedBook?.audioStorageUrl || null });

  // State for Browser TTS
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string | null>(null); // Track the text being spoken/paused

  const [summaryState, setSummaryState] = useState<SummaryState>({ loading: false, data: null, error: null });
  const [quizState, setQuizState] = useState<QuizState>({ loading: false, data: null, error: null });

  useEffect(() => {
    if (previousBook?.id !== selectedBook?.id || selectedBook == null || viewMode !== "reader") {
      setIsSpeakingState(false); // Reset these immediately
      setIsPausedState(false);
      setCurrentSpeakingText(null);
      setSummaryState({ loading: false, data: null, error: null });
      setQuizState({ loading: false, data: null, error: null }); 
      setUserAnswers({});
      setAudioState({ loading: false, error: null, audioUrl: null });
      setQuizSubmitted(false);
      setQuizScore(null);
     }
  }, [previousBook, selectedBook, viewMode])

  // --- TTS Controls ---
  const handlePlayPause = () => {
    if (!selectedBook?.textContent || selectedBook.textContent.startsWith('Error loading text:')) {
      toast({ variant: "default", title: "No Text Available", description: "Text content not loaded or is unavailable for playback." });
      return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ variant: "destructive", title: "TTS Not Supported", description: "Text-to-speech is not available in your browser." });
      return;
    }

    const currentBookText = selectedBook.textContent;
    const currentlySpeaking = isSpeakingState;
    const currentlyPaused = isPausedState;
    const activeUtteranceText = getCurrentUtteranceText(); // Get text from active utterance

    if (currentlySpeaking) {
      console.log("[TTS] Requesting pause.");
      pauseSpeech();
      // State updates handled by onPause callback
    } else {
      // If paused
      if (currentlyPaused) {
        console.log("[TTS] Requesting resume.");
        resumeSpeech();
        // State updates handled by onResume callback
      } else {
        // Otherwise, start speaking the *current* selected book's text from the beginning
        console.log("[TTS] Requesting play for book:", selectedBook.name);
        setCurrentSpeakingText(currentBookText); // Track the text we are INTENDING to speak
        speakText(
          currentBookText, // Use the currently selected book's text
          () => { // onEnd
            console.log("[TTS Callback] Playback finished naturally (onEnd).", isSpeakingState);
            setIsSpeakingState(false);
            setIsPausedState(false);
            setCurrentSpeakingText(null); // Clear tracked text only on natural end from this flow
          },
          (errorEvent) => { // onError
            console.log("[TTS Callback] Speech error event received.", errorEvent); // Log event for debugging
            // Error type might not always be populated, check message too
             const errorMsg = errorEvent.error || (errorEvent as any).message || 'Unknown TTS Error';
             console.log(`[TTS Callback] Error details: ${errorMsg}`);


             // Ignore "interrupted" or "canceled" error, as it's expected when stopping/starting new speech
            if (errorMsg !== 'interrupted' && errorMsg !== 'canceled') {
                 console.error(`[TTS Callback] Unexpected speech error: ${errorMsg}`);
                 toast({
                     variant: "destructive",
                     title: "Speech Error",
                     description: `Could not play audio. Error: ${errorMsg}. Check console for details.`
                 });
             } else {
                 console.log(`[TTS Callback] Ignoring expected error: '${errorMsg}'.`);
             }
             console.log("isSpeakingState", isSpeakingState)
            // Reset state regardless of error type, consistent with tts service logic
            setIsSpeakingState(false);
            setIsPausedState(false);
            setCurrentSpeakingText(null); // Clear tracked text on any error/stop
          },
          () => { // onStart
            console.log('[TTS Callback] Playback started (onStart).', isSpeakingState);
            setIsSpeakingState(true);
            setIsPausedState(false);
          },
          () => { // onPause
             console.log('[TTS Callback] Playback paused (onPause).', isSpeakingState);
            setIsSpeakingState(false);
            setIsPausedState(true);
          },
          () => { // onResume
            console.log('[TTS Callback] Playback resumed (onResume).', isSpeakingState);
              setIsSpeakingState(true);
              setIsPausedState(false);
          },
          (index: number, boundaries: { start: number; end: number }) => {
            console.log('Sentence boundary reached:', index, boundaries);
          }
        );
      }
    }
  };

   const handleStop = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        stopSpeech(); // This should trigger onend or onerror('interrupted'/'canceled')
        // Immediately update UI state for responsiveness
        setIsSpeakingState(false);
        setIsPausedState(false);
        // Explicitly clear tracked text immediately on user stop action
        setCurrentSpeakingText(null);
      }
  };


  // Update UI state based on TTS events (handled by callbacks passed to speakText)
  // These are now mostly for logging or specific UI tweaks if needed outside the buttons.

 // --- Genkit Flow Handlers ---

 const handleSummarize = async () => {
    if (!selectedBook?.textContent || textExtractionState.loading || textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:')) {
        toast({ variant: "default", title: "No Text Available", description: "Load or finish loading valid text content before generating summary." });
        return;
    }
    if (!user) { // Check for user authentication
        toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to use AI features." });
        return;
    }
    // Remove check for isAiInitialized/aiInitializationError as ai-instance is not imported here
    // if (!isAiInitialized || !ai) { // Use Genkit status flags
    //     toast({ variant: "destructive", title: "AI Service Error", description: aiInitializationError || "AI service is not initialized. Check server logs and API key." });
    //     return;
    // }


    setSummaryState({ loading: true, data: null, error: null });
    try {
      const result = await summarizeAudiobookChapter({ chapterText: selectedBook.textContent });
      setSummaryState({ loading: false, data: result, error: null });
      toast({
        title: "Summary Generated",
        description: "Chapter summary created successfully.",
      });
    } catch (error) {
      console.error("Error generating summary (client-side):", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      let userFriendlyMessage = `Failed to generate summary. ${errorMessage}`;
       // Refine user message based on common error types caught by the flow
       if (errorMessage.includes('API key not valid') ||
           // errorMessage.includes('AI service not initialized') || // Removed this check
           errorMessage.includes('server error') ||
           errorMessage.includes('Failed to fetch') ||
           errorMessage.includes('network error') ||
           errorMessage.includes('Invalid input') ||
           errorMessage.includes('Billing account not configured')) {
          userFriendlyMessage = errorMessage; // Use the more specific message from the flow
      } else {
          userFriendlyMessage = "Failed to generate summary due to an unexpected error."; // Generic fallback
      }
      setSummaryState({ loading: false, data: null, error: userFriendlyMessage });
      toast({ variant: "destructive", title: "Summarization Failed", description: userFriendlyMessage });
    }
  };


  const handleGenerateQuiz = async () => {
     if (!selectedBook?.textContent || textExtractionState.loading || textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:')) {
        toast({ variant: "default", title: "No Text Available", description: "Load or finish loading valid text content before generating quiz." });
        return;
    }
     if (!user) { // Check for user authentication
        toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to use AI features." });
        return;
    }
     // Remove check for isAiInitialized/aiInitializationError
    // if (!isAiInitialized || !ai) { // Use Genkit status flags
    //     toast({ variant: "destructive", title: "AI Service Error", description: aiInitializationError || "AI service is not initialized. Check server logs and API key." });
    //     return;
    // }


    setQuizState({ loading: true, data: null, error: null });
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    try {
        const input: GenerateQuizQuestionsInput = { text: selectedBook.textContent, numQuestions: 5 };
        console.log("[Quiz] Requesting quiz generation with input length:", input.text.length);
        const result = await generateQuizQuestions(input);
        console.log("[Quiz] Quiz generation result:", result);
        setQuizState({ loading: false, data: result, error: null });
        toast({ title: "Quiz Generated", description: "Quiz questions created successfully." });
    } catch (error: any) {
        console.error("[Quiz] Error generating quiz (client-side catch):", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        let userFriendlyMessage = `Failed to generate quiz: ${errorMessage}`;

        // Refine message based on common flow errors
        if (errorMessage.includes('API key not valid') ||
            // errorMessage.includes('AI service not initialized') || // Removed check
            errorMessage.includes('invalid quiz data format') ||
            errorMessage.includes('Network error:') ||
            errorMessage.includes('rate limit exceeded') ||
            errorMessage.includes('Invalid input') ||
            errorMessage.includes('Billing account not configured')) {
            userFriendlyMessage = errorMessage; // Use specific message
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('server error') || errorMessage.includes('network error')) {
             userFriendlyMessage = "Failed to generate quiz: Could not reach the AI server.";
        } else if (error?.digest) { // Check for Server Component specific errors
             userFriendlyMessage = `Failed to generate quiz due to a server component error (Digest: ${error.digest}). Check server logs.`;
             console.error("[Quiz] Server Component Error Digest:", error.digest);
        } else {
             userFriendlyMessage = "Failed to generate quiz due to an unexpected error."; // Generic fallback
        }

        setQuizState({ loading: false, data: null, error: userFriendlyMessage });
        toast({ variant: "destructive", title: "Quiz Generation Failed", description: userFriendlyMessage });
    }
  };

 // --- Audio Generation Handler ---
 const handleGenerateAudio = async () => {
     if (!selectedBook?.textContent || textExtractionState.loading || textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:')) {
         toast({ variant: "default", title: "No Text Available", description: "Load or finish loading valid text content before generating audio file." });
         return;
     }
     if (!selectedBook.id || !user || !db || !storage || !auth) {
         toast({ variant: "destructive", title: "Error", description: "Required services unavailable for audio generation." });
         return;
     }

     setAudioState({ loading: true, error: null, audioUrl: null });
     toast({ title: "Starting Audio Generation", description: "Sending text to server..." });

     try {
         // Get the Firebase Auth ID token for the current user
         const idToken = await user.getIdToken();

         console.log(`[Client] Sending audio generation request for bookId: ${selectedBook.id}, text length: ${selectedBook.textContent.length}`);

         // Call the API route
         const response = await fetch('/api/generate-audio', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${idToken}`, // Include the auth token
             },
             body: JSON.stringify({
                 text: selectedBook.textContent,
                 bookId: selectedBook.id,
             }),
         });

         console.log(`[Client] API response status: ${response.status}`);

         if (!response.ok) {
              let errorData = { error: 'Unknown error from server' };
              try {
                   errorData = await response.json();
                   // Log the detailed error from the server if available
                   console.error(`[Client] Server Error Response (${response.status}):`, errorData);
              } catch (parseError) {
                   console.error("[Client] Failed to parse error response JSON:", parseError);
                   // Get raw text if JSON parsing fails
                   const rawErrorText = await response.text();
                   console.error("[Client] Raw Server Error Response Text:", rawErrorText);
                   errorData.error = `Server error ${response.status}. Response body could not be parsed.`;
              }
              // Throw a new error including the status and message from the server if available
             throw new Error(`Server responded with ${response.status}: ${errorData.error || 'Failed to generate audio'}`);
         }

         const data = await response.json();
         const generatedAudioUrl = data.audioUrl;

         if (!generatedAudioUrl) {
              console.error("[Client] API response missing audioUrl:", data);
             throw new Error("Server did not return a valid audio URL.");
         }

         console.log(`[Client] Received audio URL: ${generatedAudioUrl}`);

         // Update Firestore with the new audio storage URL
         const bookRef = doc(db, "books", selectedBook.id);
         // Client-side ownership check (redundant if rules are correct, but good practice)
         if (selectedBook.userId !== user.uid) {
             throw new Error("Permission denied: You do not own this book.");
         }

         try {
             await updateDoc(bookRef, { audioStorageUrl: generatedAudioUrl });
             console.log(`[Firestore] Updated audioStorageUrl for book ${selectedBook.id}`);

             // Update local state immediately for responsiveness
             setSelectedBook(prev => {
                 if (prev && prev.id === selectedBook.id) {
                     return { ...prev, audioStorageUrl: generatedAudioUrl };
                 }
                 return prev; // Don't update if selection changed
             });
             setAudioState({ loading: false, error: null, audioUrl: generatedAudioUrl });
             toast({
                 title: "Audio Generated",
                 description: `Audio file created and saved.`,
             });

         } catch (updateError) {
             console.error("[Firestore] update failed for audio URL:", updateError);
              if (updateError instanceof Error && updateError.message.includes('permission-denied')) {
                   throw new Error("Permission denied: Failed to update book data. Check Firestore rules.");
              }
             throw new Error("Failed to save audio file reference to the database.");
         }

     } catch (error) {
         console.error("[Audio Gen] Error generating audio (client-side):", error);
         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during audio generation.";
         setAudioState({ loading: false, error: errorMessage, audioUrl: null });
         toast({
             variant: "destructive",
             title: "Audio Generation Failed",
             description: errorMessage,
         });
     }
 };


  // --- Quiz Interaction Handlers ---

  const handleAnswerChange = (questionIndex: number, selectedOption: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: selectedOption }));
  };

  const handleQuizSubmit = () => {
    if (!quizState.data) return;
    let correctCount = 0;
    quizState.data.questions.forEach((q, index) => {
      if (userAnswers[index] === q.answer) correctCount++;
    });
    const score = (correctCount / quizState.data.questions.length) * 100;
    setQuizScore(score);
    setQuizSubmitted(true);
    toast({ title: "Quiz Submitted", description: `You scored ${score.toFixed(0)}% (${correctCount}/${quizState.data.questions.length}).` });
  };


  return (
    <Card className="flex flex-col lg:w-1/3 shadow-md overflow-hidden">
      <CardHeader className="border-b sticky top-0 bg-card z-10"><CardTitle>Processing & Insights</CardTitle></CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
          <Accordion type="single" collapsible className="w-full" defaultValue="audio">

            {/* Audio Playback Section (Browser TTS) */}
            <AccordionItem value="audio">
                <AccordionTrigger><div className="flex items-center gap-2 w-full"><Headphones className="h-5 w-5 flex-shrink-0" /><span className="flex-grow text-left">Listen (Browser TTS)</span></div></AccordionTrigger>
                <AccordionContent>
                    <div className="flex items-center justify-center gap-4 py-4">
                        <Button onClick={handlePlayPause} size="icon" variant="outline" disabled={!selectedBook?.textContent || textExtractionState.loading || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:')} aria-label={isSpeakingState ? "Pause" : "Play"}>
                            {isSpeakingState ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                        <Button onClick={handleStop} size="icon" variant="outline" disabled={!isSpeakingState && !isPausedState} aria-label="Stop"><Square className="h-5 w-5" /></Button>
                        {/* Add Speed Controls if desired */}
                        {/* <select onChange={handleSpeedChange} defaultValue="1">...</select> */}
                    </div>
                    {(!selectedBook?.textContent || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:')) && !textExtractionState.loading && <p className="text-sm text-muted-foreground text-center">Load valid text content first.</p>}
                    {textExtractionState.loading && <p className="text-sm text-muted-foreground text-center">Loading text...</p>}
                    { typeof window !== 'undefined' && !window.speechSynthesis && (<p className="text-sm text-destructive text-center mt-2">TTS not supported.</p>)}
                </AccordionContent>
            </AccordionItem>

            {/* Audio Generation Section */}
            <AccordionItem value="generate-audio">
              <AccordionTrigger>
                <div className="flex items-center gap-2 w-full">
                  <AudioLines className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-grow text-left">Generated Audio File</span>
                    {audioState.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {audioState.error && <p className="text-sm text-destructive break-words">{audioState.error}</p>}
                {/* Check audioState.audioUrl or selectedBook.audioStorageUrl */}
                {(audioState.audioUrl || selectedBook?.audioStorageUrl) && !audioState.loading && (
                      <div className="text-sm text-center py-2 space-y-2">
                          <p>Audio file available.</p>
                          {/* Provide a link or embedded player */}
                          <audio controls src={audioState.audioUrl || selectedBook?.audioStorageUrl || ''} ref={audioPlayerRef} className="w-full mt-2">
                              Your browser does not support the audio element.
                              <a href={audioState.audioUrl || selectedBook?.audioStorageUrl || ''} target="_blank" rel="noopener noreferrer">Download Audio</a>
                          </audio>
                          <p className="text-xs text-muted-foreground mt-1">(File stored in Firebase Storage)</p>
                      </div>
                )}
                {!audioState.loading && (
                  <Button onClick={handleGenerateAudio} size="sm" className="w-full mt-2" disabled={!selectedBook?.textContent || audioState.loading || textExtractionState.loading || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:') || !user}>
                    {audioState.loading ? 'Generating...' : ((audioState.audioUrl || selectedBook?.audioStorageUrl) ? 'Regenerate Audio File' : 'Generate Audio File')}
                  </Button>
                )}
                  <p className="text-xs text-muted-foreground mt-2 text-center">Note: Generates an audio file using server-side TTS. Requires loaded text content.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Summary Section */}
            <AccordionItem value="summary">
              <AccordionTrigger><div className="flex items-center gap-2 w-full"><Lightbulb className="h-5 w-5 flex-shrink-0" /><span className="flex-grow text-left">Chapter Summary</span>{summaryState.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}</div></AccordionTrigger>
              <AccordionContent>
                {summaryState.error && <p className="text-sm text-destructive">{summaryState.error}</p>}
                {summaryState.data && <p className="text-sm">{summaryState.data.summary}</p>}
                <Button onClick={handleSummarize} size="sm" className="w-full mt-2" disabled={!selectedBook?.textContent || summaryState.loading || textExtractionState.loading || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:') || !user}>
                  {summaryState.loading ? 'Generating...' : (summaryState.data ? 'Regenerate' : 'Generate Summary')}
                </Button>
                {/* Remove UI feedback about AI service status based on removed imports */}
                {/* {(!isAiInitialized) && (<p className="text-xs text-destructive mt-2 text-center">{aiInitializationError || "AI Service not ready."}</p>)} */}
              </AccordionContent>
            </AccordionItem>

            {/* Quiz Section */}
            <AccordionItem value="quiz">
              <AccordionTrigger><div className="flex items-center gap-2 w-full"><HelpCircle className="h-5 w-5 flex-shrink-0" /><span className="flex-grow text-left">Quick Quiz</span>{quizState.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}</div></AccordionTrigger>
              <AccordionContent>
                {quizState.error && <p className="text-sm text-destructive break-words">{quizState.error}</p>}
                {quizState.data && quizState.data.questions.length > 0 && (
                  <div className="space-y-6">
                      {quizSubmitted && quizScore !== null && (
                        <div className="p-3 bg-muted rounded-md text-center">
                            <p className="text-lg font-semibold">Score: {quizScore.toFixed(0)}%</p>
                            <p className="text-sm text-muted-foreground">({(quizScore / 100 * quizState.data.questions.length).toFixed(0)}/{quizState.data.questions.length} correct)</p>
                        </div>
                      )}
                    {quizState.data.questions.map((q, index) => (
                      <div key={index} className="text-sm border-b pb-4 last:border-b-0">
                        <p className="font-medium mb-2">{index + 1}. {q.question}</p>
                        <RadioGroup value={userAnswers[index]} onValueChange={(value) => handleAnswerChange(index, value)} disabled={quizSubmitted} className="space-y-2">
                          {q.options.map((opt, i) => {
                              const isCorrect = opt === q.answer;
                              const isSelected = userAnswers[index] === opt;
                              const showResultStyle = quizSubmitted;
                              return (
                                  <div key={i} className={cn("flex items-center space-x-2 p-2 rounded-md transition-colors", showResultStyle && isCorrect && "bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700", showResultStyle && !isCorrect && isSelected && "bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700")}>
                                      <RadioGroupItem value={opt} id={`q${index}-opt${i}`} />
                                      <Label htmlFor={`q${index}-opt${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                                      {showResultStyle && (isCorrect ? <Check className="h-4 w-4 text-green-600" /> : isSelected ? <X className="h-4 w-4 text-red-600" /> : null)}
                                  </div>
                              );
                          })}
                        </RadioGroup>
                      </div>
                    ))}
                    {!quizSubmitted && (<Button onClick={handleQuizSubmit} size="sm" className="w-full mt-4" disabled={quizState.loading || Object.keys(userAnswers).length !== quizState.data.questions.length}>Submit Quiz</Button>)}
                      <Button onClick={handleGenerateQuiz} size="sm" variant={quizSubmitted || quizState.data ? "outline" : "default"} className="w-full mt-2" disabled={!selectedBook?.textContent || quizState.loading || textExtractionState.loading || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:') || !user}>
                        {quizState.loading ? 'Generating...' : 'Generate New Quiz'}
                      </Button>
                  </div>
                )}
                {quizState.data && quizState.data.questions.length === 0 && !quizState.loading &&(<p className="text-sm text-muted-foreground">No quiz questions generated.</p>)}
                {!quizState.data && !quizState.error && !quizState.loading && ( // Show generate button only if no data, no error, and not loading
                  <Button onClick={handleGenerateQuiz} size="sm" className="w-full" disabled={!selectedBook?.textContent || quizState.loading || textExtractionState.loading || !!textExtractionState.error || selectedBook.textContent.startsWith('Error loading text:') || !user}>
                    {quizState.loading ? 'Generating...' : 'Generate Quiz'}
                  </Button>
                )}
                {/* Remove UI feedback about AI service status */}
                {/* {(!isAiInitialized) && (<p className="text-xs text-destructive mt-2 text-center">{aiInitializationError || "AI Service not ready."}</p>)} */}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
      </CardContent>
    </Card>
  )
}
