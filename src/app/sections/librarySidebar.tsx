import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarHeader, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';
import { AudioLines, LogOut } from 'lucide-react';
import { FileUpload, type FileUploadMetadata } from '@/components/feature/file-upload';
import { Button } from '@/components/ui/button';
import { BookItem, ViewMode } from '@/lib/interfaces';
import { BookList } from './bookList';

interface Props {
  books: BookItem[];
  booksLoading: boolean;
  selectedBook: BookItem | null;
  viewMode: ViewMode;
  onAddBook: (metadata: FileUploadMetadata) => void;
  onSelectBook: (book: BookItem) => void;
  onDeleteBook: (book: BookItem) => void;
  onLogout: () => void;
  mounted: boolean;
}

export const LibrarySidebar = ({
  books,
  booksLoading,
  selectedBook,
  viewMode,
  onAddBook,
  onSelectBook,
  onDeleteBook,
  onLogout,
  mounted,
}: Props) => {
  const { isMobile } = useSidebar();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <AudioLines className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            AudioBook Buddy
          </h1>
        </div>
        {mounted && isMobile && (
          <div className="ml-auto">
            <SidebarTrigger />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="p-0 flex flex-col">
        <div className="p-4 flex-grow overflow-hidden">
          <p className="mb-2 font-medium text-foreground group-data-[collapsible=icon]:hidden">
            Your Library
          </p>
          <BookList
            books={books}
            booksLoading={booksLoading}
            selectedBook={selectedBook}
            viewMode={viewMode}
            onSelectBook={onSelectBook}
            onDeleteBook={onDeleteBook}
          />
        </div>
        <div className="border-t border-sidebar-border p-4 mt-auto group-data-[collapsible=icon]:p-2">
          <FileUpload onUploadSuccess={onAddBook} />
        </div>
        <div className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex-grow truncate group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-foreground truncate" title={user?.email || 'User'}>
                {user?.email || 'User'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="ml-auto group-data-[collapsible=icon]:ml-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default LibrarySidebar;
