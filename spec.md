# LeetVision

## Overview
LeetVision is a browser extension that uses AI to support users when viewing or writing code. It's especially useful for coding practice platforms like LeetCode and NeetCode, helping users fix mistakes without giving away answers. It can also be used for code comprehension on GitHub or any code found on web pages.

## Core Features
- **AI-powered code assistance** with context-aware responses
- **Three distinct modes** for different learning styles
- **Adjustable response length** to control verbosity
- **Page scanning** to detect and analyze code on any webpage
- **Optional authentication** for personalized experience

## User Interface

### Layout
- **Extension Type**: Browser popup (activated by clicking the extension icon)
- **Header**:
  - Title: "LeetVision" (top left)
  - Profile icon button (top right) with dropdown menu:
    - Sign Up / Login
    - Settings

### Settings
- **Theme**: Light/Dark mode toggle (default: Light mode)
- **Display Mode**: Toggle between:
  - Floating window (default) - popup that floats over the page
  - Sidebar mode - creates a new div on the right side, squishing the page content

### Main Interface

#### 1. Mode Selection
Three modes that users can switch between at any time:

- **Learn Mode** (Green)
  - Purpose: Guided learning and hints
  - Use case: Fix mistakes without revealing the solution
  - Quick action button: "Hint"

- **Explain Mode** (Blue)
  - Purpose: Code comprehension
  - Use case: Understand code on the current page
  - Quick action button: "Explain"

- **Improve Mode** (Orange)
  - Purpose: Code optimization suggestions
  - Use case: Get recommendations for improving code
  - Quick action button: "Suggestions"

#### 2. Response Length Control
- **Slider** with labeled endpoints:
  - Minimum: "1 sentence"
  - Maximum: "Paragraph (4-5 sentences)"

#### 3. Chat Interface
- **Chat history**: Displays conversation in a scrollable chat-style interface
- **Text input field**: For custom questions to the AI
- **Quick action button**: Mode-specific button (Hint/Explain/Suggestions) that provides instant response without requiring text input
  - Automatically re-scans page only if code has changed since last scan

#### 4. Code Detection
- **Scan Button**: Triggers scanning of the current page for code blocks
- **Code Selection**: If multiple code sections are detected on a page, user can choose which section to analyze
- **Auto-detect**: If only one code section is found, automatically use it
- **Smart Detection**: Detects all code visible to the user:
  - Code within `<code>` or `<pre>` tags
  - Code editors on platforms like LeetCode, NeetCode, GitHub
  - Any text that appears to be code
- **Change Detection**: Automatically re-scans when code content changes (useful for active coding sessions)

## User Flow
1. User clicks extension icon
2. Popup opens with LeetVision interface
3. User selects desired mode (Learn/Explain/Improve)
4. User adjusts response length preference
5. User either:
   - Clicks "Scan" to analyze code on the page
   - Enters a custom question and submits
   - Clicks the quick action button for instant feedback

## Tech Stack

### Frontend (Extension Popup)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (with `@crxjs/vite-plugin` for Chrome extension support)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit (for managing mode, user preferences, chat history)
- **Extension API**: Chrome Extension Manifest V3 (with WebExtension polyfill for cross-browser support)

### Backend & Services
- **Authentication**: Firebase Authentication (Google, Email/Password)
- **Database**: Firebase Firestore (minimal - only for user authentication)
- **AI Provider**: Google Gemini API
  - Free tier: 15 requests per minute, 1,500 requests per day
  - Gemini 1.5 Flash (fast, cost-effective for this use case)
  - Fallback option: Allow users to provide their own API key for other providers
- **Hosting**: Firebase Hosting (for any web dashboard, if needed)

### Extension Architecture
- **Popup**: React app for the main UI (initial activation)
- **Content Script**: JavaScript injected into web pages to:
  - Scan for code blocks and editors
  - Monitor code changes in real-time
  - Inject floating window or sidebar interface when needed
  - Handle code selection UI when multiple code sections exist
- **Background Service Worker**: Handles API calls, manages state between popup sessions
- **Storage**: Chrome Storage API for local preferences and caching
- **Browser Support**: Chrome, Firefox, Edge, Safari (using WebExtension Polyfill)

### Development Tools
- **Package Manager**: npm or pnpm
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Version Control**: Git

## Technical Implementation Details

### Data Storage & Privacy
- **No conversation history stored**: All chat interactions are session-only
- **No analytics or tracking**: User privacy is prioritized
- **Minimal data collection**: Only authentication credentials stored in Firebase
- **Local storage**: User preferences (theme, display mode, selected mode, response length) stored locally using Chrome Storage API

### Code Change Detection
- Content script uses MutationObserver to watch for DOM changes
- Hash/checksum of code content to detect actual changes vs. DOM mutations
- Debounce mechanism to avoid excessive re-scanning
- Only trigger re-scan when user initiates a request (quick action or custom query)

### AI Integration
- Background service worker handles all API calls to Gemini
- System prompts tailored for each mode:
  - **Learn Mode**: "Act as a patient tutor. Provide hints without giving away the solution..."
  - **Explain Mode**: "Act as a code reviewer explaining code clearly and concisely..."
  - **Improve Mode**: "Act as a senior developer suggesting optimizations and best practices..."
- Response length parameter passed to AI to control verbosity
- Context includes: code content, mode, response length preference, user's custom question (if any)

### Multi-Code Section Handling
- When scan detects multiple code blocks:
  1. Highlight all detected code sections with visual indicators
  2. Show selector UI in the extension interface
  3. User clicks to select desired code section
  4. Selected section becomes the active context for AI requests
- When only one section detected: automatically selected, no user action needed

