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
- **Authentication**: Firebase Auth
- **AI Provider**: Google Gemini API (Free tier: 15 req/min, 1,500 req/day)
- **Browser Support**: Chrome, Firefox, Edge, Safari

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A modern browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kristong123/LeetVision.git
   cd LeetVision
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Create a `.env` file (see `.env.example` for template):
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to `.env`:
   - Follow the instructions in [SETUP.md](./SETUP.md) to get your Firebase and Gemini API keys

5. Build the extension:
   ```bash
   npm run build
   # or for development with hot reload
   npm run dev
   ```

6. Load the extension in your browser:
   - **Chrome/Edge**: 
     1. Navigate to `chrome://extensions/`
     2. Enable "Developer mode"
     3. Click "Load unpacked"
     4. Select the `dist/` folder
   
   - **Firefox**:
     1. Navigate to `about:debugging#/runtime/this-firefox`
     2. Click "Load Temporary Add-on"
     3. Select the `manifest.json` file in the `dist/` folder

## Usage

1. **Scan Code**: Click the extension icon and press "Scan Page for Code"
2. **Select Mode**: Choose Learn, Explain, or Improve mode
3. **Adjust Response Length**: Use the slider to control verbosity
4. **Ask Questions**: Type custom questions or use quick action buttons
5. **Get Insights**: Receive AI-powered responses tailored to your chosen mode

## Configuration

See [SETUP.md](./SETUP.md) for detailed setup instructions including:
- Getting a free Google Gemini API key
- Setting up Firebase authentication
- Browser-specific installation steps
- Troubleshooting tips

## Project Structure

```
LeetVision/
├── src/
│   ├── components/          # React components
│   ├── redux/              # Redux store and slices
│   ├── services/           # Firebase and Gemini API services
│   ├── utils/              # Utility functions
│   ├── content/            # Content script
│   ├── background/         # Background service worker
│   ├── types/              # TypeScript type definitions
│   ├── styles/             # Global styles
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── manifest.json       # Extension manifest
├── public/                 # Static assets
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
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

