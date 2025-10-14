import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setCodeSections, setHoverModeActive } from '../redux/slices/appSlice';
import browser from 'webextension-polyfill';

const CodeSelector = () => {
  const dispatch = useAppDispatch();
  const hoverModeActive = useAppSelector((state) => state.app.hoverModeActive);
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const isLoading = useAppSelector((state) => state.app.isLoading);

  const toggleHoverMode = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      if (!hoverModeActive) {
        // Enable hover mode
        await browser.tabs.sendMessage(tab.id, {
          type: 'ENABLE_HOVER_MODE',
        });
        dispatch(setHoverModeActive(true));
      } else {
        // Disable hover mode
        await browser.tabs.sendMessage(tab.id, {
          type: 'DISABLE_HOVER_MODE',
        });
        dispatch(setHoverModeActive(false));
      }
    } catch (error: any) {
      console.error('Error toggling hover mode:', error);
      
      if (error.message?.includes('Receiving end does not exist')) {
        alert('Please refresh the page first.\n\nThe extension needs to be initialized on the page.');
      } else {
        alert('Failed to activate hover mode. Make sure the page has loaded completely and try refreshing it.');
      }
    }
  };

  // Listen for CODE_SELECTED and HOVER_MODE_DISABLED messages from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'CODE_SELECTED') {
        console.log('Code selected:', message);
        // Create a code section from the selected code
        const codeSection = {
          id: `hover-${Date.now()}`,
          content: message.code,
          language: message.language,
        };
        dispatch(setCodeSections([codeSection]));
        // Disable hover mode immediately when code is selected
        dispatch(setHoverModeActive(false));
      }
      
      if (message.type === 'HOVER_MODE_DISABLED') {
        // Update state when hover mode is disabled
        dispatch(setHoverModeActive(false));
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [dispatch]);

  // Check hover mode status when popup opens
  useEffect(() => {
    const checkHoverModeStatus = async () => {
      // If hover mode is active in state, verify with content script
      if (hoverModeActive) {
        try {
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (tab?.id) {
            // Query content script for actual hover mode status
            const response: any = await browser.tabs.sendMessage(tab.id, {
              type: 'CHECK_HOVER_MODE',
            });
            
            if (response && !response.isActive) {
              // Content script says hover mode is off, update state
              dispatch(setHoverModeActive(false));
            }
          }
        } catch (error) {
          // Content script not available, assume hover mode is off
          dispatch(setHoverModeActive(false));
        }
      }
    };

    checkHoverModeStatus();
  }, [hoverModeActive, dispatch]); // Run when hoverModeActive changes

  return (
    <div className="px-4 py-3">
      <button
        onClick={toggleHoverMode}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          hoverModeActive
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-500'
        }`}
      >
        {hoverModeActive ? '✓ Hover Mode Active' : 'Select Code on Page'}
      </button>

      {hoverModeActive && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Hover over code</strong> on the page and <strong>click</strong> to select it.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Press ESC to cancel
          </p>
        </div>
      )}

      {codeSections.length > 0 && !hoverModeActive && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-900 dark:text-green-100">
            ✓ Code selected ({codeSections[0].content.length} characters)
          </p>
          {codeSections[0].language && (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Language: {codeSections[0].language}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeSelector;

