# AWS Cognito Example Code (Reference)

This document contains the example code provided by AWS Cognito during setup. **Note:** This code is for React web applications. LeetVision is a browser extension, so we'll need to adapt this code later.

---

## AWS Cognito Configuration Values

From your setup, save these values:

```
COGNITO_USER_POOL_ID: us-east-2_hpx0kaXqH
COGNITO_CLIENT_ID: jjt69oab9uo8bkmjqtmkoc2os
COGNITO_REGION: us-east-2
COGNITO_AUTHORITY: https://cognito-idp.us-east-2.amazonaws.com/us-east-2_hpx0kaXqH
```

---

## Step 1: Configure User Pool App Client

You need to configure:
- **Allowed callback URLs**: Your extension's redirect URL
- **Logout URLs**: Your extension's logout redirect URL  
- **Scopes**: `openid`, `email`, `profile`

To configure:
1. Go to Cognito → User Pools → Your Pool → App Integration
2. Edit your App Client
3. Add callback/logout URLs
4. Configure OAuth scopes

---

## Step 2: Install Libraries (React Web App - NOT for Extension)

```bash
npm install oidc-client-ts react-oidc-context --save
```

**Note:** For browser extension, we'll use `amazon-cognito-identity-js` instead.

---

## Step 3: Configure react-oidc-context (React Web App Example)

```javascript
// index.js

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_hpx0kaXqH",
  client_id: "jjt69oab9uo8bkmjqtmkoc2os",
  redirect_uri: "https://d84l1y8p4kdic.cloudfront.net",
  response_type: "code",
  scope: "phone openid email",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

// wrap the application with AuthProvider
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

---

## Step 4: Sign In/Out Example (React Web App Example)

```javascript
// App.js

import { useAuth } from "react-oidc-context";

function App() {
  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = "jjt69oab9uo8bkmjqtmkoc2os";
    const logoutUri = "<logout uri>";
    const cognitoDomain = "https://<user pool domain>";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>
        <pre> ID Token: {auth.user?.id_token} </pre>
        <pre> Access Token: {auth.user?.access_token} </pre>
        <pre> Refresh Token: {auth.user?.refresh_token} </pre>

        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  );
}

export default App;
```

---

## Notes for Browser Extension Adaptation

Since LeetVision is a browser extension (not a React web app), we'll need to:

1. **Use `amazon-cognito-identity-js`** instead of `react-oidc-context`
   ```bash
   npm install amazon-cognito-identity-js --save
   ```

2. **Handle OAuth redirects** differently:
   - Browser extensions use `chrome.identity.launchWebAuthFlow()` for OAuth
   - Or use Cognito's hosted UI with proper redirect URLs

3. **Store tokens** in `chrome.storage.local` instead of localStorage

4. **Adapt the authentication flow** for extension context:
   - Extension popup windows
   - Background scripts
   - Content scripts

---

## Next Steps

After completing AWS setup:
1. Create `src/services/cognito.ts` using `amazon-cognito-identity-js`
2. Adapt authentication flow for browser extension
3. Update `src/components/Auth.tsx` to use Cognito
4. Handle token storage in extension storage

---

## Reference Links

- [AWS Cognito JavaScript SDK](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [Chrome Extension Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Cognito User Pool Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)

