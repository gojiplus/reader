import { BookItem, ViewMode } from '@/lib/interfaces';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Book, Trash2, Headphones } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  books: BookItem[];
  booksLoading: boolean;
  selectedBook: BookItem | null;
  viewMode: ViewMode;
  onSelectBook: (book: BookItem) => void;
  onDeleteBook: (book: BookItem) => void;
}

export const BookList = ({
  books,
  booksLoading,
  selectedBook,
  viewMode,
  onSelectBook,
  onDeleteBook,
}: Props) => {
  if (booksLoading) {
    return (
      <div className="mt-4 space-y-2 group-data-[collapsible=icon]:hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-2 p-2 rounded bg-muted/50 animate-pulse"
          >
            <Book className="h-4 w-4 text-muted-foreground/50" />
            <div className="h-4 bg-muted-foreground/30 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="mt-4 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
        Upload a PDF file.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)] group-data-[collapsible=icon]:h-auto">
      <ul className="space-y-1 pr-4 group-data-[collapsible=icon]:pr-0">
        {books.map((book) => (
          <li key={book.id} className="group/book-item relative">
            <Button
              variant={
                selectedBook?.id === book.id && viewMode === 'reader'
                  ? 'secondary'
                  : 'ghost'
              }
              className={cn(
                'w-full justify-start text-left h-auto py-2 px-2',
                selectedBook?.id === book.id && viewMode === 'reader' && 'font-semibold'
              )}
              onClick={() => onSelectBook(book)}
              title={book.name}
            >
              <Book className="h-4 w-4 mr-2 flex-shrink-0 group-data-[collapsible=icon]:mr-0" />
              <span className="flex-grow ml-1 group-data-[collapsible=icon]">{book.name}</span>
              {book.audioStorageUrl && (
                <Headphones
                  className="h-3 w-3 ml-auto text-muted-foreground flex-shrink-0 group-data-[collapsible=icon]:hidden"
                  title="Generated audio available"
                />
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
                    This action cannot be undone. This will permanently delete "{book.name}"{' '}
                    {book.audioStorageUrl ? 'and its associated audio file ' : ''}from Firestore and Storage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteBook(book)}
                    className={buttonVariants({ variant: 'destructive' })}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};

export default BookList;
