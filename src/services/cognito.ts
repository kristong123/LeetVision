import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import browser from 'webextension-polyfill';

/**
 * AWS Cognito Authentication Service
 * 
 * REQUIRED COGNITO APP CLIENT CONFIGURATION:
 * 
 * For Google OAuth to work properly, your Cognito App Client must have the following
 * OAuth scopes enabled in the Hosted UI settings:
 * 
 * 1. Navigate to: AWS Console → Cognito → User Pools → [Your Pool] → 
 *    App Integration → App clients and analytics → [Your Client] → Edit
 * 
 * 2. Under "Hosted UI" section, ensure these OAuth scopes are checked:
 *    ☑ openid
 *    ☑ email  
 *    ☑ profile
 * 
 * 3. Under "Callback URLs", add your extension's callback URL:
 *    chrome-extension://<your-extension-id>/oauth-callback.html
 *    (Find your extension ID in chrome://extensions/ with Developer mode enabled)
 * 
 * 4. Under "Identity providers", ensure "Google" is checked
 * 
 * 5. Under "OAuth 2.0 grant types", ensure these are checked:
 *    ☑ Authorization code grant
 *    ☑ Implicit grant (optional, but recommended)
 * 
 * These scopes MUST match exactly what's requested in the OAuth URL.
 * If you see an "invalid_scope" error, verify these settings match.
 */

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

// Validate Cognito domain format (helpful for debugging)
if (COGNITO_DOMAIN && !COGNITO_DOMAIN.includes('amazoncognito.com')) {
  console.warn('Cognito domain may be incorrectly formatted. Expected format: https://<domain>.auth.<region>.amazoncognito.com');
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
      onFailure: async (err: unknown) => {
        const error = err as { code?: string; name?: string; message?: string };
        // Provide user-friendly error messages
        const errorCode = error?.code || error?.name || '';
        if (errorCode === 'UserNotConfirmedException') {
          // User exists but email is not verified - allow sign-in anyway
          // We'll authenticate them but they'll remain unverified
          // Try to authenticate using a workaround: we can't directly authenticate unverified users,
          // but we can allow them to proceed by catching this error and providing a way forward
          // For now, we'll reject with a specific error that the UI can handle
          reject(new Error(
            'UNVERIFIED_USER:' + JSON.stringify({
              email,
              message: 'Your email is not verified. You can still sign in, but we recommend verifying your email.'
            })
          ));
        } else if (errorCode === 'UserNotFoundException' || errorCode === 'NotAuthorizedException') {
          // Check if there's a pending Google account that might need linking
          const stored = await browser.storage.local.get('pending_account_link');
          const pendingLink = stored.pending_account_link as { email?: string; googleUserId?: string; providerName?: string } | undefined;
          if (pendingLink && pendingLink.email === email && pendingLink.googleUserId) {
            // There's a Google account with the same email - this is a linking opportunity
            reject(new Error(
              'ACCOUNT_LINKING_NEEDED:' + JSON.stringify({
                email,
                googleUserId: pendingLink.googleUserId,
                message: 'An account with this email exists from Google sign-in. Would you like to link your accounts?'
              })
            ));
          } else {
            reject(new Error(
              'Invalid email or password. ' +
              'If you signed up with Google, please use "Continue with Google" to sign in.'
            ));
          }
        } else {
        reject(err);
        }
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

    userPool.signUp(email, password, attributeList, [], (err: unknown, result) => {
      const error = err as { code?: string; name?: string; message?: string } | null;
      if (error) {
        // Provide user-friendly error messages
        const errorCode = error?.code || error?.name || '';
        if (errorCode === 'UsernameExistsException' || error?.message?.includes('already exists')) {
          reject(new Error(
            'An account with this email already exists. ' +
            'If you signed up with Google, please use "Continue with Google" to sign in. ' +
            'Otherwise, use the "Sign In" option.'
          ));
        } else {
        reject(error);
        }
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
 * Confirm user sign up with verification code
 */
export const confirmSignUp = async (
  email: string,
  code: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err: unknown) => {
      const error = err as { code?: string; name?: string; message?: string } | null;
      if (error) {
        const errorCode = error?.code || error?.name || '';
        if (errorCode === 'CodeMismatchException' || errorCode === 'ExpiredCodeException') {
          reject(new Error(
            errorCode === 'ExpiredCodeException'
              ? 'Verification code has expired. Please request a new code.'
              : 'Invalid verification code. Please check your email and try again.'
          ));
        } else {
          reject(error);
        }
        return;
      }
      resolve();
    });
  });
};

/**
 * Resend confirmation code to user's email
 */
export const resendConfirmationCode = async (
  email: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err: unknown) => {
      const error = err as { code?: string; name?: string; message?: string } | null;
      if (error) {
        const errorCode = error?.code || error?.name || '';
        if (errorCode === 'LimitExceededException') {
          reject(new Error('Too many requests. Please wait a few minutes before requesting another code.'));
        } else {
          reject(error);
        }
        return;
      }
      resolve();
    });
  });
};

/**
 * Sign in with Google using Cognito Hosted UI
 * Opens OAuth flow in a new browser tab
 * 
 * IMPORTANT: Ensure your Cognito App Client has these OAuth scopes enabled:
 * - openid
 * - email
 * - profile
 * 
 * These must match exactly what's configured in:
 * Cognito → User Pool → App Integration → App clients → [Your Client] → Hosted UI → Allowed OAuth scopes
 */
export const signInWithGoogle = async (): Promise<CognitoUserData> => {
  // Validate required configuration
  if (!COGNITO_DOMAIN) {
    throw new Error('Cognito domain is not configured. Please set VITE_COGNITO_DOMAIN in your .env file');
  }

  // Define required OAuth scopes (must match Cognito App Client configuration)
  // These scopes must be space-separated: 'openid email profile'
  const requiredScopes = ['openid', 'email', 'profile'];
  const scopeString = requiredScopes.join(' ');

  // Build OAuth URL with manual parameter encoding
  // Note: We manually encode parameters to ensure proper formatting
  // Cognito is sensitive to scope encoding - spaces should be encoded as %20, not +
  // identity_provider should match the provider name configured in Cognito
  // Use 'Google' (Capitalized) as this is the default name when adding Google provider
  const identityProvider = 'Google';
  
  const params = [
    `client_id=${encodeURIComponent(CLIENT_ID)}`,
    `response_type=${encodeURIComponent('code')}`,
    `scope=${encodeURIComponent(scopeString)}`, // Encode scope with spaces as %20
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
    `identity_provider=${encodeURIComponent(identityProvider)}`,
  ].join('&');

  const authUrl = `${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
  
  // Debug: log the URL and configuration
  console.log('OAuth URL (should redirect to Google):', authUrl);
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('Cognito Domain:', COGNITO_DOMAIN);
  console.log('Requested scopes:', scopeString);
  console.log('Identity provider:', identityProvider);
  console.log('Scope parameter in URL:', authUrl.match(/scope=([^&]+)/)?.[1] || 'not found');
  console.log('Expected flow: Cognito → Google → Cognito → Extension callback');
  console.log('Note: If you see invalid_scope error, verify Cognito App Client has these scopes enabled: openid, email, profile');
  
  // Validate that the scope parameter is properly formatted
  if (!authUrl.includes('scope=')) {
    throw new Error('Failed to construct OAuth URL with scope parameter');
  }
  
  // Verify scope encoding (should have %20 for spaces, not +)
  const scopeParam = authUrl.match(/scope=([^&]+)/)?.[1];
  if (scopeParam && scopeParam.includes('+')) {
    console.warn('Warning: Scope parameter contains + instead of %20. This may cause issues with Cognito.');
  }

  // Store pending auth state
  await browser.storage.local.set({ oauth_pending: true });

  return new Promise((resolve, reject) => {
    let tabId: number | undefined;
    let interval: NodeJS.Timeout | undefined;

    // Listen for storage changes (callback page will update storage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storageListener = (changes: { [key: string]: any }) => {
        if (changes.oauth_result) {
          const result = changes.oauth_result.newValue;
          browser.storage.onChanged.removeListener(storageListener);
          if (interval) {
            clearInterval(interval);
          }
          browser.storage.local.remove(['oauth_pending', 'oauth_result']).catch(() => {});
          
          // Close the OAuth tab if we have the tab ID
          if (tabId) {
            browser.tabs.remove(tabId).catch(() => {});
          }
          
          if (result?.error) {
            // Provide more specific error messages for common OAuth errors
            const errorMsg = result.error.toLowerCase();
            if (errorMsg.includes('invalid_scope') || errorMsg.includes('invalid scope')) {
              reject(new Error(
                'Invalid scope error. Please verify that your Cognito App Client has the following OAuth scopes enabled: openid, email, profile. ' +
                'Check: Cognito → User Pool → App Integration → App clients → [Your Client] → Hosted UI → Allowed OAuth scopes'
              ));
            } else if (errorMsg.includes('redirect_uri') || errorMsg.includes('redirect uri')) {
              reject(new Error(
                `Redirect URI mismatch. Expected: ${REDIRECT_URI}. ` +
                'Please verify the callback URL is added to your Cognito App Client settings.'
              ));
            } else {
            reject(new Error(result.error));
            }
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
          if (storageCheckInterval) {
            clearInterval(storageCheckInterval);
          }
          browser.storage.onChanged.removeListener(storageListener);
          storageListener({ oauth_result: { newValue: stored.oauth_result } });
        }
      };
      
      // Check storage periodically
      const storageCheckInterval = setInterval(() => {
        checkStorage();
      }, 500);

      // Open OAuth URLin new tab
      // Note: Opening a new tab usually closes the extension popup
      // The state will be lost unless we handle it on mount
      browser.tabs.create({
        url: authUrl,
        active: true,
      }).then((tab) => {
        // Store tab ID to close it later
        tabId = tab.id;

        // Set timeout to reject if no response
        // Note: This timeout will likely only fire if the popup stays open (e.g. side panel)
        setTimeout(() => {
          browser.storage.onChanged.removeListener(storageListener);
          clearInterval(storageCheckInterval);
          browser.storage.local.remove(['oauth_pending', 'oauth_result']).catch(() => {});
          if (tab.id) {
            browser.tabs.remove(tab.id).catch(() => {});
          }
          reject(new Error('OAuth flow timed out'));
        }, 5 * 60 * 1000); // 5 minute timeout
      });
    });
};

/**
 * Handle pending OAuth flow (recovery from popup closure)
 * This should be called when the app mounts
 */
export const handlePendingOAuth = async (): Promise<CognitoUserData | null> => {
  try {
    const stored = await browser.storage.local.get(['oauth_pending', 'oauth_result']);
    const pendingData = stored as { 
      oauth_pending?: boolean; 
      oauth_result?: { 
        code?: string; 
        error?: string;
        errorCode?: string;
        errorDescription?: string;
      } 
    };
    
    // If no pending flow or no result yet, do nothing
    if (!pendingData.oauth_pending || !pendingData.oauth_result) {
      // If we've been pending for too long (e.g. user closed tab without finishing), 
      // we might want to clear it? For now, let's rely on manual cleanup or timeouts.
       
      // Check if we have a stale pending state (older than 10 mins?)
      // We could add timestamps to the storage set if needed.
      return null;
    }

    const { oauth_result } = pendingData;
    
    // Clear pending state immediately to prevent loops
    await browser.storage.local.remove(['oauth_pending', 'oauth_result']);

    if (oauth_result.error) {
      throw new Error(oauth_result.error);
    }

    if (oauth_result.code) {
      return await exchangeCodeForTokens(oauth_result.code);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to handle pending OAuth:', error);
    // Ensure cleanup
    await browser.storage.local.remove(['oauth_pending', 'oauth_result']);
    throw error;
  }
};

/**
 * Exchange authorization code for tokens
 * 
 * This function exchanges the OAuth authorization code received from Cognito
 * for ID and access tokens. The tokens contain user information based on the
 * scopes requested during the OAuth flow (openid, email, profile).
 */
async function exchangeCodeForTokens(code: string): Promise<CognitoUserData> {
  const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
  const clientId = CLIENT_ID;
  const redirectUri = REDIRECT_URI;

  try {
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
      // Try to get detailed error information
      let errorMessage = 'Failed to exchange code for tokens';
      try {
        const errorData = await response.json();
        const errorDesc = errorData.error_description || errorData.error || '';
        errorMessage = `Token exchange failed: ${errorDesc}`;
        
        // Provide specific guidance for common errors
        if (errorDesc.toLowerCase().includes('invalid_grant') || errorDesc.toLowerCase().includes('invalid grant')) {
          errorMessage += '. The authorization code may have expired or been used already.';
        } else if (errorDesc.toLowerCase().includes('invalid_client') || errorDesc.toLowerCase().includes('invalid client')) {
          errorMessage += '. Please verify your Cognito Client ID is correct.';
        }
        
        console.error('Token exchange error:', errorData);
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = `Token exchange failed with status ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
  }

  const data = await response.json();
  const { id_token, access_token } = data;

    if (!id_token || !access_token) {
      throw new Error('Missing tokens in response from Cognito');
    }

  // Decode JWT to get user info
  const payload = JSON.parse(atob(id_token.split('.')[1]));

  const userData: CognitoUserData = {
    uid: payload.sub,
    email: payload.email || null,
    displayName: payload.name || payload['cognito:username'] || null,
    idToken: id_token,
    accessToken: access_token,
  };

  // Check if this is a federated identity (Google) and if an email account might exist
    // We can detect this by checking if the identity provider is Google
    // and if the username format suggests it's a federated user
    const isFederatedUser = payload.identities && payload.identities.length > 0;
    const isGoogleUser = isFederatedUser && 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.identities.some((id: any) => id.providerName === 'Google' || id.providerName === 'google');
    
    // Store account linking metadata if this is a Google user
    if (isGoogleUser && userData.email) {
      await browser.storage.local.set({
        pending_account_link: {
          googleUserId: payload.sub,
          email: userData.email,
          providerName: 'Google',
        },
      });
    }

    // Check email verification status
    // Note: Google usually verifies emails, but we should enforce it
    const isVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!isVerified && userData.email) {
       // Store tokens anyway so we can use them for resending code etc if needed, 
       // but throw error to block full sign-in until verified
       await browser.storage.local.set({
        cognito_id_token: id_token,
        cognito_access_token: access_token,
        cognito_user: userData,
      });

      throw new Error(
        'UNVERIFIED_USER:' + JSON.stringify({
          email: userData.email,
          message: 'Your email is not verified. Please verify your email to continue.'
        })
      );
    }

  // Store tokens in extension storage
  await browser.storage.local.set({
    cognito_id_token: id_token,
    cognito_access_token: access_token,
    cognito_user: userData,
  });

  return userData;
  } catch (err: unknown) {
    const error = err as Error;
    // Re-throw with additional context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Token exchange failed: ${String(err)}`);
  }
}

/**
 * Check if an account exists with the given email
 * This is used to detect if a user trying to sign in with Google
 * already has an email/password account
 */
/**
 * Check if an account exists with the given email
 * Note: This is a placeholder - actual checking happens through sign-in attempts
 * and conflict detection
 */
export const checkAccountExists = async (): Promise<{ exists:boolean; userId?: string }> => {
  // We can't directly query Cognito from the client without admin permissions
  // Account existence is detected through sign-in failures and conflict detection
  return { exists: false };
};

/**
 * Link a federated identity (Google) to an existing Cognito user account
 * @param sourceUserId - User ID from the federated provider (Google account)
 * @param destinationUserId - User ID from Cognito (email/password account)
 * @param providerName - Identity provider name (e.g., "Google")
 * @param idToken - ID token from current session for authentication
 */
export const linkAccounts = async (
  sourceUserId: string,
  destinationUserId: string,
  providerName: string,
  idToken: string
): Promise<void> => {
  const apiGatewayUrl = import.meta.env.VITE_API_GATEWAY_URL;
  
  if (!apiGatewayUrl) {
    throw new Error('API Gateway URL is not configured. Please set VITE_API_GATEWAY_URL in your .env file');
  }

  // Construct the account linking endpoint
  // Assuming the endpoint will be at /link-account
  const linkAccountUrl = apiGatewayUrl.replace(/\/response$/, '/link-account');

  const response = await fetch(linkAccountUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      sourceUserId,
      destinationUserId,
      providerName,
      idToken,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Account linking failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      
      // Provide specific error messages based on status code
      if (response.status === 400) {
        if (errorMessage.includes('emails do not match')) {
          errorMessage = 'Cannot link accounts: The email addresses do not match.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'One or both accounts were not found. Please ensure both accounts exist.';
        }
      } else if (response.status === 404) {
        errorMessage = 'Account not found. Please ensure the email account exists.';
      } else if (response.status === 409) {
        errorMessage = 'These accounts are already linked.';
      } else if (response.status === 500) {
        errorMessage = 'Server error during account linking. Please try again later.';
      }
    } catch {
      // If we can't parse the error, use the status text
      errorMessage = `Account linking failed: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Account linking failed');
  }
};

/**
 * Check if a Google-signed-in user needs to link with an existing email account
 * This is called after successful Google sign-in to detect conflicts
 * 
 * Note: Actual conflict detection happens when user attempts email sign-in
 * and we check for pending_account_link in storage
 */
export const checkAccountLinkingNeeded = async (
): Promise<{ needsLinking: boolean; existingUserId?: string }> => {
  // Conflict detection is handled in signInWithEmail's error handler
  // which checks for pending_account_link when email sign-in fails
  return { needsLinking: false };
};

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

    cognitoUser.getSession((err: Error | null, session: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sess = session as any;
      if (err || !sess || !sess.isValid()) {
        resolve(null);
        return;
      }

      const idToken = sess.getIdToken().getJwtToken();
      const accessToken = sess.getAccessToken().getJwtToken();
      const payload = sess.getIdToken().payload;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Set password for a user (enables dual auth)
 * Calls the account linking lambda which now supports password setting
 */
export const setPasswordForUser = async (
  email: string,
  password: string,
  idToken: string
): Promise<void> => {
  const apiGatewayUrl = import.meta.env.VITE_API_GATEWAY_URL;
  
  if (!apiGatewayUrl) {
    throw new Error('API Gateway URL is not configured');
  }

  // Use the same endpoint as account linking
  const linkAccountUrl = apiGatewayUrl.replace(/\/response$/, '/link-account');

  const response = await fetch(linkAccountUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      action: 'setPassword',
      email,
      password,
      idToken,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to set password';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `Failed to set password: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to set password');
  }
};

/**
 * Check if current user's email is verified
 * If not, triggers verification flow
 */
export const ensureEmailVerified = async (user: CognitoUserData): Promise<boolean> => {
  // If we have an ID token, check the email_verified claim
  if (user.idToken) {
    try {
      const payload = JSON.parse(atob(user.idToken.split('.')[1]));
      if (payload.email_verified === false) { // Explicitly false
        return false;
      }
      if (payload.email_verified === 'false') { // String false
        return false;
      }
      // If true or undefined (some providers don't send it if true), assume true for now
      // unless we want strict enforcement. Google usually sends it as true.
      return true;
    } catch {
      // Token parsing failed, assume unverified to be safe
      return false;
    }
  }
  return false;
};

/**
 * Get current user's ID token for API calls
 */
export const getIdToken = async (): Promise<string | null> => {
  const stored = await browser.storage.local.get('cognito_id_token');
  return (typeof stored.cognito_id_token === 'string' ? stored.cognito_id_token : null);
};

