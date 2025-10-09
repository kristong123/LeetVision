import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setResponseLength } from '../redux/slices/appSlice';

const ResponseLengthSlider = () => {
  const dispatch = useAppDispatch();
  const responseLength = useAppSelector((state) => state.app.responseLength);

  return (
    <div className="px-4 py-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Response Length
      </label>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
          1 sentence
        </span>
        <input
          type="range"
          min="1"
          max="5"
          value={responseLength}
          onChange={(e) => dispatch(setResponseLength(Number(e.target.value)))}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
          Paragraph (4-5)
        </span>
      </div>
      <div className="text-center mt-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {responseLength} sentence{responseLength > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default ResponseLengthSlider;

