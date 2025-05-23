import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookItem, TextExtractionState } from '@/lib/interfaces';

interface Props {
  selectedBook: BookItem
  textExtractionState: TextExtractionState
}

export const BookContent = ({ selectedBook, textExtractionState }: Props) => {
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
                  {selectedBook.textContent}
              </p>
          )}
          {!textExtractionState.loading && !textExtractionState.error && !selectedBook.textContent && selectedBook.contentType !== 'application/pdf' && (
              <p className="text-sm text-muted-foreground p-4 text-center">Text extraction is not supported for this file type ({selectedBook.contentType}).</p>
          )}
            {!textExtractionState.loading && !textExtractionState.error && !selectedBook.textContent && selectedBook.contentType === 'application/pdf' && (
              <p className="text-sm text-muted-foreground p-4 text-center">Click 'Load Text' or enable automatic loading.</p> // Fallback message
          )}
    </CardContent>
  </Card>
  )
}
