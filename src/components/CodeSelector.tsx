import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSelectedCodeSection, setCodeSections } from '../redux/slices/appSlice';
import browser from 'webextension-polyfill';

const CodeSelector = () => {
  const dispatch = useAppDispatch();
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const selectedCodeSection = useAppSelector(
    (state) => state.app.selectedCodeSection
  );
  const isLoading = useAppSelector((state) => state.app.isLoading);

  const handleScan = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      const response: any = await browser.tabs.sendMessage(tab.id, {
        type: 'SCAN_CODE',
      });

      if (response.success && response.codeSections) {
        dispatch(setCodeSections(response.codeSections));
      } else {
        throw new Error('No code found on this page');
      }
    } catch (error) {
      console.error('Error scanning code:', error);
      alert('Failed to scan code. Make sure the page has loaded completely.');
    }
  };

  const handleSelectCode = (sectionId: string) => {
    dispatch(setSelectedCodeSection(sectionId));
  };

  return (
    <div className="px-4 py-3">
      <button
        onClick={handleScan}
        disabled={isLoading}
        className="w-full py-2 px-4 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
      >
        Scan Page for Code
      </button>

      {codeSections.length > 1 && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Code Section ({codeSections.length} found)
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {codeSections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => handleSelectCode(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCodeSection === section.id
                    ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Code Section {index + 1}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {section.content.substring(0, 50)}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {codeSections.length === 1 && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          ✓ Code detected and selected
        </div>
      )}
    </div>
  );
};

export default CodeSelector;

