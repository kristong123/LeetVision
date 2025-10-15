import { useState } from 'react';
import { useAppSelector } from '../redux/hooks';
import { User } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  onAuthClick: () => void;
}

const Header = ({ onSettingsClick, onAuthClick }: HeaderProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.user);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        LeetVision
      </h1>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {isAuthenticated && user?.displayName ? (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
            <button
              onClick={() => {
                onAuthClick();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
            >
              {isAuthenticated ? 'Sign Out' : 'Sign In / Sign Up'}
            </button>
            <button
              onClick={() => {
                onSettingsClick();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
            >
              Settings
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

