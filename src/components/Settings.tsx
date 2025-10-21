import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { setPreferences } from '../redux/slices/userSlice';
import { savePreferences, getGeminiApiKey, saveGeminiApiKey } from '../utils/storage';
import { X, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

const Settings = ({ onClose }: SettingsProps) => {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.user.preferences);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    getGeminiApiKey().then((key) => {
      if (key) setApiKey(key);
    });
  }, []);

  const handleThemeToggle = () => {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    dispatch(setPreferences({ theme: newTheme }));
    savePreferences({ theme: newTheme });
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleApiKeySave = () => {
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      alert('API key saved successfully!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </span>
            <button
              onClick={handleThemeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Mode
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  dispatch(setPreferences({ displayMode: 'floating' }));
                  savePreferences({ displayMode: 'floating' });
                }}
                className={`px-3 py-1 rounded text-xs ${
                  preferences.displayMode === 'floating'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Floating
              </button>
              <button
                onClick={() => {
                  dispatch(setPreferences({ displayMode: 'sidebar' }));
                  savePreferences({ displayMode: 'sidebar' });
                }}
                className={`px-3 py-1 rounded text-xs ${
                  preferences.displayMode === 'sidebar'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Sidebar
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleApiKeySave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get your free API key from{' '}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

