import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { addMessage, setLoading, setError } from '../redux/slices/appSlice';
import { generateResponse } from '../services/gemini';
import browser from 'webextension-polyfill';
import { hashCode } from '../utils/codeDetection';

const InputSection = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.app.mode);
  const responseLength = useAppSelector((state) => state.app.responseLength);
  const selectedCodeSection = useAppSelector(
    (state) => state.app.selectedCodeSection
  );
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const lastCodeHash = useAppSelector((state) => state.app.lastCodeHash);
  const isLoading = useAppSelector((state) => state.app.isLoading);

  const [input, setInput] = useState('');

  const quickActionButtons = {
    learn: 'Hint',
    explain: 'Explain',
    improve: 'Suggestions',
  };

  const handleSubmit = async (customQuestion?: string) => {
    if (isLoading) return;

    // Check if we need to scan/rescan
    const selectedSection = codeSections.find(
      (section) => section.id === selectedCodeSection
    );

    if (!selectedSection) {
      dispatch(setError('Please scan the page for code first'));
      return;
    }

    // Check if code has changed
    const currentHash = hashCode(selectedSection.content);
    const needsRescan = lastCodeHash !== currentHash;

    if (needsRescan) {
      // Rescan the page
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab.id) {
          await browser.tabs.sendMessage(tab.id, { type: 'SCAN_CODE' });
        }
      } catch (error) {
        console.error('Error rescanning:', error);
      }
    }

    const question = customQuestion || input;

    if (!customQuestion && !input.trim()) {
      return;
    }

    // Add user message
    if (question) {
      dispatch(
        addMessage({
          id: Date.now().toString(),
          role: 'user',
          content: question,
          timestamp: Date.now(),
        })
      );
    }

    setInput('');
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const response = await generateResponse({
        code: selectedSection.content,
        mode,
        responseLength,
        userQuestion: question || undefined,
      });

      dispatch(
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate response';
      dispatch(setError(errorMessage));
      dispatch(
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask anything..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
      <button
        onClick={() => handleSubmit()}
        disabled={isLoading}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === 'learn'
            ? 'bg-learn hover:bg-learn-dark'
            : mode === 'explain'
            ? 'bg-explain hover:bg-explain-dark'
            : 'bg-improve hover:bg-improve-dark'
        } text-white`}
      >
        {quickActionButtons[mode]}
      </button>
    </div>
  );
};

export default InputSection;

