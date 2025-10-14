import {onRequest} from "firebase-functions/v2/https";
import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface GeminiRequestBody {
  code: string;
  mode: "learn" | "explain" | "improve";
  responseLength: number;
  userQuestion?: string;
}

// Rate limiting configuration (stored in Firestore)
const RATE_LIMIT_WINDOW = 60000; // 1 minute  
const FREE_TIER_REQUESTS_PER_MINUTE = 10;

/**
 * Cloud Function to proxy Gemini API requests
 * This keeps the API key secure on the server and implements rate limiting
 */
export const generateResponse = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      // Get the auth token from the request header (optional)
      const authToken = req.headers.authorization?.split("Bearer ")[1];
      let userId = "anonymous"; // Default for unauthenticated users

      // If auth token is provided, verify it
      if (authToken) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(authToken);
          userId = decodedToken.uid;
        } catch (error) {
          console.error("Token verification failed:", error);
          // Continue as anonymous user
        }
      }

      // Check rate limiting (works for both authenticated and anonymous)
      const rateLimitOk = await checkRateLimit(userId);
      if (!rateLimitOk) {
        res.status(429).json({
          error: "Rate limit exceeded. Please wait a moment before trying again. Sign in for higher limits!",
        });
        return;
      }

      // Get the Gemini API key from environment config
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("GEMINI_API_KEY not configured");
        res.status(500).json({error: "Server configuration error"});
        return;
      }

      // Parse and validate request body
      const {code, mode, responseLength, userQuestion} = req.body as GeminiRequestBody;

      if (!code || !mode || !responseLength) {
        res.status(400).json({error: "Missing required fields"});
        return;
      }

      // Build the prompt
      const systemPrompt = getModeSystemPrompt(mode);
      const lengthInstruction = `Keep your response to approximately ${responseLength} sentence${responseLength > 1 ? "s" : ""}.`;

      let prompt = `${systemPrompt}\n\n${lengthInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\n`;

      if (userQuestion) {
        prompt += `User Question: ${userQuestion}`;
      } else {
        const quickActions = {
          learn: "Provide a helpful hint for improving or fixing this code without giving away the complete solution.",
          explain: "Explain what this code does and how it works.",
          improve: "Suggest improvements and optimizations for this code.",
        };
        prompt += quickActions[mode];
      }

      // Call Gemini API
      const geminiResponse = await fetch(`${GEMINI_API_ENDPOINT}?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error("Gemini API error:", errorData);
        res.status(geminiResponse.status).json({
          error: errorData.error?.message || "Failed to generate response",
        });
        return;
      }

      const data = await geminiResponse.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        res.status(500).json({error: "No response generated"});
        return;
      }

      // Return the response
      res.status(200).json({response: generatedText});
    } catch (error) {
      console.error("Error in generateResponse function:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);

/**
 * Helper function to get mode-specific system prompts
 */
function getModeSystemPrompt(mode: "learn" | "explain" | "improve"): string {
  const prompts = {
    learn: `You are a patient and encouraging coding tutor. Your goal is to help the user learn by providing hints and guidance without giving away the complete solution. Ask thought-provoking questions, point out potential issues, and suggest approaches to consider. Never directly provide the answer unless explicitly asked. Focus on the learning process.`,
    explain: `You are a clear and concise code reviewer. Explain the provided code in an easy-to-understand manner. Break down complex logic, explain the purpose of different sections, identify algorithms or patterns used, and clarify any potentially confusing parts. Be thorough but accessible.`,
    improve: `You are a senior software engineer conducting a code review. Provide constructive suggestions for optimizing and improving the code. Focus on performance, readability, best practices, potential bugs, edge cases, and cleaner implementations. Be specific and actionable in your recommendations.`,
  };
  return prompts[mode];
}

/**
 * Check rate limiting for a user
 * Uses Firestore to track request counts per user
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const db = admin.firestore();
  const rateLimitRef = db.collection("rateLimits").doc(userId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const rateLimitDoc = await transaction.get(rateLimitRef);
      const now = Date.now();

      if (!rateLimitDoc.exists) {
        // First request from this user
        transaction.set(rateLimitRef, {
          count: 1,
          windowStart: now,
        });
        return true;
      }

      const data = rateLimitDoc.data();
      const windowStart = data?.windowStart || 0;
      const count = data?.count || 0;

      // Check if we're still in the same time window
      if (now - windowStart < RATE_LIMIT_WINDOW) {
        if (count >= FREE_TIER_REQUESTS_PER_MINUTE) {
          // Rate limit exceeded
          return false;
        }
        // Increment count
        transaction.update(rateLimitRef, {
          count: count + 1,
        });
      } else {
        // New time window, reset counter
        transaction.set(rateLimitRef, {
          count: 1,
          windowStart: now,
        });
      }

      return true;
    });

    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request but log it
    return true;
  }
}

