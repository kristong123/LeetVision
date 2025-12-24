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
    <header className="flex items-center justify-between px-4 py-2 border-b border-vscode-border bg-vscode-activity sticky top-0 z-10">
      <h1 className="text-sm font-bold text-vscode-text uppercase tracking-wide">
        LeetVision
      </h1>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-7 h-7 rounded-lg hover:bg-vscode-list-hover flex items-center justify-center transition-colors duration-100"
        >
          {isAuthenticated && user ? (
            <span className="text-xs font-medium text-vscode-text">
              {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-4 h-4 text-vscode-text" />
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-1 w-48 bg-vscode-widget rounded-lg shadow-xl border border-vscode-border z-10 animate-fade-in">
            <button
              onClick={() => {
                onAuthClick();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-vscode-text hover:bg-vscode-list-hover transition-colors rounded-t-lg"
            >
              {isAuthenticated ? 'Sign Out' : 'Sign In / Sign Up'}
            </button>
            <button
              onClick={() => {
                onSettingsClick();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-vscode-text hover:bg-vscode-list-hover transition-colors rounded-b-lg"
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

