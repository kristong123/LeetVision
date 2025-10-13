# LeetVision

AI-powered browser extension for code assistance and learning. Perfect for coding practice platforms like LeetCode and NeetCode, or any webpage containing code.

## Features

- 🎓 **Learn Mode**: Get hints and guidance without spoiling the solution
- 📖 **Explain Mode**: Understand code with clear, concise explanations
- ⚡ **Improve Mode**: Receive optimization suggestions and best practices
- 🔍 **Smart Code Detection**: Automatically finds and analyzes code on any webpage
- 💬 **Chat Interface**: Interactive conversation with AI about your code
- 🎨 **Dark Mode**: Easy on the eyes during late-night coding sessions
- 🔒 **Privacy First**: No conversation history stored, minimal data collection

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite with Chrome Extension plugin
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Backend**: Firebase Functions (Cloud Functions)
- **Authentication**: Firebase Auth
- **Database**: Firestore (for rate limiting)
- **AI Provider**: Google Gemini API (via secure backend)
- **Browser Support**: Chrome, Firefox, Edge, Safari

### Architecture

```
User → Extension → Firebase Function → Gemini API
         ↓
   Firebase Auth ← Rate Limiting (Firestore)
```

**Key Benefits**:
- ✅ Users don't need their own API keys
- ✅ API keys secured on backend
- ✅ Built-in rate limiting (10 req/min per user)
- ✅ 100% free for moderate usage

## Getting Started

**📖 For complete setup instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kristong123/LeetVision.git
   cd LeetVision
   ```

2. **Setup Firebase & Deploy Backend**:
   - Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for:
     - Firebase project setup
     - Environment configuration
     - Backend deployment

3. **Build & Install Extension**:
   ```bash
   npm run build
   ```
   
   Then load `dist/` folder in your browser:
   - **Chrome**: `chrome://extensions/` → "Load unpacked"
   - **Firefox**: `about:debugging` → "Load Temporary Add-on"

### For End Users

If someone has already deployed LeetVision:
1. Install the extension from Chrome Web Store (or load unpacked)
2. Click extension icon
3. Sign up with email/password
4. Start using! No API keys needed 🎉

## Usage

1. **Scan Code**: Click the extension icon and press "Scan Page for Code"
2. **Select Mode**: Choose Learn, Explain, or Improve mode
3. **Adjust Response Length**: Use the slider to control verbosity
4. **Ask Questions**: Type custom questions or use quick action buttons
5. **Get Insights**: Receive AI-powered responses tailored to your chosen mode

## Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete setup & deployment guide
- **[SETUP.md](./SETUP.md)** - Quick reference
- **[spec.md](./spec.md)** - Project specification

### Key Documentation Topics

- Firebase project setup
- Environment configuration
- Backend deployment (Firebase Functions)
- Extension building and installation
- Testing checklist
- Troubleshooting guide
- Cost breakdown (free tier)

## Project Structure

```
LeetVision/
├── src/                    # Extension source code
│   ├── components/         # React components
│   ├── redux/             # Redux store and slices
│   ├── services/          # Firebase and API services
│   ├── utils/             # Utility functions
│   ├── content/           # Content script (injected into pages)
│   ├── background/        # Background service worker
│   └── ...
├── functions/             # Firebase Cloud Functions (Backend)
│   ├── src/
│   │   └── index.ts      # Main function (handles AI requests)
│   ├── .env              # Gemini API key (create this)
│   └── package.json
├── .env                   # Firebase config (create this)
├── firebase.json          # Firebase configuration
├── dist/                  # Built extension (after npm run build)
└── DEPLOYMENT_GUIDE.md    # Complete setup guide
```

## Development

```bash
# Run development build with hot reload
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Format code
npm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/kristong123/LeetVision/issues).

