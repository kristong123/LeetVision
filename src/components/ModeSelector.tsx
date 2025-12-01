import { Mode } from '../types';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setMode } from '../redux/slices/appSlice';
import { setPreferences } from '../redux/slices/userSlice';
import { savePreferences } from '../utils/storage';

const modes: { value: Mode; label: string; color: string }[] = [
  { value: 'learn', label: 'Learn', color: '#4ec9b0' },
  { value: 'explain', label: 'Explain', color: '#569cd6' },
  { value: 'improve', label: 'Improve', color: '#dcdcaa' },
];

const ModeSelector = () => {
  const dispatch = useAppDispatch();
  const currentMode = useAppSelector((state) => state.app.mode);
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const hasCode = codeSections.length > 0;

  return (
    <div className="px-4 py-2">
      <label className="block text-xs font-medium text-vscode-description mb-1 uppercase tracking-wider">
        Mode
      </label>
      <div className="flex gap-1 bg-vscode-widget p-1 rounded-lg">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => {
              if (hasCode) {
                dispatch(setMode(mode.value));
                dispatch(setPreferences({ selectedMode: mode.value }));
                savePreferences({ selectedMode: mode.value });
              }
            }}
            disabled={!hasCode}
            style={{
              color: currentMode === mode.value ? '#ffffff' : undefined,
              borderColor: currentMode === mode.value ? mode.color : 'transparent',
            }}
            className={`flex-1 py-1 px-2 text-xs font-medium transition-all duration-100 border-b-2 rounded-md ${currentMode === mode.value
              ? 'bg-vscode-list-hover'
              : 'text-vscode-text hover:bg-vscode-list-hover'
              } ${!hasCode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;

