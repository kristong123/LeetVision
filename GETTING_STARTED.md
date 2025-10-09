# Getting Started with LeetVision

## Quick Start Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

See [SETUP.md](./SETUP.md) for detailed instructions on getting API keys.

### 3. Build the Extension

For development (with hot reload):
```bash
npm run dev
```

For production:
```bash
npm run build
```

### 4. Load in Browser

#### Chrome/Edge:
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/` folder

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the `dist/` folder

### 5. Configure the Extension

1. Click the LeetVision extension icon
2. Click the profile icon → Settings
3. Add your Gemini API key (get one for free from [Google AI Studio](https://aistudio.google.com/))
4. Choose your preferred theme and display mode

## First Use

1. Navigate to any page with code (e.g., LeetCode, GitHub, or any coding tutorial)
2. Click the LeetVision extension icon
3. Click "Scan Page for Code"
4. Select a mode (Learn, Explain, or Improve)
5. Ask a question or use the quick action button

## Project Structure

```
LeetVision/
├── src/
│   ├── components/          # React UI components
│   ├── redux/              # State management
│   ├── services/           # API integrations (Firebase, Gemini)
│   ├── utils/              # Helper functions
│   ├── content/            # Content script for page scanning
│   ├── background/         # Background service worker
│   ├── types/              # TypeScript definitions
│   └── styles/             # Global styles
├── public/                 # Static assets
│   └── icons/             # Extension icons (placeholders - replace these!)
├── dist/                   # Build output (created by npm run build)
└── [config files]          # vite.config.ts, tsconfig.json, etc.
```

## Important Notes

### Icons
The current icons in `public/icons/` are minimal placeholders. Before publishing:
- Create proper 16x16, 32x32, 48x48, and 128x128 PNG icons
- Use the brand colors and a recognizable design
- See `public/icons/README.md` for guidelines

### API Keys
- **Gemini API**: Free tier provides 15 requests/min and 1,500/day
- **Firebase**: Only needed if you want user authentication
- Users can also provide their own API keys in settings

### Privacy
- No conversation history is stored
- Only authentication data goes to Firebase (if used)
- All preferences stored locally in browser storage

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Delete `node_modules` and reinstall if needed
- Clear the `dist/` folder and rebuild

### Extension Not Loading
- Make sure you built the project first (`npm run build`)
- Check browser console for errors
- Verify the `dist/` folder contains `manifest.json`

### API Errors
- Verify your Gemini API key is correct
- Check that you've enabled the Generative Language API in Google Cloud Console
- Monitor your API usage to ensure you haven't hit rate limits

### Code Not Detected
- Make sure the page has fully loaded
- Try clicking "Scan Page for Code" again
- Check browser console for errors in the content script

## Need Help?

- Check [SETUP.md](./SETUP.md) for API setup instructions
- Read [README.md](./README.md) for project overview
- Check [spec.md](./spec.md) for technical specifications
- Open an issue on GitHub

## Next Steps

1. Replace placeholder icons with proper branding
2. Test on various coding platforms (LeetCode, CodePen, GitHub, etc.)
3. Customize AI prompts in `src/services/gemini.ts` if needed
4. Add additional features or modes as desired

Happy coding! 🚀

