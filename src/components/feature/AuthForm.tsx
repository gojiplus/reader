// src/components/feature/AuthForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Use App Router's navigation
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, ErrorCategory } from '@/lib/error-handler';
import { auth, initError as firebaseInitError } from '@/lib/firebase/clientApp'; // Import auth and initError
import { createComponentLogger } from '@/lib/logger';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormData = z.infer<typeof formSchema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const logger = createComponentLogger('AuthForm');
  const { handleError } = useErrorHandler('AuthForm');
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit: SubmitHandler<FormData> = async data => {
    setLoading(true);
    const { email, password } = data;

    // Ensure auth is initialized (not null) before attempting login/signup
    if (!auth) {
      // Use the specific initialization error message if available
      const description = firebaseInitError
        ? `Authentication service unavailable due to initialization error: ${firebaseInitError}`
        : 'Authentication service is unavailable. Please check configuration or contact support.';

      logger.error(
        `Firebase Auth is not initialized (null). ${firebaseInitError || 'Check Firebase configuration in .env.local and src/lib/firebase/clientApp.ts for critical errors.'}`
      );
      toast({
        variant: 'destructive',
        title: 'Initialization Error',
        description,
      });
      setLoading(false);
      return;
    }

    try {
      logger.debug(`Attempting ${isLogin ? 'login' : 'signup'} with email: ${email}`);
      logger.debug(`Firebase Auth instance: ${auth ? 'initialized' : 'null'}`);
      logger.debug(`Auth domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`);

      if (isLogin) {
        logger.debug('Calling signInWithEmailAndPassword...');
        await signInWithEmailAndPassword(auth, email, password);
        logger.info('Login successful');
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/'); // Redirect to home page after login
      } else {
        logger.debug('Calling createUserWithEmailAndPassword...');
        await createUserWithEmailAndPassword(auth, email, password);
        logger.info('Signup successful');
        toast({ title: 'Signup Successful', description: 'Welcome!' });
        router.push('/'); // Redirect to home page after signup
      }
      reset(); // Clear form
    } catch (error) {
      const errorInfo = handleError(error, {
        category: ErrorCategory.AUTHENTICATION,
        action: isLogin ? 'login' : 'signup',
        email,
      });

      toast({
        variant: 'destructive',
        title: errorInfo.title,
        description: errorInfo.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset(); // Clear form on mode toggle
  };

  return (
    <Card className='w-full max-w-md shadow-lg'>
      <CardHeader>
        <CardTitle>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {isLogin
            ? 'Enter your credentials to access your account.'
            : 'Create an account to get started.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              placeholder='you@example.com'
              {...register('email')}
              disabled={loading}
            />
            {errors.email && <p className='text-sm text-destructive'>{errors.email.message}</p>}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              type='password'
              placeholder='••••••••'
              {...register('password')}
              disabled={loading}
            />
            {errors.password && (
              <p className='text-sm text-destructive'>{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4'>
          <Button type='submit' className='w-full' disabled={loading}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
          <Button type='button' variant='link' onClick={toggleMode} disabled={loading}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
