# LeetVision Setup Instructions

## Getting Your Google Gemini API Key

LeetVision uses Google's Gemini API for AI-powered code assistance. The free tier provides 15 requests per minute and 1,500 requests per day, which is perfect for this extension.

### Step 1: Access Google AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account

### Step 2: Get Your API Key

1. In the left sidebar, click on **"Get API key"**
2. Click **"Create API key"**
3. Choose an existing Google Cloud project or create a new one
4. Your API key will be generated and displayed
5. **Important**: Copy this key immediately and store it securely

### Step 3: Enable the Gemini API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Generative Language API" or "Gemini API"
5. Click on it and press **Enable**

### Step 4: Add API Key to LeetVision

1. Install the LeetVision extension in your browser
2. Click the extension icon
3. Click the profile icon in the top right
4. Go to **Settings**
5. Enter your Gemini API key in the designated field
6. Save

## Firebase Setup (For Authentication)

If you're running this project locally or contributing, you'll need to set up Firebase:

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., "LeetVision")
4. Follow the setup wizard

### Step 2: Enable Authentication

1. In your Firebase project, go to **Build** > **Authentication**
2. Click **"Get started"**
3. Enable the following sign-in methods:
   - **Email/Password**
   - **Google** (optional but recommended)

### Step 3: Register Your Web App

1. In Firebase project settings, click **"Add app"** and select **Web** (</> icon)
2. Register your app with a nickname (e.g., "LeetVision Extension")
3. Copy the Firebase configuration object

### Step 4: Add Firebase Config to Project

1. Create a `.env` file in the project root
2. Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Step 5: Set Up Firestore (Optional)

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a location closest to your users

**Note**: Currently, LeetVision only stores authentication data. Firestore setup is optional for future features.

## Installation & Development

### Prerequisites

- Node.js 18+ and npm/pnpm installed
- A modern browser (Chrome, Firefox, Edge, or Safari)

### Install Dependencies

```bash
npm install
# or
pnpm install
```

### Development Build

```bash
npm run dev
# or
pnpm dev
```

This will create a development build in the `dist/` folder with hot-reload enabled.

### Production Build

```bash
npm run build
# or
pnpm build
```

### Load Extension in Browser

#### Chrome/Edge:
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `dist/` folder from the project

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select the `manifest.json` file from the `dist/` folder

#### Safari:
1. Enable Safari's developer features in Preferences > Advanced
2. Use Safari Web Extension Converter to convert the extension
3. Follow Safari's extension loading process

## Troubleshooting

### API Key Issues
- **"API key not valid"**: Make sure you've enabled the Generative Language API in Google Cloud Console
- **"Quota exceeded"**: You've hit the free tier limits (15 req/min or 1,500 req/day). Wait or upgrade to paid tier.

### Extension Not Loading
- Make sure you've run the build command first
- Check that all dependencies are installed
- Look for errors in the browser's extension console

### Authentication Issues
- Verify your Firebase configuration in `.env`
- Check that Authentication is enabled in Firebase Console
- Ensure your domain is authorized in Firebase settings

## Rate Limits & Quotas

### Gemini Free Tier
- **15 requests per minute** (RPM)
- **1,500 requests per day** (RPD)
- If you need more, consider upgrading to a paid plan

### Best Practices
- The extension caches responses when appropriate
- Code change detection prevents unnecessary API calls
- Consider using shorter response lengths for faster responses and lower token usage

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/yourusername/LeetVision).

