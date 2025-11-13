# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-2_hpx0kaXqH
VITE_COGNITO_CLIENT_ID=jjt69oab9uo8bkmjqtmkoc2os
VITE_COGNITO_DOMAIN=https://us-east-2hpx0kaxqh.auth.us-east-2.amazoncognito.com

# API Gateway Configuration
VITE_API_GATEWAY_URL=https://oqer7bx7mj.execute-api.us-east-2.amazonaws.com/dev/response
```

## How to Get These Values

### Cognito Values
1. **User Pool ID**: 
   - AWS Console → Cognito → User Pools → Your Pool
   - Copy the User Pool ID (e.g., `us-east-2_hpx0kaXqH`)

2. **Client ID**:
   - Same page → App Integration → App clients
   - Copy the Client ID

3. **Domain**:
   - Same page → App Integration → Domain
   - Copy the Cognito domain URL

### API Gateway URL
1. AWS Console → API Gateway → Your API → Stages
2. Click on your stage (e.g., `dev`)
3. Copy the Invoke URL
4. Append `/response` to the end

## Important Notes

- **Never commit `.env` to git** (it should be in `.gitignore`)
- Update Cognito App Client with your extension's callback URL:
  - `chrome-extension://<your-extension-id>/oauth-callback.html`
- After building, you can find your extension ID in Chrome's extension management page

