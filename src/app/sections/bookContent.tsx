import { Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookItem, TextExtractionState } from '@/lib/interfaces';
import { getCurrentSentenceBoundaries } from '@/services/tts';
import { ExplanationPopover } from '@/components/explanationPopover';

interface Props {
  selectedBook: BookItem
  textExtractionState: TextExtractionState
}

export const BookContent = ({ selectedBook, textExtractionState }: Props) => {
  const [currentSentenceBoundaries, setCurrentSentenceBoundaries] = useState<{ start: number; end: number } | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Update current sentence boundaries when TTS progresses
  useEffect(() => {
    const updateSentenceBoundaries = () => {
      const boundaries = getCurrentSentenceBoundaries();
      setCurrentSentenceBoundaries(boundaries);

      // Update popover position when boundaries change
      if (boundaries && textRef.current) {
        let currentPosition = 0;
        let startNode: Node | null = null;
        let startOffset = 0;
        let endNode: Node | null = null;
        let endOffset = 0;

        // Traverse all text nodes to find the correct positions
        const walker = document.createTreeWalker(
          textRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length || 0;
          
          // Check if the start boundary is in this node
          if (!startNode && currentPosition + nodeLength > boundaries.start) {
            startNode = node;
            startOffset = boundaries.start - currentPosition;
          }
          
          // Check if the end boundary is in this node
          if (!endNode && currentPosition + nodeLength >= boundaries.end) {
            endNode = node;
            endOffset = boundaries.end - currentPosition;
            break;
          }
          
          currentPosition += nodeLength;
        }

        if (startNode && endNode) {
          const range = document.createRange();
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          const rect = range.getBoundingClientRect();
          const containerRect = textRef.current.getBoundingClientRect();
          
          setPopoverPosition({
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left + (rect.width / 2),
          });
        } else {
          setPopoverPosition(null);
        }
      } else {
        setPopoverPosition(null);
      }
    };

    // Update every 500ms to keep highlighting in sync
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

  const highlightedText = useMemo(() => {
    if (!currentSentenceBoundaries) return ''
    return selectedBook?.textContent?.substring?.(
      currentSentenceBoundaries.start,
      currentSentenceBoundaries?.end,
  )}, [selectedBook, currentSentenceBoundaries])

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
              <div className="relative">
                  <p ref={textRef} className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {renderTextWithHighlight(selectedBook.textContent)}
                  </p>
                  {currentSentenceBoundaries && popoverPosition && (
                      <ExplanationPopover
                          key={`${currentSentenceBoundaries.start}-${currentSentenceBoundaries.end}`} // key is a combination of sentence boundaries
                          sentence={selectedBook.textContent.substring(
                              currentSentenceBoundaries.start,
                              currentSentenceBoundaries.end
                          )}
                          position={popoverPosition}
                      />
                  )}
              </div>
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
