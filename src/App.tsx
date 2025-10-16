import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './redux/hooks';
import { setUser, setPreferences } from './redux/slices/userSlice';
import { setMode, setResponseLength, restoreAppState } from './redux/slices/appSlice';
import { onAuthChange } from './services/firebase';
import { getPreferences } from './utils/storage';
import { restoreState, saveState } from './utils/statePersistence';
import browser from 'webextension-polyfill';
import Header from './components/Header';
import ModeSelector from './components/ModeSelector';
import ResponseLengthSlider from './components/ResponseLengthSlider';
import ChatBox from './components/ChatBox';
import InputSection from './components/InputSection';
import CodeSelector from './components/CodeSelector';
import Settings from './components/Settings';
import Auth from './components/Auth';

function App() {
  const dispatch = useAppDispatch();
  const appState = useAppSelector((state) => state.app);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Always cancel hover mode when popup opens
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        browser.tabs.sendMessage(tab.id, { type: 'DISABLE_HOVER_MODE' }).catch(() => {
          // Content script might not be ready, ignore
        });
      }
    });
    
    // Load selected code first, then restore other state
    browser.storage.local.get('leetvision_selected_code').then((result) => {
      const selectedCode: any = result.leetvision_selected_code;
      
      return restoreState().then((savedState) => {
        if (savedState) {
          // If we have selected code in storage, merge it into the restored state
          if (selectedCode && selectedCode.code) {
            browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
              const isSamePage = tab?.url && selectedCode.source === tab.url;
              
              if (isSamePage) {
                // Merge selected code into restored state
                const codeSection = {
                  id: `hover-${Date.now()}`,
                  content: selectedCode.code,
                  language: selectedCode.language || 'plaintext',
                };
                
                savedState.codeSections = [codeSection];
                savedState.selectedCodeSection = codeSection.id;
                savedState.hoverModeActive = false;
              }
              
              dispatch(restoreAppState(savedState));
            });
          } else {
            dispatch(restoreAppState(savedState));
          }
        }
      });
    });

    // Load preferences
    getPreferences().then((prefs) => {
      dispatch(setPreferences(prefs));
      dispatch(setMode(prefs.selectedMode));
      dispatch(setResponseLength(prefs.responseLength));
      
      // Apply theme
      if (prefs.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    // Listen for auth changes
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        dispatch(
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          })
        );
      } else {
        dispatch(setUser(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  // Save state whenever appState changes
  useEffect(() => {
    // Don't save initial state immediately
    const timeout = setTimeout(() => {
      saveState(appState);
    }, 300); // Debounce saves

    return () => clearTimeout(timeout);
  }, [appState]);

  return (
    <div className="w-[400px] h-fit p-3 flex flex-col bg-white dark:bg-gray-900" style={{ overscrollBehavior: 'none' }}>
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onAuthClick={() => setShowAuth(true)}
      />
      <ModeSelector />
      <ResponseLengthSlider />
      <CodeSelector />
      <ChatBox />
      <InputSection />

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default App;

