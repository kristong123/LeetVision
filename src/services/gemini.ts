import { Mode } from '../types';
import { getIdToken } from './cognito';

// API Gateway endpoint
const API_GATEWAY_ENDPOINT = import.meta.env.VITE_API_GATEWAY_URL || 
  'https://oqer7bx7mj.execute-api.us-east-2.amazonaws.com/dev/response';

interface GeminiRequestParams {
  code: string;
  mode: Mode;
  responseLength: number;
  userQuestion?: string;
}

/**
 * Generate AI response using AWS API Gateway + Lambda backend
 * This keeps API keys secure and implements rate limiting
 */
export const generateResponse = async ({
  code,
  mode,
  responseLength,
  userQuestion,
}: GeminiRequestParams): Promise<string> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is signed in
    const idToken = await getIdToken();
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // Call API Gateway endpoint
    const response = await fetch(API_GATEWAY_ENDPOINT, {
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

