# Account Linking Setup Guide

This guide explains how to set up the API Gateway endpoint for account linking functionality.

## Overview

Account linking allows users who signed up with email/password to link their Google account (and vice versa), so they can use either authentication method with the same account.

## Prerequisites

- ✅ AWS Lambda function created (`accountLinking.js`)
- ✅ Lambda function has Cognito SDK dependency installed
- ✅ Lambda execution role has permissions for `cognito-idp:AdminLinkProviderForUser`

## Step 1: Deploy Account Linking Lambda Function

1. **Install dependencies:**
   ```bash
   cd lambda
   npm install
   ```

2. **Create deployment package:**
   ```bash
   zip -r accountLinking.zip . -x "*.git*" "*.md" "index.js" "function.zip"
   ```

3. **Create Lambda function in AWS Console:**
   - Go to AWS Console → **Lambda** → **Functions** → **Create Function**
   - **Function name**: `leetvision-account-linking`
   - **Runtime**: Node.js 20.x
   - **Architecture**: arm64 (recommended)
   - Click **Create Function**

4. **Upload code:**
   - In the Lambda function page, go to **Code** tab
   - Click **Upload from** → **.zip file**
   - Upload `accountLinking.zip`
   - Click **Save**

5. **Configure environment variables:**
   - Go to **Configuration** → **Environment Variables**
   - Add:
     - `COGNITO_USER_POOL_ID`: Your Cognito User Pool ID (e.g., `us-east-2_hpx0kaXqH`)
     - `AWS_REGION`: Your AWS region (e.g., `us-east-2`)

6. **Grant Cognito permissions:**
   - Go to **Configuration** → **Permissions**
   - Click on the execution role name
   - In IAM, click **Add permissions** → **Create inline policy**
   - **JSON** tab, paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cognito-idp:AdminLinkProviderForUser",
           "cognito-idp:AdminGetUser",
           "cognito-idp:ListUsers"
         ],
         "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
       }
     ]
   }
   ```
   - **Policy name**: `LeetVisionAccountLinkingPolicy`
   - Click **Create policy**

## Step 2: Configure API Gateway Endpoint

1. **Go to API Gateway:**
   - AWS Console → **API Gateway** → Your API (`leetvision-api`)
   - Or create a new API if needed

2. **Create new resource:**
   - Under **Resources**, click **Actions** → **Create Resource**
   - **Resource Name**: `link-account`
   - **Resource Path**: `/link-account`
   - ☑ Enable API Gateway CORS
   - Click **Create Resource**

3. **Create POST method:**
   - Select the `/link-account` resource
   - Click **Actions** → **Create Method** → Select **POST** → Click checkmark
   - **POST Setup**:
     - **Integration type**: Lambda Function
     - ☑ Use Lambda Proxy Integration
     - **Lambda Function**: `leetvision-account-linking`
     - Click **Save** → **OK** (permission prompt)

4. **Verify/Configure CORS:**
   - The `/link-account` resource should have an `OPTIONS` method (created automatically)
   - If not, click **Actions** → **Enable CORS**
   - Configure:
     - **Access-Control-Allow-Origin**: `*`
     - **Access-Control-Allow-Headers**: `Content-Type,Authorization`
     - **Access-Control-Allow-Methods**: ☑ POST, ☑ OPTIONS
   - Click **Enable CORS and replace existing CORS headers**

5. **Deploy API:**
   - **Actions** → **Deploy API**
   - **Deployment stage**: `prod` (or `dev`)
   - **Deployment description**: `Add account linking endpoint`
   - Click **Deploy**

6. **Note the endpoint URL:**
   - Your endpoint will be: `https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/link-account`
   - This should match the pattern: `https://<your-api-url>/link-account`

## Step 3: Update Frontend Configuration

The frontend code automatically constructs the linking URL from your existing API Gateway URL:
- If your API Gateway URL is: `https://abc123.execute-api.us-east-2.amazonaws.com/dev/response`
- The linking URL will be: `https://abc123.execute-api.us-east-2.amazonaws.com/dev/link-account`

No code changes needed - it's handled automatically in `cognito.ts`.

## Step 4: Test Account Linking

1. **Test scenario 1: Email → Google**
   - Sign up with email/password
   - Sign out
   - Sign in with Google (using same email)
   - System should detect conflict and prompt for linking

2. **Test scenario 2: Google → Email**
   - Sign in with Google
   - Sign out
   - Try to sign in with email (same email as Google)
   - System should detect conflict and prompt for linking

## Troubleshooting

### Error: "Lambda function not found"
- Verify Lambda function name matches: `leetvision-account-linking`
- Check API Gateway integration points to correct Lambda function

### Error: "Access denied" or "Insufficient permissions"
- Verify Lambda execution role has `cognito-idp:AdminLinkProviderForUser` permission
- Check IAM policy includes the correct resource ARN

### Error: "User not found"
- Verify `COGNITO_USER_POOL_ID` environment variable is set correctly
- Check that both accounts (email and Google) exist in the same User Pool

### Error: "Emails do not match"
- Ensure both accounts use the exact same email address
- Check for case sensitivity or whitespace issues

## Security Notes

- The Lambda function validates that both accounts have the same email before linking
- Account linking requires authentication (ID token from current session)
- Rate limiting should be considered for production use

