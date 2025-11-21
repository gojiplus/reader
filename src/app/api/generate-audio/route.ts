import { Readable } from 'stream';
import * as admin from 'firebase-admin';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { NextRequest, NextResponse } from 'next/server';
import gTTS from 'node-gtts';
import z from 'zod';

// --- Firebase Admin SDK Initialization ---
// Initialize admin SDK directly without external dependencies
let adminApp: admin.app.App | null = null;
const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  // Try to initialize with the environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.warn(`[API Generate Audio] Initializing Firebase Admin SDK with: 
    Project ID: ${projectId}
    Storage Bucket: ${storageBucket}
    Has Client Email: ${Boolean(clientEmail)}`);

  // Check for required values
  if (!projectId || !storageBucket) {
    throw new Error('Missing required Firebase configuration');
  }

  let credential;
  // If we have client email and private key, use service account
  if (clientEmail && privateKey) {
    credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
    console.warn('[API Generate Audio] Using service account credentials');
  } else {
    // Try application default credentials
    credential = admin.credential.applicationDefault();
    console.warn('[API Generate Audio] Using application default credentials');
  }

  try {
    const app = admin.initializeApp({
      credential,
      projectId,
      storageBucket,
    });
    console.warn('[API Generate Audio] Firebase Admin SDK initialized successfully');
    return app;
  } catch (error) {
    console.error('[API Generate Audio] Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
};

// Helper function to convert a readable stream to a buffer
const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<Buffer>();

    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(err));
  });
};

const InputSchema = z.object({
  text: z.string().min(10, { message: 'Text must be at least 10 characters long.' }),
  bookId: z.string().min(1, { message: 'Book ID is required.' }),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.warn('[API Generate Audio] Received POST request.');

  try {
    // Initialize Firebase Admin SDK
    adminApp = initializeAdmin();

    // 1. Verify Authentication
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.warn('[API Generate Audio] Unauthorized: Missing authentication token.');
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token.' },
        { status: 401 }
      );
    }

    let decodedToken: DecodedIdToken;
    try {
      console.warn('[API Generate Audio] Verifying auth token...');
      decodedToken = await getAuth(adminApp).verifyIdToken(authToken);
      const userId = decodedToken.uid;
      console.warn(`[API Generate Audio] Auth token verified successfully for user: ${userId}`);

      // 2. Parse and Validate Input
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error('[API Generate Audio] Failed to parse request body:', parseError);
        return NextResponse.json(
          { error: 'Invalid request body: Must be valid JSON.' },
          { status: 400 }
        );
      }

      const validationResult = InputSchema.safeParse(body);
      if (!validationResult.success) {
        const issues = validationResult.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        console.error('[API Generate Audio] Invalid input:', issues);
        return NextResponse.json({ error: `Invalid input: ${issues}` }, { status: 400 });
      }

      const { text, bookId } = validationResult.data;
      console.warn(
        `[API Generate Audio] Processing request for bookId: ${bookId}, userId: ${userId}, text length: ${text.length}`
      );

      // 3. Generate Audio using node-gtts
      let audioStream: NodeJS.ReadableStream;
      try {
        console.warn(`[API Generate Audio] Generating TTS stream...`);
        const tts = new gTTS(text, { lang: 'en' });
        audioStream = tts.stream() as NodeJS.ReadableStream;
        console.warn(`[API Generate Audio] TTS stream created.`);
      } catch (ttsError: unknown) {
        const errorMessage = ttsError instanceof Error ? ttsError.message : 'Unknown TTS error';
        console.error('[API Generate Audio] Failed to create TTS stream:', ttsError);
        return NextResponse.json(
          { error: `Failed to generate audio stream: ${errorMessage}` },
          { status: 500 }
        );
      }

      // 4. Convert stream to buffer for easier handling
      console.warn('[API Generate Audio] Converting audio stream to buffer...');
      const audioBuffer = await streamToBuffer(audioStream as Readable);
      console.warn(`[API Generate Audio] Audio buffer created. Size: ${audioBuffer.length} bytes`);

      // 5. Upload buffer to Firebase Storage
      let storage;
      let bucket;
      try {
        storage = getStorage(adminApp);
        bucket = storage.bucket();
        console.warn(`[API Generate Audio] Accessed storage bucket: ${bucket.name}`);
      } catch (storageError: unknown) {
        const errorMessage =
          storageError instanceof Error ? storageError.message : 'Unknown storage error';
        console.error('[API Generate Audio] Failed to get storage bucket instance:', storageError);
        return NextResponse.json(
          { error: `Failed to access storage bucket: ${errorMessage}` },
          { status: 500 }
        );
      }

      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const audioFileName = `${bookId}_audio_${timestamp}.mp3`;
      const storagePath = `audiobooks_generated/${userId}/${audioFileName}`;
      const file = bucket.file(storagePath);

      console.warn(`[API Generate Audio] Uploading buffer to storage path: ${storagePath}`);

      try {
        // Upload the buffer with a single API call
        await file.save(audioBuffer, {
          metadata: {
            contentType: 'audio/mpeg',
          },
          public: true,
          validation: 'md5',
        });

        console.warn(`[API Generate Audio] Successfully uploaded ${storagePath}`);

        // 6. Get the public URL
        try {
          // Create the public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(storagePath)}`;
          console.warn(`[API Generate Audio] Public URL created: ${publicUrl}`);

          return NextResponse.json({ audioUrl: publicUrl }, { status: 200 });
        } catch (urlError: unknown) {
          const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown URL error';
          console.error('[API Generate Audio] Failed to create public URL:', urlError);
          return NextResponse.json(
            { error: `Failed to create public URL: ${errorMessage}` },
            { status: 500 }
          );
        }
      } catch (uploadError: unknown) {
        const errorMessage =
          uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
        console.error('[API Generate Audio] Failed to upload audio buffer:', uploadError);
        return NextResponse.json(
          { error: `Failed to upload audio buffer: ${errorMessage}` },
          { status: 500 }
        );
      }
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unknown auth error';
      console.error('[API Generate Audio] Auth verification failed:', authError);
      return NextResponse.json(
        { error: `Authentication failed: ${errorMessage}` },
        { status: 401 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API Generate Audio] Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
