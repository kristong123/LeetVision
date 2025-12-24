// Extract authorization code from URL
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const error = urlParams.get('error');
const errorDescription = urlParams.get('error_description');

// Log OAuth callback details for debugging
console.log('OAuth callback received:', {
  code: code ? 'present' : 'missing',
  error: error || 'none',
  errorDescription: errorDescription || 'none',
  fullUrl: window.location.href
});

if (error) {
  // Build detailed error message
  let errorMessage = errorDescription || error;

  // Provide helpful context for common errors
  const errorLower = error.toLowerCase();
  if (errorLower === 'invalid_scope' || errorLower.includes('invalid scope')) {
    errorMessage = `Invalid scope error: ${errorDescription || error}. ` +
      'Please verify that your Cognito App Client has the following OAuth scopes enabled: openid, email, profile. ' +
      'Check: Cognito → User Pool → App Integration → App clients → [Your Client] → Hosted UI → Allowed OAuth scopes';
  } else if (errorLower === 'invalid_request' || errorLower.includes('invalid request')) {
    errorMessage = `Invalid request: ${errorDescription || error}. ` +
      'Please check your OAuth configuration and ensure all required parameters are correct.';
  } else if (errorLower.includes('redirect_uri') || errorLower.includes('redirect uri')) {
    errorMessage = `Redirect URI error: ${errorDescription || error}. ` +
      'Please verify the callback URL matches your Cognito App Client settings.';
  }

  // Log error details for debugging
  console.error('OAuth error details:', {
    errorCode: error,
    errorDescription: errorDescription,
    fullUrl: window.location.href,
    errorMessage: errorMessage
  });
  console.error('Raw error from URL:', error);
  console.error('Error description from URL:', errorDescription);

  // Store error in extension storage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({
      oauth_result: {
        error: errorMessage,
        errorCode: error,
        errorDescription: errorDescription,
      },
    });
  }

  document.querySelector('.container').innerHTML = `
    <div style="color: #dc2626;">
      <h2>Sign-in Error</h2>
      <p style="word-break: break-word;">${errorMessage}</p>
      <p style="font-size: 0.875rem; margin-top: 1rem; color: #6b7280;">
        Error code: ${error}${errorDescription ? ` (${errorDescription})` : ''}
      </p>
      <p style="font-size: 0.875rem; margin-top: 1rem;">You can close this tab.</p>
    </div>
  `;

  // No auto-close on error - let user read the message
} else if (code) {
  // Store code in extension storage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({
      oauth_result: {
        code: code,
      },
    });
  }
  document.querySelector('.container').innerHTML = `
    <div style="color: #059669;">
      <h2>Sign-in Successful!</h2>
      <p>You can close this tab and return to the extension.</p>
    </div>
  `;

  // No auto-close on success - let user close manually
} else {
  // Store error
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({
      oauth_result: {
        error: 'No authorization code received',
      },
    });
  }
  document.querySelector('.container').innerHTML = `
    <div style="color: #dc2626;">
      <h2>Error</h2>
      <p>No authorization code received.</p>
      <p style="font-size: 0.875rem; margin-top: 1rem;">You can close this tab.</p>
    </div>
  `;

  // No auto-close
}

