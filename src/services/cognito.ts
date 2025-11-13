import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import browser from 'webextension-polyfill';

// Cognito configuration from environment variables
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const REDIRECT_URI = browser.runtime.getURL('oauth-callback.html');

// Validate required configuration
if (!USER_POOL_ID || !CLIENT_ID) {
  console.error('Cognito configuration missing. Please set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in your .env file');
  throw new Error('Cognito configuration is missing. Check your .env file.');
}

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

export interface CognitoUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  idToken?: string;
  accessToken?: string;
}

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<CognitoUserData> => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const accessToken = result.getAccessToken().getJwtToken();
        const payload = result.getIdToken().payload;

        const userData: CognitoUserData = {
          uid: payload.sub,
          email: payload.email || email,
          displayName: payload.name || payload['cognito:username'] || null,
          idToken,
          accessToken,
        };

        // Store tokens in extension storage
        browser.storage.local.set({
          cognito_id_token: idToken,
          cognito_access_token: accessToken,
          cognito_user: userData,
        });

        resolve(userData);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
    ];

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      if (result) {
        // User created successfully, but needs to verify email
        // For now, we'll auto-confirm if email verification is not required
        resolve();
      }
    });
  });
};

/**
 * Sign in with Google using Cognito Hosted UI
 * Opens OAuth flow in a new browser tab
 */
export const signInWithGoogle = async (): Promise<CognitoUserData> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Build OAuth URL
      const clientId = CLIENT_ID;
      const redirectUri = encodeURIComponent(REDIRECT_URI);
      const responseType = 'code';
      const scope = 'openid email profile';
      const identityProvider = 'Google';

      const authUrl = `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `response_type=${responseType}&` +
        `scope=${scope}&` +
        `redirect_uri=${redirectUri}&` +
        `identity_provider=${identityProvider}`;

      // Store pending auth state
      await browser.storage.local.set({ oauth_pending: true });

      // Store tab ID for cleanup
      let oauthTabId: number | undefined;
      let storageInterval: NodeJS.Timeout;

      // Listen for storage changes (callback page will update storage)
      const storageListener = (changes: { [key: string]: any }) => {
        if (changes.oauth_result) {
          const result = changes.oauth_result.newValue;
          browser.storage.onChanged.removeListener(storageListener);
          if (storageInterval) {
            clearInterval(storageInterval);
          }
          browser.storage.local.remove(['oauth_pending', 'oauth_result']).catch(() => {});
          
          // Close the OAuth tab if we have the tab ID
          if (oauthTabId) {
            browser.tabs.remove(oauthTabId).catch(() => {});
          }
          
          if (result?.error) {
            reject(new Error(result.error));
          } else if (result?.code) {
            // Exchange code for tokens
            exchangeCodeForTokens(result.code)
              .then((userData) => {
                resolve(userData);
              })
              .catch((err) => {
                reject(err);
              });
          } else {
            reject(new Error('No authorization code received'));
          }
        }
      };

      browser.storage.onChanged.addListener(storageListener);

      // Also poll storage as fallback (in case onChanged doesn't fire)
      const checkStorage = async () => {
        const stored = await browser.storage.local.get('oauth_result');
        if (stored.oauth_result) {
          if (storageInterval) {
            clearInterval(storageInterval);
          }
          browser.storage.onChanged.removeListener(storageListener);
          storageListener({ oauth_result: { newValue: stored.oauth_result } });
        }
      };
      
      // Check storage periodically
      storageInterval = setInterval(() => {
        checkStorage();
      }, 500);

      // Open OAuth URL in new tab
      const tab = await browser.tabs.create({
        url: authUrl,
        active: true,
      });

      // Store tab ID to close it later
      oauthTabId = tab.id;

      // Set timeout to reject if no response
      setTimeout(() => {
        browser.storage.onChanged.removeListener(storageListener);
        clearInterval(storageInterval);
        browser.storage.local.remove(['oauth_pending', 'oauth_result']).catch(() => {});
        if (tab.id) {
          browser.tabs.remove(tab.id).catch(() => {});
        }
        reject(new Error('OAuth flow timed out'));
      }, 5 * 60 * 1000); // 5 minute timeout
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<CognitoUserData> {
  const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
  const clientId = CLIENT_ID;
  const redirectUri = REDIRECT_URI;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  const { id_token, access_token } = data;

  // Decode JWT to get user info
  const payload = JSON.parse(atob(id_token.split('.')[1]));

  const userData: CognitoUserData = {
    uid: payload.sub,
    email: payload.email || null,
    displayName: payload.name || payload['cognito:username'] || null,
    idToken: id_token,
    accessToken: access_token,
  };

  // Store tokens in extension storage
  await browser.storage.local.set({
    cognito_id_token: id_token,
    cognito_access_token: access_token,
    cognito_user: userData,
  });

  return userData;
}

/**
 * Sign out current user
 */
export const logOut = async (): Promise<void> => {
  // Clear stored tokens
  await browser.storage.local.remove([
    'cognito_id_token',
    'cognito_access_token',
    'cognito_user',
  ]);

  // Sign out from Cognito
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<CognitoUserData | null> => {
  // First check stored user data
  const stored = await browser.storage.local.get('cognito_user');
  if (stored.cognito_user && typeof stored.cognito_user === 'object') {
    return stored.cognito_user as CognitoUserData;
  }

  // Try to get from Cognito
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: any) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      const idToken = session.getIdToken().getJwtToken();
      const accessToken = session.getAccessToken().getJwtToken();
      const payload = session.getIdToken().payload;

      const userData: CognitoUserData = {
        uid: payload.sub,
        email: payload.email || null,
        displayName: payload.name || payload['cognito:username'] || null,
        idToken,
        accessToken,
      };

      // Store for future use
      browser.storage.local.set({
        cognito_id_token: idToken,
        cognito_access_token: accessToken,
        cognito_user: userData,
      });

      resolve(userData);
    });
  });
};

/**
 * Listen for auth state changes
 * For browser extensions, we check storage and Cognito session
 */
export const onAuthChange = (
  callback: (user: CognitoUserData | null) => void
): (() => void) => {
  // Check initial state
  getCurrentUser().then(callback);

  // Listen for storage changes (when user signs in/out in another tab)
  const listener = (changes: { [key: string]: any }) => {
    if (changes.cognito_user) {
      callback(changes.cognito_user.newValue || null);
    }
  };

  browser.storage.onChanged.addListener(listener);

  // Return unsubscribe function
  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
};

/**
 * Get current user's ID token for API calls
 */
export const getIdToken = async (): Promise<string | null> => {
  const stored = await browser.storage.local.get('cognito_id_token');
  return (typeof stored.cognito_id_token === 'string' ? stored.cognito_id_token : null);
};

