# 🐱 CatAI - Explain Everything with Tiny Cats

CatAI is a delightful web application that explains concepts using cat metaphors and illustrations. It's a fun way to learn new things with the help of adorable cat companions!

## ✨ Features

- **Interactive Chat Interface**: Ask questions and get cat-themed explanations
- **Multiple Cat Personalities**: Choose from various cat personalities (playful, lazy, wise, curious, sassy, scholarly, poetic)
- **Theme Customization**: Select from different UI themes to personalize your experience
- **Conversation Management**: Save, rename, export, and import your conversations
- **Multilingual Support**: Works with both English and Vietnamese
- **Keyboard Shortcuts**: Navigate the app efficiently with keyboard shortcuts
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling & Resilience**: Graceful error recovery and fallback mechanisms
- **Performance Optimization**: Caching for frequently asked questions and request throttling

## 🚀 Technical Features

- **Google's Gemini 2.0 Flash API**: Powers the AI responses and image generation
- **Error Handling Service**: Dedicated error handling with specific error types and user-friendly messages
- **Caching Service**: Stores frequently asked questions and responses for improved performance
- **Language Detection**: Enhanced language detection using the 'franc' library
- **Security**: Uses DOMPurify to sanitize user input and AI-generated content

## 🛠️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A Google API key with access to Gemini 2.0 Flash

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/giangvt/CatAI.git
   cd CatAI
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Google API key:
   ```
   VITE_GOOGLE_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## 🎮 Keyboard Shortcuts

- `/`: Focus the input field
- `s`: Send message
- `n`: New conversation
- `c`: Clear current conversation
- `p`: Toggle personality selector
- `t`: Toggle theme selector
- `Shift + ?`: Show keyboard shortcuts help
- `Esc`: Close dialogs

## 🎨 Available Themes

- Default
- Pink
- Dark
- Blue
- Green

## 🐱 Cat Personalities

- **Playful**: A fun, energetic kitten who loves to play
- **Lazy**: A sleepy cat who prefers naps and relaxation
- **Wise**: A calm, thoughtful professor cat with deep insights
- **Curious**: An adventurous cat who loves exploring new ideas
- **Sassy**: A witty, slightly sarcastic aristocat with attitude
- **Scholarly**: An academic cat who cites sources and loves details
- **Poetic**: A romantic, artistic cat who speaks in beautiful imagery

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Created by Vu Truong Giang
- Powered by Google's Gemini 2.0 Flash API
- Icons and illustrations created with love for cats
