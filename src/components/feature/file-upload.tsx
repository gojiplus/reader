'use client';

import { Upload, Loader2 } from 'lucide-react'; // Added Loader2
import React, { useRef, useState, type ChangeEvent } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage } from '@/services/storage'; // Import the storage service
// Removed import for convertFileToText

// Define the structure for the metadata passed to onUploadSuccess
// Removed textContent as it's no longer extracted during upload
export interface FileUploadMetadata {
  fileName: string;
  title?: string; // Book title (extracted from filename or user-provided)
  author?: string; // Book author (extracted or user-provided)
  contentType: string;
  size: number;
  fileSize: number; // Alias for size to match usage
  fileType: string; // Alias for contentType to match usage
  storageUrl: string;
}

interface FileUploadProps {
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
  // Updated callback to receive metadata object
  onUploadSuccess?: (metadata: FileUploadMetadata) => void | Promise<void>; // Allow async callback
}

export function FileUpload({
  buttonVariant = 'outline',
  buttonSize = 'default',
  onUploadSuccess,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // Track upload progress
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation (allow only PDF for now, ePUB needs storage setup too)
    const allowedTypes = ['application/pdf']; // Limit to PDF for now
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a PDF file.', // Updated message
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0); // Reset progress
    toast({
      title: 'Starting Upload',
      description: `Uploading ${file.name}...`,
    });

    try {
      // 1. Upload file to Firebase Storage
      console.warn('[FileUpload] Calling uploadFileToStorage...');
      const downloadURL = await uploadFileToStorage(
        file,
        'audiobooks/', // Store in 'audiobooks/' folder
        progress => {
          setUploadProgress(progress); // Update progress state
        }
      );
      console.warn('[FileUpload] uploadFileToStorage finished successfully. URL:', downloadURL); // <-- Add log

      // 2. Prepare metadata for Firestore (without text content)
      // Extract title from filename (remove extension)
      const title = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();

      const metadata: FileUploadMetadata = {
        fileName: file.name,
        title,
        author: undefined, // Can be added later if extracted from file content
        contentType: file.type,
        size: file.size,
        fileSize: file.size, // Alias for compatibility
        fileType: file.type, // Alias for compatibility
        storageUrl: downloadURL,
      };

      console.warn('[FileUpload] Metadata prepared:', metadata);

      toast({
        title: 'Upload Successful',
        description: `${file.name} uploaded and saved.`,
      });

      // 3. Call the success callback with the metadata
      if (onUploadSuccess) {
        console.warn('[FileUpload] Calling onUploadSuccess...'); // <-- Add log
        await onUploadSuccess(metadata); // Await if it's async
        console.warn('[FileUpload] onUploadSuccess finished.'); // <-- Add log
      } else {
        console.warn('[FileUpload] No onUploadSuccess callback provided.');
      }
    } catch (error: unknown) {
      console.error('Error during file upload process (FileUpload component):', error); // Log context
      let errorMessage = 'Could not upload the file.';
      if (error instanceof Error) {
        errorMessage = error.message; // Use the specific error from the storage service or addBook
      }
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
      });
    } finally {
      // Ensure loading state and progress are reset in all cases
      console.warn('[FileUpload] Upload process finished (success or failure). Resetting state.');
      setIsUploading(false);
      setUploadProgress(null); // Clear progress
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
    }
  };

  return (
    <>
      <Input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        className='hidden'
        accept='.pdf' // Specify accepted file types
        disabled={isUploading}
      />
      <Button
        onClick={handleButtonClick}
        variant={buttonVariant}
        size={buttonSize}
        disabled={isUploading}
        className='w-full'
      >
        {isUploading ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Uploading...
          </>
        ) : (
          <>
            <Upload className='mr-2 h-4 w-4' />
            Upload File
          </>
        )}
      </Button>
      {/* Display Progress Bar during upload */}
      {isUploading && uploadProgress !== null && (
        <Progress value={uploadProgress} className='w-full h-2 mt-2' />
      )}
    </>
  );
}
