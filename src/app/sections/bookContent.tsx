import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookItem, TextExtractionState } from '@/lib/interfaces';
import { getCurrentSentenceBoundaries } from '@/services/tts';

interface Props {
  selectedBook: BookItem
  textExtractionState: TextExtractionState
}

export const BookContent = ({ selectedBook, textExtractionState }: Props) => {
  const [currentSentenceBoundaries, setCurrentSentenceBoundaries] = useState<{ start: number; end: number } | null>(null);

  // Update current sentence boundaries when TTS progresses
  useEffect(() => {
    const updateSentenceBoundaries = () => {
      const boundaries = getCurrentSentenceBoundaries();
      setCurrentSentenceBoundaries(boundaries);
    };

    // Update every 100ms to keep highlighting in sync
    const interval = setInterval(updateSentenceBoundaries, 500);
    return () => clearInterval(interval);
  }, []);

  const renderTextWithHighlight = (text: string) => {
    if (!currentSentenceBoundaries) {
      return text;
    }

    const { start, end } = currentSentenceBoundaries;
    return (
      <>
        {text.substring(0, start)}
        <span className="bg-yellow-200 dark:bg-yellow-800">{text.substring(start, end)}</span>
        {text.substring(end)}
      </>
    );
  };

  return (
    <Card className="flex flex-col flex-1 lg:w-2/3 shadow-md relative pt-10 md:pt-0">
      <CardHeader className="border-b pt-4 pb-4 md:pt-6 md:pb-6 sticky top-0 bg-card z-10">
          <CardTitle className="truncate pr-10">{selectedBook.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        {/* Text Content Display */}
          {textExtractionState.loading && (
              <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading text...</p>
              </div>
          )}
          {textExtractionState.error && (
              <p className="text-sm text-destructive p-4 text-center">{textExtractionState.error}</p>
          )}
          {!textExtractionState.loading && !textExtractionState.error && selectedBook.textContent && (
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {renderTextWithHighlight(selectedBook.textContent)}
              </p>
          )}
          {!textExtractionState.loading && !textExtractionState.error && !selectedBook.textContent && selectedBook.contentType !== 'application/pdf' && (
              <p className="text-sm text-muted-foreground p-4 text-center">Text extraction is not supported for this file type ({selectedBook.contentType}).</p>
          )}
            {!textExtractionState.loading && !textExtractionState.error && !selectedBook.textContent && selectedBook.contentType === 'application/pdf' && (
              <p className="text-sm text-muted-foreground p-4 text-center">Click 'Load Text' or enable automatic loading.</p>
          )}
    </CardContent>
  </Card>
  )
}
