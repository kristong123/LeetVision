# LeetVision Complete Deployment Guide

**One guide for everything - from setup to deployment!**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Firebase Setup](#firebase-setup)
4. [Get Gemini API Key](#get-gemini-api-key)
5. [Configure Environment](#configure-environment)
6. [Deploy Backend](#deploy-backend)
7. [Build & Install Extension](#build--install-extension)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Overview

LeetVision uses a **backend service** (Firebase Functions) to provide AI features. This means:
- ✅ Users don't need their own API keys
- ✅ Better security - API keys stay on server
- ✅ Built-in rate limiting (10 req/min per user)
- ✅ **100% FREE** for moderate usage

### Architecture
```
User → Extension → Firebase Function → Gemini API → Response
         ↓
   Firebase Auth (required)
         ↓
   Rate Limiting (Firestore)
```

---

## Prerequisites

Before you begin, make sure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] A Google account for Firebase
- [ ] Chrome/Firefox/Edge browser
- [ ] Git (to clone/manage the project)

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., "LeetVision")
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 2. Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Enable sign-in methods:
   - ✅ **Email/Password** (required)
   - ✅ **Google** (recommended)

### 3. Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location (e.g., `us-central1`)
5. Click **"Enable"**

**Note**: Firestore is used for rate limiting.

### 4. Register Web App

1. In Project Settings (gear icon), click **"Add app"**
2. Select **Web** (</> icon)
3. Give it a nickname (e.g., "LeetVision Extension")
4. **Don't** check "Firebase Hosting"
5. Click **"Register app"**
6. **Copy the config object** - you'll need this next!

---

## Get Gemini API Key

### 1. Access Google AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account

### 2. Create API Key

1. Click **"Get API key"** in sidebar
2. Click **"Create API key"**
3. Select your Google Cloud project (or create new)
4. **Copy the API key** immediately!

### 3. Enable Gemini API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Library**
4. Search for **"Generative Language API"**
5. Click it and press **"Enable"**

---

## Configure Environment

### 1. Update `.firebaserc`

Open `.firebaserc` and replace with your Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Find your project ID in Firebase Console → Project Settings.

### 2. Create Root `.env` File

Create `.env` in project root with your Firebase config:

```env
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

### 3. Create `functions/.env` File

Create `.env` in the `functions/` directory with your Gemini key:

```bash
cd functions
echo "GEMINI_API_KEY=your_actual_gemini_api_key" > .env
cd ..
```

Or manually create `functions/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
```

### 4. Install Dependencies

```bash
# Install root dependencies
npm install

# Install function dependencies
cd functions
npm install
cd ..
```

---

## Deploy Backend

### 1. Login to Firebase

```bash
firebase login
```

This will open a browser for authentication.

### 2. Upgrade to Blaze Plan (Required, Still Free!)

**Important**: Firebase Functions requires the Blaze (pay-as-you-go) plan, but **it's still FREE** for moderate usage!

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Usage and billing** (gear icon ⚙️)
4. Click **"Upgrade to Blaze"**
5. Add billing information (required but won't be charged within free tier)

**Don't worry**: You only pay if you exceed **2 million** function calls/month. For moderate usage, it stays at **$0/month**.

**Tip**: Set up budget alerts at $1, $5, $10 to get notified if you somehow exceed free tier.

### 3. Deploy Functions

```bash
firebase deploy --only functions
```

Or use the npm script:
```bash
npm run functions:deploy
```

**First deployment takes 2-3 minutes.** You'll see output like:
```
✔  functions: Finished running predeploy script.
✔  functions[generateResponse(us-central1)] Successful create operation.
Function URL: https://us-central1-your-project.cloudfunctions.net/generateResponse
```

**Save that URL!** (Though the extension auto-generates it.)

### 3. Verify Deployment

```bash
# List deployed functions
firebase functions:list

# Check logs
firebase functions:log
```

---

## Build & Install Extension

### 1. Build Extension

```bash
npm run build
```

This creates the `dist/` folder with your extension.

### 2. Load in Browser

#### Chrome/Edge:
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **"Developer mode"** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `dist/` folder
5. Extension icon appears in toolbar ✅

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `dist/manifest.json`
4. Extension loaded ✅

---

## Testing Checklist

### ✅ Basic Functionality

- [ ] Extension icon appears in browser toolbar
- [ ] Clicking icon opens popup
- [ ] Can create account (email/password)
- [ ] Can sign in with existing account
- [ ] Can sign out
- [ ] Profile icon shows user info

### ✅ AI Features

- [ ] Navigate to LeetCode problem page
- [ ] Extension detects code on page
- [ ] Can switch between Learn/Explain/Improve modes
- [ ] Response length slider works
- [ ] Click quick action button (Hint/Explain/Suggestions)
- [ ] Receives AI response without errors
- [ ] Chat history displays correctly
- [ ] Can type custom question and get response

### ✅ Error Handling

- [ ] Shows "sign in required" when not logged in
- [ ] Shows rate limit message after 10 requests/minute
- [ ] Error messages are helpful (not just "Error")
- [ ] Check browser console for any errors

---

## Troubleshooting

### Extension Won't Load

**Problem**: Extension doesn't appear or won't load

**Solutions**:
1. Run `npm run build` again
2. Check for TypeScript errors in terminal
3. Remove and reload extension in browser
4. Check browser console (F12) for errors
5. Make sure `dist/` folder exists and has files

### Authentication Fails

**Problem**: Can't sign up or sign in

**Solutions**:
1. Verify `.env` has correct Firebase config
2. Check Firebase Console → Authentication is enabled
3. Verify Email/Password provider is enabled
4. Check browser console for detailed error
5. Try clearing browser data for the extension

### AI Requests Fail

**Problem**: Get errors when trying to use AI features

**Solutions**:
1. Check Firebase Function logs: `npm run functions:logs`
2. Verify function deployed: `firebase functions:list`
3. Check `functions/.env` exists: `ls functions/.env`
4. Verify Gemini API key is correct
5. Make sure you're signed in
6. Check rate limit (10 req/min per user)
7. Verify Gemini API enabled in Google Cloud Console

### "API key not configured"

**Problem**: Function says API key missing

**Solutions**:
1. Verify `functions/.env` exists
2. Check file contents: `cat functions/.env`
3. Make sure it has: `GEMINI_API_KEY=your_key`
4. Redeploy: `firebase deploy --only functions`
5. Check function logs for other errors

### Rate Limit Errors

**Problem**: "Rate limit exceeded" message

**Solutions**:
- Default: 10 requests/minute per user
- Wait 60 seconds and try again
- Or adjust limit in `functions/src/index.ts`:
  ```typescript
  const FREE_TIER_REQUESTS_PER_MINUTE = 10; // Change this
  ```
- Redeploy after changing

### CORS Errors

**Problem**: CORS-related errors in console

**Solutions**:
1. CORS is enabled by default in the function
2. Check Authorization header is being sent
3. Verify Firebase Auth token is valid
4. Check browser console for actual error

### Firebase Deployment Fails

**Problem**: `firebase deploy` fails

**Solutions**:
1. Make sure logged in: `firebase login`
2. Verify `.firebaserc` has correct project ID
3. Check Firebase project exists and you have access
4. Try `firebase use --add` to select project
5. Check function build succeeds: `cd functions && npm run build`

---

## Quick Reference

### Common Commands

```bash
# Setup
npm install                          # Install dependencies
cd functions && npm install && cd .. # Install function deps
firebase login                       # Login to Firebase

# Development
npm run dev                          # Dev build (hot-reload)
npm run build                        # Production build
npm run lint                         # Run linter

# Functions
npm run functions:build              # Build functions
npm run functions:deploy             # Deploy functions
npm run functions:logs               # View logs
firebase functions:list              # List deployed functions

# Deployment
firebase deploy --only functions     # Deploy functions only
firebase deploy                      # Deploy everything

# Debugging
firebase functions:log               # View function logs
firebase functions:log --only generateResponse  # Specific function
```

### File Structure

```
LeetVision/
├── .env                    # Firebase config (YOU CREATE)
├── .firebaserc             # Firebase project ID (UPDATE THIS)
├── firebase.json           # Firebase configuration
├── package.json            # Root dependencies
├── src/                    # Extension source code
│   ├── services/
│   │   ├── firebase.ts     # Firebase auth
│   │   └── gemini.ts       # AI service (calls your backend)
│   └── ...
├── functions/              # Backend Cloud Functions
│   ├── .env                # Gemini API key (YOU CREATE)
│   ├── package.json        # Function dependencies
│   └── src/
│       └── index.ts        # Main function code
└── dist/                   # Built extension (after npm run build)
```

### Environment Variables

**Root `.env`** (for extension):
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**`functions/.env`** (for backend):
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Cost Breakdown (Blaze Plan - Still FREE!)

**Note**: Blaze plan required for Cloud Functions, but has generous free tiers:

| Service | Free Tier | Cost After | Your Usage |
|---------|-----------|------------|------------|
| Gemini API | 1,500 req/day | $0.001/1K tokens | ~100/day |
| Cloud Functions | 2M invocations/month | $0.40/1M | ~3K/month |
| Firebase Auth | Unlimited | Free | Any |
| Firestore | 50K reads/day (1.5M/month) | $0.06/100K | ~100/day |
| **Total** | **$0/month** | Only if you exceed | **$0** ✅ |

**Typical Usage**: With 100 users making 10 requests/day each:
- 1,000 requests/day = 30,000/month
- Well within all free tiers! 🎉

**You'd need 66x more traffic** before any charges occur!

### Rate Limits

**Your Backend**:
- 10 requests per minute per user (configurable)
- Stored in Firestore

**Gemini API**:
- 15 requests per minute (shared across all users)
- 1,500 requests per day (shared across all users)

Monitor usage in Google Cloud Console if you get popular!

---

## 🎉 Success!

If you've made it here and everything works, congratulations! Your LeetVision extension is fully deployed with a secure, free backend.

### What You Built

- ✅ Chrome/Firefox extension with AI features
- ✅ Secure backend that handles API calls
- ✅ User authentication system
- ✅ Rate limiting to prevent abuse
- ✅ All running on free tiers!

### Next Steps

1. **Use it!** Try it on LeetCode, GitHub, or any coding site
2. **Share it** with friends (they just install and sign up)
3. **Customize it** - adjust prompts, add features
4. **Monitor it** - check Firebase console for usage
5. **Publish it** - consider publishing to Chrome Web Store

### Need Help?

- Check the [GitHub Issues](https://github.com/kristong123/LeetVision/issues)
- Review function logs: `firebase functions:log`
- Check browser console for errors
- Verify Firebase Console settings

---

**Made with ❤️ | Free & Open Source**

