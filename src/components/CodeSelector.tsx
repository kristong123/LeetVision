import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setCodeSections, setHoverModeActive, setSelectedCodeSection } from '../redux/slices/appSlice';
import browser from 'webextension-polyfill';
import { Eye, Check } from 'lucide-react';

const CodeSelector = () => {
  const dispatch = useAppDispatch();
  const hoverModeActive = useAppSelector((state) => state.app.hoverModeActive);
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const isLoading = useAppSelector((state) => state.app.isLoading);
  const [showCodePreview, setShowCodePreview] = useState(false);

  const toggleHoverMode = async () => {
    // Guard clause: prevent execution if already active
    if (hoverModeActive) {
      console.log('Hover mode already active, ignoring click');
      return;
    }
    
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      if (!hoverModeActive) {
        // First test if content script is working
        browser.tabs.sendMessage(tab.id!, {
          type: 'PING',
        }).then(() => {
          console.log('Content script is working, enabling hover mode...');
          // Content script is working, now enable hover mode
          return browser.tabs.sendMessage(tab.id!, {
            type: 'ENABLE_HOVER_MODE',
          });
        }).then(() => {
          console.log('Hover mode enabled successfully');
          dispatch(setHoverModeActive(true));
          // Close the popup so user can select code on the page
          window.close();
        }).catch(async (error) => {
          console.error('Error with content script:', error);
          
          // If content script doesn't exist, try to inject it
          if (error.message?.includes('Receiving end does not exist')) {
            try {
              console.log('Content script not found, attempting to inject...');
              await browser.scripting.executeScript({
                target: { tabId: tab.id! },
                files: ['assets/contentScript.ts-C0eL4d_4.js']
              });
              
              // Wait a moment for the script to load, then try again
              setTimeout(async () => {
                try {
                  // Test ping first
                  await browser.tabs.sendMessage(tab.id!, { type: 'PING' });
                  console.log('Content script injected successfully');
                  
                  // Now enable hover mode
                  await browser.tabs.sendMessage(tab.id!, {
                    type: 'ENABLE_HOVER_MODE',
                  });
                  console.log('Hover mode enabled successfully after injection');
                  dispatch(setHoverModeActive(true));
                  window.close();
                } catch (retryError) {
                  console.error('Still failed after injection:', retryError);
                  alert('Failed to enable hover mode. Please refresh the page and try again.');
                }
              }, 1000); // Increased timeout to allow script to fully load
            } catch (injectionError) {
              console.error('Failed to inject content script:', injectionError);
              alert('Failed to enable hover mode. Please refresh the page and try again.');
            }
          } else {
            alert('Failed to enable hover mode. Please refresh the page and try again.');
          }
        });
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
        dispatch(setSelectedCodeSection(codeSection.id));
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

  // Note: Selected code loading is now handled in App.tsx to prevent race conditions
  // This useEffect has been removed to consolidate state loading logic

  // Check hover mode status separately
  useEffect(() => {
    const checkHoverModeStatus = async () => {
      if (hoverModeActive) {
        try {
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (tab?.id) {
            try {
              const response: any = await browser.tabs.sendMessage(tab.id, {
                type: 'CHECK_HOVER_MODE',
              });
              
              if (response && !response.isActive) {
                dispatch(setHoverModeActive(false));
              }
            } catch (msgError) {
              // Message channel closed or content script not ready
              // Assume hover mode is off
              console.log('Could not check hover mode status, assuming off');
              dispatch(setHoverModeActive(false));
            }
          }
        } catch (error) {
          console.error('Error checking hover mode:', error);
          dispatch(setHoverModeActive(false));
        }
      }
    };

    checkHoverModeStatus();
  }, [hoverModeActive, dispatch]);

  return (
    <div className="px-4 py-3">
      <button
        onClick={toggleHoverMode}
        disabled={isLoading || hoverModeActive}
        className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          hoverModeActive
            ? 'bg-green-600 text-white'
            : 'bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-500'
        }`}
      >
        {hoverModeActive ? (
          <>
            <Check className="w-4 h-4 inline mr-1" />
            Hover Mode Active
          </>
        ) : (
          'Select Code on Page'
        )}
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
        <div className="mt-3">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-100 flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Code selected
            </p>
            <button
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
              title="Preview code"
            >
              <Eye className="w-5 h-5 text-green-700 dark:text-green-300" />
            </button>
          </div>
          
          {showCodePreview && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                {codeSections[0].content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeSelector;

