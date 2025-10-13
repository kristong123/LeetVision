import { Mode } from '../types';
import { auth } from './firebase';

// Firebase Function endpoint - update this after deploying
const FIREBASE_FUNCTION_ENDPOINT = import.meta.env.VITE_FIREBASE_FUNCTION_URL || 
  `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/generateResponse`;

interface GeminiRequestParams {
  code: string;
  mode: Mode;
  responseLength: number;
  userQuestion?: string;
}

/**
 * Generate AI response using Firebase Function backend
 * This keeps API keys secure and implements rate limiting
 */
export const generateResponse = async ({
  code,
  mode,
  responseLength,
  userQuestion,
}: GeminiRequestParams): Promise<string> => {
  try {
    // Get the current user's auth token (optional)
    const user = auth.currentUser;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is signed in
    if (user) {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // Call Firebase Function
    const response = await fetch(FIREBASE_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code,
        mode,
        responseLength,
        userQuestion,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate response');
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('No response generated');
    }

    return data.response;
  } catch (error) {
    console.error('AI Response Error:', error);
    throw error;
  }
};

