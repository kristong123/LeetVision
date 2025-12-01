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

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as 'light' | 'dark';
    dispatch(setPreferences({ theme: newTheme }));
    savePreferences({ theme: newTheme });

    // Apply theme to document immediately (also handled by useEffect in App.tsx)
    // Force remove dark class first, then add if needed
    document.documentElement.classList.remove('dark');
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  };

  const handleApiKeySave = () => {
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      alert('API key saved successfully!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-vscode-bg rounded-lg w-full max-w-md mx-4 shadow-2xl border border-vscode-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-vscode-border bg-vscode-activity rounded-t-lg">
          <h2 className="text-sm font-bold text-vscode-text uppercase tracking-wide">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-vscode-text hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Theme Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-vscode-text">
              Theme
            </span>
            <select
              value={preferences.theme}
              onChange={handleThemeChange}
              className="px-2 py-1 border border-vscode-border bg-vscode-input text-vscode-text text-sm focus:outline-none focus:border-vscode-blue rounded-lg"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-vscode-text">
              Display Mode
            </span>
            <div className="flex gap-1 bg-vscode-input p-0.5 rounded-lg">
              <button
                onClick={() => {
                  dispatch(setPreferences({ displayMode: 'floating' }));
                  savePreferences({ displayMode: 'floating' });
                }}
                className={`px-3 py-1 text-xs transition-colors rounded-md ${preferences.displayMode === 'floating'
                  ? 'bg-vscode-button text-white'
                  : 'text-vscode-text hover:bg-vscode-list-hover'
                  }`}
              >
                Floating
              </button>
              <button
                onClick={() => {
                  dispatch(setPreferences({ displayMode: 'sidebar' }));
                  savePreferences({ displayMode: 'sidebar' });
                }}
                className={`px-3 py-1 text-xs transition-colors rounded-md ${preferences.displayMode === 'sidebar'
                  ? 'bg-vscode-button text-white'
                  : 'text-vscode-text hover:bg-vscode-list-hover'
                  }`}
              >
                Sidebar
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="block text-sm text-vscode-text">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-2 py-1.5 border border-vscode-border bg-vscode-input text-vscode-text text-sm focus:outline-none focus:border-vscode-blue placeholder-vscode-description font-mono rounded-lg"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1.5 text-vscode-description hover:text-vscode-text"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleApiKeySave}
                className="px-3 py-1.5 bg-vscode-button text-white hover:bg-vscode-button-hover text-sm transition-colors rounded-lg"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-vscode-description">
              Get your free API key from{' '}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vscode-blue hover:underline"
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

