import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { addMessage, setLoading, setError } from '../redux/slices/appSlice';
import { generateResponse } from '../services/gemini';
import { Send } from 'lucide-react';
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

  const hasCodeSelected = codeSections.length > 0 && selectedCodeSection;

  const quickActionButtons = {
    learn: 'Hint',
    explain: 'Explain',
    improve: 'Suggestions',
  };

  const handleSubmit = async (customQuestion?: string) => {
    if (isLoading || !hasCodeSelected) return;

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

    const question = customQuestion !== undefined ? customQuestion : input;

    if (customQuestion === undefined && !input.trim()) {
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

      // Check if it's a quota error
      const isQuotaError = errorMessage.startsWith('QUOTA_EXCEEDED:');
      const displayMessage = isQuotaError
        ? errorMessage.replace('QUOTA_EXCEEDED: ', '')
        : `Error: ${errorMessage}`;

      dispatch(setError(errorMessage));
      dispatch(
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: displayMessage + (isQuotaError ? '\n\n💡 Click the settings icon (top right) to add your own Gemini API key and continue chatting.' : ''),
          timestamp: Date.now(),
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="px-4 py-3 border-t border-vscode-border bg-vscode-activity">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={!hasCodeSelected ? "Select code first..." : "Ask anything..."}
          disabled={!hasCodeSelected || isLoading}
          className="flex-1 px-3 py-1.5 border border-vscode-input bg-vscode-input text-vscode-text placeholder-vscode-description focus:outline-none focus:border-vscode-blue focus:ring-1 focus:ring-vscode-blue disabled:opacity-50 text-sm font-mono rounded-lg"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!input.trim() || !hasCodeSelected || isLoading}
          className="px-3 py-1.5 bg-vscode-button text-white hover:bg-vscode-button-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium rounded-lg"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </div>
      <button
        onClick={() => handleSubmit('')}
        disabled={!hasCodeSelected || isLoading}
        style={{
          backgroundColor:
            mode === 'learn'
              ? '#4ec9b0' // VS Code Class
              : mode === 'explain'
                ? '#569cd6' // VS Code Keyword
                : '#ea580c', // Orange
          color: '#1e1e1e' // Dark text for contrast on these bright syntax colors
        }}
        className="w-full py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 rounded-lg"
      >
        {quickActionButtons[mode]}
      </button>
    </div>
  );
};

export default InputSection;

