'use client';

import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2, Terminal } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useHydrated } from '@/hooks/useHydrated';
import { auth, firebaseConfigValid, initError } from '@/lib/firebase/clientApp';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(true);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const isClient = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const configurationError =
    !firebaseConfigValid || !auth
      ? initError || 'Firebase authentication is not configured.'
      : null;
  const authError = configurationError || listenerError;
  const loading = !authError && waitingForAuth;

  useEffect(() => {
    if (!isClient || !firebaseConfigValid || !auth) return;
    return onAuthStateChanged(
      auth,
      currentUser => {
        setUser(currentUser);
        setListenerError(null);
        setWaitingForAuth(false);
      },
      error => {
        setListenerError(`Auth listener error: ${error.message}`);
        setUser(null);
        setWaitingForAuth(false);
      }
    );
  }, [isClient]);

  useEffect(() => {
    if (!isClient || loading || authError) return;
    if (user && pathname === '/auth') router.push('/');
    else if (!user && pathname !== '/auth') router.push('/auth');
  }, [isClient, loading, authError, user, pathname, router]);

  if (!isClient) return null;

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-4 text-center'>
        <Loader2 className='h-16 w-16 animate-spin text-primary mb-4' />
        <p className='text-muted-foreground'>Initializing authentication...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className='flex items-center justify-center min-h-screen p-4'>
        <Alert variant='destructive' className='max-w-lg'>
          <Terminal className='h-4 w-4' />
          <AlertTitle>Authentication Unavailable</AlertTitle>
          <AlertDescription>
            Could not initialize or monitor the authentication service. Please ensure your Firebase
            configuration in <code>.env.local</code> (or Firebase Studio environment) is correct and
            try refreshing the page.
            <br />
            <span className='text-xs mt-2 block break-words'>Details: {authError}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
