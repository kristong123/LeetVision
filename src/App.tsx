import { useEffect, useState } from 'react';
import { useAppDispatch } from './redux/hooks';
import { setUser, setPreferences } from './redux/slices/userSlice';
import { setMode, setResponseLength } from './redux/slices/appSlice';
import { onAuthChange } from './services/firebase';
import { getPreferences } from './utils/storage';
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
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
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

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-white dark:bg-gray-900">
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

