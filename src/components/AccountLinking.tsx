import { useState } from 'react';
import { linkAccounts, signInWithEmail } from '../services/cognito';
import browser from 'webextension-polyfill';
import { X } from 'lucide-react';

interface AccountLinkingProps {
  email: string;
  googleUserId: string;
  onLink: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

interface AccountLinkingData {
  email: string;
  googleUserId: string;
  message: string;
}

/**
 * AccountLinking Component
 * 
 * Displays a modal prompting the user to link their Google account
 * with an existing email/password account (or vice versa)
 */
const AccountLinking = ({ email, googleUserId, onLink, onCancel, onError }: AccountLinkingProps) => {
  // googleUserId is passed but not used - parent passes it for future use
  void googleUserId;
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLink = async () => {
    if (!password) {
      onError('Please enter your password to link accounts');
      return;
    }

    setLoading(true);
    try {
      // Get the stored Google user info
      const stored = await browser.storage.local.get(['cognito_user', 'pending_account_link']) as {
        cognito_user?: { uid: string; idToken: string; accessToken?: string };
        pending_account_link?: AccountLinkingData;
      };
      const googleUser = stored.cognito_user;
      // const pendingLink = stored.pending_account_link as AccountLinkingData | undefined; // Unused

      if (!googleUser || !googleUser.idToken || !googleUser.uid) {
        throw new Error('Google account session not found. Please sign in with Google again.');
      }

      // First, authenticate with email/password to get the email account user ID
      // This must succeed - the email account must already exist for linking to work
      let emailUser;
      try {
        emailUser = await signInWithEmail(email, password);
      } catch (err: unknown) {
        const error = err as Error;
        // Handle specific authentication errors
        if (error.message?.includes('UserNotFoundException')) {
          throw new Error(
            'Email account does not exist. ' +
            'Please sign up with email/password first, then you can link your Google account.'
          );
        }
        if (error.message?.includes('NotAuthorizedException') || error.message?.includes('Invalid')) {
          throw new Error('Invalid password. Please enter the correct password for your email account.');
        }
        if (error.message?.includes('ACCOUNT_LINKING_NEEDED')) {
          // This shouldn't happen here, but handle it gracefully
          throw new Error('Account linking is already in progress. Please try again.');
        }
        throw new Error(error.message || 'Failed to authenticate with email account');
      }

      // Verify emails match before linking
      if (emailUser.email !== email) {
        throw new Error(
          `Email mismatch: The email account uses ${emailUser.email || 'a different email'}. ` +
          'Accounts can only be linked if they use the same email address.'
        );
      }

      // Now we have both user IDs - link them
      try {
        await linkAccounts(
          googleUser.uid, // Source: Google account
          emailUser.uid,   // Destination: Email account
          'Google',
          googleUser.idToken
        );
      } catch (linkErr: unknown) {
        const error = linkErr as Error;
        // Provide specific error messages for linking failures
        if (error.message?.includes('already linked') || error.message?.includes('AliasExistsException')) {
          throw new Error('These accounts are already linked. You can sign in with either method.');
        }
        if (error.message?.includes('emails do not match')) {
          throw new Error('Cannot link accounts: The email addresses do not match.');
        }
        if (error.message?.includes('not found')) {
          throw new Error('One of the accounts was not found. Please ensure both accounts exist.');
        }
        throw new Error(error.message || 'Failed to link accounts. Please try again.');
      }

      // Clear pending link info
      await browser.storage.local.remove('pending_account_link');

      // Update stored user to use the email account (which now has Google linked)
      await browser.storage.local.set({
        cognito_user: emailUser,
        cognito_id_token: emailUser.idToken,
        cognito_access_token: emailUser.accessToken,
      });

      onLink();
    } catch (err: unknown) {
      // Provide user-friendly error messages
      const errorMessage = (err as Error).message || 'Failed to link accounts';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Link Your Accounts
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            We found a Google account and an email account both using <strong>{email}</strong>.
            Would you like to link them so you can sign in with either method?
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>What this means:</strong> After linking, you'll be able to sign in using
              either your email/password or your Google account. Both methods will access the same account.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter your email account password to confirm:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={loading || !password}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Linking...' : 'Link Accounts'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountLinking;

