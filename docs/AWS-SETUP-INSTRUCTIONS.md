# AWS Infrastructure Setup Guide for LeetVision

Complete step-by-step instructions to migrate from Firebase to AWS.

---

## Prerequisites

- ✅ AWS Account created
- ✅ AWS CLI installed and configured
- ✅ IAM user with appropriate permissions
- ✅ Gemini API key (existing)

---

## Phase 1: AWS Cognito User Pool (Authentication)

### Step 1.1: Create User Pool

1. Go to AWS Console → **Cognito** → **User Pools** → **Create User Pool**
2. **Sign-in options** tab:
   - Select: ☑ Email
   - Select: ☑ Google (under Federated identity providers)
3. **Password policy** (use defaults):
   - Minimum length: 8 characters
   - Temporarily allow password: ☑ (for initial testing)
4. **Multi-factor authentication**: Optional (skip for now)
5. **User pool name**: `leetvision-users`
6. Click **Create User Pool**

### Step 1.2: Configure Google OAuth Provider

**IMPORTANT**: Before adding Google to Cognito, you need to configure your Google OAuth client:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client (or create a new one)
3. **Authorized redirect URIs**: Add your Cognito domain:
   ```
   https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```
   Example: `https://us-east-2hpx0kaxqh.auth.us-east-2.amazoncognito.com/oauth2/idpresponse`
4. Save the changes

**Then in Cognito:**
1. After pool is created, go to **Sign-in experience** → **Federated identity provider sign-in**
2. Click **Add identity provider** → Select **Google**
3. Enter:
   - **Google Client ID**: From Google Cloud Console
   - **Google Client Secret**: From Google Cloud Console
4. **Authorized scopes**: `openid email profile`
5. Click **Add identity provider**

### Step 1.3: Create App Client

1. Go to **App Integration** tab → **App clients and analytics**
2. Click **Create app client**
3. **App client name**: `leetvision-web-client`
4. **Client secret**: Don't generate (uncheck this - browsers can't securely store secrets)
5. **Authentication flows**:
   - ☑ ALLOW_USER_PASSWORD_AUTH
   - ☑ ALLOW_REFRESH_TOKEN_AUTH
   - ☑ ALLOW_USER_SRP_AUTH
6. **Advanced app client settings**:
   - Callback URLs: `http://localhost:3000` (add more as needed)
   - Sign-out URLs: `http://localhost:3000`
   - OAuth 2.0 grant types: ☑ Authorization code grant, ☑ Implicit grant
   - OpenID Connect scopes: ☑ openid, ☑ email, ☑ profile
7. Click **Create app client**
8. **IMPORTANT**: Copy and save:
   - **User Pool ID** (e.g., `us-east-2_XXXXXXXXX`)
   - **App Client ID** (e.g., `1a2b3c4d5e6f7g8h9i0j`)

### Step 1.4: Configure Domain

1. Go to **App Integration** → **Domain**
2. **Cognito domain** tab → Enter: `leetvision-auth` (or your preferred name)
3. Check availability → **Save changes**
4. Note down your domain URL: `https://leetvision-auth.auth.us-east-1.amazoncognito.com`

**Save these values in your notes:**
- User Pool ID: ____________________
- App Client ID: ____________________
- Domain URL: ____________________

---

## Phase 2: DynamoDB Table (Rate Limiting)

### Step 2.1: Create Table

1. Go to AWS Console → **DynamoDB** → **Tables** → **Create Table**
2. **Table details**:
   - **Table name**: `leetvision-rate-limits`
   - **Partition key**: `userId` (String)
   - **Table settings**: Use default settings
   - **Capacity settings**: **On-demand** (best for free tier)
3. Click **Create Table**

### Step 2.2: Configure TTL (Time-to-Live)

1. After table is created, go to **Additional info** tab
2. Find **Time to live (TTL)** section
3. **TTL attribute**: `ttl` (Number)
4. Click **Save changes**

**Why TTL?** This automatically deletes old rate limit records after they expire, keeping your table clean and free.

---

## Phase 3: Lambda Function (Backend API)

### Step 3.1: Create Lambda Function

1. Go to AWS Console → **Lambda** → **Functions** → **Create Function**
2. **Basic information**:
   - **Function name**: `leetvision-generate-response`
   - **Runtime**: Node.js 20.x
   - **Architecture**: arm64 (better performance, cheaper)
3. Click **Create Function**

### Step 3.2: Configure Environment Variables

1. Go to **Configuration** → **Environment Variables**
2. Click **Edit** → **Add environment variable**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: (your existing Gemini API key)
   - Click **Add environment variable** again:
   - **Key**: `RATE_LIMIT_TABLE`
   - **Value**: `leetvision-rate-limits`
   - Click **Add environment variable** again:
   - **Key**: `AWS_REGION`
   - **Value**: `us-east-2` (or your region)
3. Click **Save**

### Step 3.3: Grant DynamoDB Permissions

1. Go to **Configuration** → **Permissions**
2. You'll see an **Execution role** (e.g., `leetvision-generate-response-role-xxxxx`)
3. Click on the role name (opens IAM)
4. In IAM, click **Add permissions** → **Create inline policy**
5. **JSON** tab, paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/leetvision-rate-limits"
    }
  ]
}
```

6. Replace `us-east-1` with your region if different
7. Replace `*` with your account ID (or leave `*` for wildcard)
8. **Policy name**: `LeetVisionDynamoDBAccess`
9. Click **Create policy**

### Step 3.4: Deploy Lambda Function Code

The Lambda function code has been created in `lambda/index.js`. To deploy it:

**Option 1: Upload via AWS Console (Easiest)**
1. In Lambda function page, go to **Code** tab
2. Click **Upload from** → **.zip file**
3. Create a zip file:
   ```bash
   cd lambda
   npm install
   zip -r function.zip . -x "*.git*" "*.md"
   ```
4. Upload `function.zip` in Lambda console
5. Click **Save**

**Option 2: Use AWS CLI (Advanced)**
```bash
cd lambda
npm install
zip -r function.zip . -x "*.git*" "*.md"
aws lambda update-function-code \
  --function-name leetvision-generate-response \
  --zip-file fileb://function.zip \
  --region us-east-2
```

**What the code does:**
- Handles POST requests from API Gateway
- Checks rate limits using DynamoDB
- Calls Gemini API with user's code
- Returns AI-generated response
- Includes CORS headers for browser extension

---

## Phase 4: API Gateway (REST API)

### Step 4.1: Create REST API

1. Go to AWS Console → **API Gateway** → **APIs** → **Create API**
2. Select **REST API** → **Build**
3. **API details**:
   - **API name**: `leetvision-api`
   - **Endpoint Type**: Regional
4. Click **Create API**

### Step 4.2: Create Resource and Method

1. In API Gateway console, under **Resources**:
   - Click **Actions** → **Create Resource**
   - **Resource Name**: `response`
   - **Resource Path**: `/response`
   - ☑ Enable API Gateway CORS
   - Click **Create Resource**

2. Select the `/response` resource → **Actions** → **Create Method**
3. Select **POST** → Click checkmark
4. **POST Setup**:
   - **Integration type**: Lambda Function
   - ☑ Use Lambda Proxy Integration
   - **Lambda Function**: `leetvision-generate-response`
   - ☑ Use default timeout
   - Click **Save** → **OK** (permission prompt)

### Step 4.3: Verify/Configure CORS

Since you checked CORS when creating the resource, an OPTIONS method should already exist. Verify:

1. In the resource tree (left sidebar), check that `/response` has both:
   - `OPTIONS` method (created automatically for CORS)
   - `POST` method (the one you just created)

2. **If OPTIONS method exists**: CORS is already configured! Skip to Step 4.4.

3. **If OPTIONS method is missing** or you need to update CORS:
   - Click on the `/response` **resource** (not the POST method)
   - Click **Actions** dropdown (top right) → **Enable CORS**
   - Configure:
     - **Access-Control-Allow-Origin**: `*`
     - **Access-Control-Allow-Headers**: `Content-Type,Authorization`
     - **Access-Control-Allow-Methods**: ☑ POST, ☑ OPTIONS
   - Click **Enable CORS and replace existing CORS headers**
   - Click **Yes, replace existing values**

### Step 4.4: Deploy API

1. **Actions** → **Deploy API**
2. **Deployment stage**: `prod` (or `dev` for testing)
3. **Deployment description**: `Initial deployment`
4. Click **Deploy**
5. **IMPORTANT**: Copy your **Invoke URL** (e.g., `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`)

**Save this value:**
- API Gateway URL: ____________________

---

## Phase 5: Test Integration

### Step 5.1: Test Lambda Function

1. Go to Lambda → `leetvision-generate-response`
2. Go to **Test** tab
3. Create new test event:

```json
{
  "httpMethod": "POST",
  "body": "{\"code\":\"function test() { return 'hello'; }\",\"mode\":\"explain\",\"responseLength\":3}",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

4. Click **Test** → Check logs for errors

### Step 5.2: Test API Gateway

**Option 1: Test in API Gateway Console**
1. Go to **Resources** tab (not Stages)
2. Expand `/response` resource
3. Click on **POST** method
4. Click the **TEST** tab (next to Method request, Integration request, etc.)
5. **Request body**:

```json
{
  "code": "function test() { return 'hello'; }",
  "mode": "explain",
  "responseLength": 3
}
```

6. Click **Test** → Verify response

**Option 2: Test with Invoke URL (Recommended)**
1. Copy your Invoke URL from Stages view: `https://oqer7bx7mj.execute-api.us-east-2.amazonaws.com/dev/response`
2. Use curl or Postman to test:
   ```bash
   curl -X POST https://oqer7bx7mj.execute-api.us-east-2.amazonaws.com/dev/response \
     -H "Content-Type: application/json" \
     -d '{"code":"function test() { return \"hello\"; }","mode":"explain","responseLength":3}'
   ```
3. Or test in browser console/Postman with the same URL and body

---

## Summary of Values to Save

Create a file `aws-config.txt` with:

```
AWS_REGION=us-east-1

# Cognito
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
COGNITO_DOMAIN=https://leetvision-auth.auth.us-east-1.amazoncognito.com

# DynamoDB
DYNAMODB_TABLE_NAME=leetvision-rate-limits

# API Gateway
API_GATEWAY_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod

# Lambda
LAMBDA_FUNCTION_NAME=leetvision-generate-response
```

---

## Next Steps

1. ✅ Infrastructure is ready
2. ⏭ Create Lambda function code (see `lambda/` folder)
3. ⏭ Update frontend to use Cognito
4. ⏭ Update API calls to use API Gateway
5. ⏭ Test end-to-end flow

---

## Troubleshooting

### Issue: Lambda can't access DynamoDB
- **Fix**: Check IAM role permissions (Step 3.3)

### Issue: CORS errors in browser
- **Fix**: Verify CORS is enabled in API Gateway (Step 4.3)

### Issue: Cognito OAuth redirect not working
- **Fix**: Check callback URLs match in App Client settings (Step 1.3)

### Issue: TTL not working in DynamoDB
- **Fix**: Ensure TTL attribute is named `ttl` and is a Number type

---

## Cost Estimate (Monthly)

- **Cognito**: Free tier covers 50,000 MAU
- **DynamoDB**: Free tier covers 25GB storage + 2.5M read/write units
- **Lambda**: Free tier covers 1M requests + 400K GB-seconds
- **API Gateway**: Free tier covers 1M API calls/month

**Total**: Should be $0-5/month for development/testing

---

## Resources

- [AWS SDK v3 Documentation](https://github.com/aws/aws-sdk-js-v3)
- [Cognito User Pools Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

