import { Mode } from '../types';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setMode } from '../redux/slices/appSlice';

const modes: { value: Mode; label: string; color: string }[] = [
  { value: 'learn', label: 'Learn Mode', color: 'bg-learn' },
  { value: 'explain', label: 'Explain Mode', color: 'bg-explain' },
  { value: 'improve', label: 'Improve Mode', color: 'bg-improve' },
];

const ModeSelector = () => {
  const dispatch = useAppDispatch();
  const currentMode = useAppSelector((state) => state.app.mode);

  return (
    <div className="px-4 py-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Mode
      </label>
      <div className="flex gap-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => dispatch(setMode(mode.value))}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              currentMode === mode.value
                ? `${mode.color} text-white shadow-md`
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;

