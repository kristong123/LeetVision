import { Mode } from '../types';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const getModeSystemPrompt = (mode: Mode): string => {
  const prompts = {
    learn: `You are a patient and encouraging coding tutor. Your goal is to help the user learn by providing hints and guidance without giving away the complete solution. Ask thought-provoking questions, point out potential issues, and suggest approaches to consider. Never directly provide the answer unless explicitly asked. Focus on the learning process.`,
    explain: `You are a clear and concise code reviewer. Explain the provided code in an easy-to-understand manner. Break down complex logic, explain the purpose of different sections, identify algorithms or patterns used, and clarify any potentially confusing parts. Be thorough but accessible.`,
    improve: `You are a senior software engineer conducting a code review. Provide constructive suggestions for optimizing and improving the code. Focus on performance, readability, best practices, potential bugs, edge cases, and cleaner implementations. Be specific and actionable in your recommendations.`,
  };
  return prompts[mode];
};

interface GeminiRequestParams {
  code: string;
  mode: Mode;
  responseLength: number;
  userQuestion?: string;
  apiKey: string;
}

export const generateResponse = async ({
  code,
  mode,
  responseLength,
  userQuestion,
  apiKey,
}: GeminiRequestParams): Promise<string> => {
  const systemPrompt = getModeSystemPrompt(mode);
  const lengthInstruction = `Keep your response to approximately ${responseLength} sentence${responseLength > 1 ? 's' : ''}.`;

  let prompt = `${systemPrompt}\n\n${lengthInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\n`;

  if (userQuestion) {
    prompt += `User Question: ${userQuestion}`;
  } else {
    // Quick action prompts
    const quickActions = {
      learn: 'Provide a helpful hint for improving or fixing this code without giving away the complete solution.',
      explain: 'Explain what this code does and how it works.',
      improve: 'Suggest improvements and optimizations for this code.',
    };
    prompt += quickActions[mode];
  }

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response generated');
    }

    return generatedText;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

