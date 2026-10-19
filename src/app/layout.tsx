import { GeistSans } from 'geist/font/sans'; // Correct import path for GeistSans
import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

export const metadata: Metadata = {
  title: 'Reader',
  description: 'Read and listen to PDFs with summaries, quizzes, and explanations.',
};

// Define a type for the props if needed, although Next.js handles it automatically
// interface RootLayoutProps {
//   children: React.ReactNode;
// }

// Apply the font to the body tag or a wrapping div
const bodyClassName = `${GeistSans.className} antialiased`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning to ignore browser extension attribute mismatches
    // This needs to be on the <html> tag
    <html lang='en' suppressHydrationWarning>
      <body className={bodyClassName}>
        <PerformanceMonitor />
        <ErrorBoundary>
          <AuthProvider>
            {' '}
            {/* Wrap children with AuthProvider */}
            {children}
            <Toaster />{' '}
            {/* Ensure Toaster is within AuthProvider if it needs auth context, otherwise it can be outside */}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
