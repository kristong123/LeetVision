# LeetVision Setup

**👉 For complete setup and deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Google account

### 2. Configuration Files Needed

Create these two `.env` files:

**Root `.env`** (Firebase config):
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

**`functions/.env`** (Gemini API key):
```env
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Upgrade to Blaze Plan

**Required**: Firebase Functions needs Blaze plan (still FREE for moderate usage!)

1. Go to Firebase Console → Usage and billing
2. Upgrade to Blaze plan
3. Add billing info (won't be charged within free tier)

### 4. Deploy

```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Login and deploy
firebase login
firebase deploy --only functions

# Build extension
npm run build

# Load dist/ folder in browser
```

---

## 📚 Full Documentation

For detailed step-by-step instructions, troubleshooting, and more, see:

### **[📖 DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

This comprehensive guide includes:
- Complete Firebase setup
- Gemini API configuration
- Deployment instructions
- Testing checklist
- Troubleshooting guide
- Quick reference commands

---

## Architecture Overview

```
User → Browser Extension → Firebase Function → Gemini API
         ↓
   Firebase Auth (required)
         ↓
   Rate Limiting (Firestore)
```

### Key Features
- ✅ **Secure**: API keys stored on server, never in client
- ✅ **Free**: 100% free tier for moderate usage
- ✅ **Rate Limited**: 10 requests/min per user
- ✅ **Authenticated**: Firebase Auth required

---

## Quick Commands

```bash
# Development
npm run dev              # Dev build with hot-reload
npm run build            # Production build

# Functions
npm run functions:deploy # Deploy backend
npm run functions:logs   # View logs

# Debugging
firebase functions:log   # Check function logs
```

---

## Need Help?

1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions
2. Review function logs: `firebase functions:log`
3. Check browser console for errors
4. Open an issue on GitHub

---

## What's Different from Other Extensions?

Most browser extensions that use AI require users to provide their own API keys. LeetVision is different:

- **Users**: Just install, sign up, and use. No API keys needed! 🎉
- **You**: Deploy once with your API key, serve everyone
- **Cost**: Free tier covers ~3,000 requests/month
- **Security**: API keys secure on your backend

This provides a much better user experience!

---

**For complete documentation, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
