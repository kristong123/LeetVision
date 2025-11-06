import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client (reused across invocations for performance)
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const FREE_TIER_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || "leetvision-rate-limits";

/**
 * Lambda handler for generating AI responses
 * Handles POST requests from API Gateway
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify({}),
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Get the auth token from the request header (optional)
    const authToken = event.headers?.Authorization?.split("Bearer ")[1] || 
                     event.headers?.authorization?.split("Bearer ")[1];
    let userId = "anonymous"; // Default for unauthenticated users

    // TODO: If auth token is provided, verify it with Cognito
    // For now, we'll use anonymous or extract userId from token
    if (authToken) {
      // In the future, verify Cognito JWT token here
      // const decodedToken = await verifyCognitoToken(authToken);
      // userId = decodedToken.sub;
      userId = "authenticated"; // Placeholder
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(userId);
    if (!rateLimitOk) {
      return {
        statusCode: 429,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Rate limit exceeded. Please wait a moment before trying again. Sign in for higher limits!",
        }),
      };
    }

    // Get the Gemini API key from environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Parse request body (API Gateway passes it as a string)
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { code, mode, responseLength, userQuestion } = body;

    if (!code || !mode || !responseLength) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
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
      return {
        statusCode: geminiResponse.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: errorData.error?.message || "Failed to generate response",
        }),
      };
    }

    const data = await geminiResponse.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No response generated" }),
      };
    }

    // Return the response
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ response: generatedText }),
    };
  } catch (error) {
    console.error("Error in generateResponse function:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

/**
 * Helper function to get mode-specific system prompts
 */
function getModeSystemPrompt(mode) {
  const prompts = {
    learn: `You are a patient and encouraging coding tutor. Your goal is to help the user learn by providing hints and guidance without giving away the complete solution. Ask thought-provoking questions, point out potential issues, and suggest approaches to consider. Never directly provide the answer unless explicitly asked. Focus on the learning process.`,
    explain: `You are a clear and concise code reviewer. Explain the provided code in an easy-to-understand manner. Break down complex logic, explain the purpose of different sections, identify algorithms or patterns used, and clarify any potentially confusing parts. Be thorough but accessible.`,
    improve: `You are a senior software engineer conducting a code review. Provide constructive suggestions for optimizing and improving the code. Focus on performance, readability, best practices, potential bugs, edge cases, and cleaner implementations. Be specific and actionable in your recommendations.`,
  };
  return prompts[mode];
}

/**
 * Check rate limiting for a user using DynamoDB
 * Replaces Firestore with DynamoDB
 */
async function checkRateLimit(userId) {
  const now = Date.now();
  const ttl = Math.floor(now / 1000) + 3600; // TTL: 1 hour from now (in seconds)

  try {
    // Get current rate limit record
    const getResult = await docClient.send(
      new GetCommand({
        TableName: RATE_LIMIT_TABLE,
        Key: { userId },
      })
    );

    if (!getResult.Item) {
      // First request from this user - create new record
      await docClient.send(
        new PutCommand({
          TableName: RATE_LIMIT_TABLE,
          Item: {
            userId,
            count: 1,
            windowStart: now,
            ttl, // Auto-delete after 1 hour
          },
        })
      );
      return true;
    }

    const { windowStart, count } = getResult.Item;

    // Check if we're still in the same time window
    if (now - windowStart < RATE_LIMIT_WINDOW) {
      if (count >= FREE_TIER_REQUESTS_PER_MINUTE) {
        // Rate limit exceeded
        return false;
      }
      // Increment count
      await docClient.send(
        new UpdateCommand({
          TableName: RATE_LIMIT_TABLE,
          Key: { userId },
          UpdateExpression: "SET #count = #count + :inc",
          ExpressionAttributeNames: {
            "#count": "count",
          },
          ExpressionAttributeValues: {
            ":inc": 1,
          },
        })
      );
    } else {
      // New time window, reset counter
      await docClient.send(
        new PutCommand({
          TableName: RATE_LIMIT_TABLE,
          Item: {
            userId,
            count: 1,
            windowStart: now,
            ttl,
          },
        })
      );
    }

    return true;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request but log it
    return true;
  }
}

