import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BookItem, TextExtractionState, ViewMode } from '@/lib/interfaces';
import { BookContent } from './bookContent';
import { AiCard } from './ai';

interface Props {
  selectedBook: BookItem;
  textExtractionState: TextExtractionState;
  setSelectedBook: React.Dispatch<React.SetStateAction<BookItem | null>>;
  audioPlayerRef: React.Ref<HTMLAudioElement>;
  onBack: () => void;
  viewMode: ViewMode;
  mounted: boolean;
}

export const ReaderView = ({
  selectedBook,
  textExtractionState,
  setSelectedBook,
  audioPlayerRef,
  onBack,
  viewMode,
  mounted,
}: Props) => {
  const { isMobile } = useSidebar();

  return (
    <div className="flex flex-1 flex-col lg:flex-row gap-4 md:gap-6 max-w-7xl mx-auto w-full overflow-hidden">
      {mounted && !isMobile && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
          <Button variant="outline" size="icon" onClick={onBack} aria-label="Back to Library">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      )}
      <BookContent selectedBook={selectedBook} textExtractionState={textExtractionState} />
      <AiCard
        selectedBook={selectedBook}
        setSelectedBook={setSelectedBook}
        textExtractionState={textExtractionState}
        audioPlayerRef={audioPlayerRef}
        viewMode={viewMode}
      />
    </div>
  );
};

export default ReaderView;
