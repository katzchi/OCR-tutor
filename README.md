# OCR Tutor

A Chrome Extension that captures English words from any webpage using screen region selection + OCR, translates them with AI, and maintains a persistent vocabulary list.

## Features

- **OCR Screen Capture** — Press `Alt+Q` or right-click to activate selection mode, then drag to draw a rectangle over English text. Tesseract.js OCR extracts the word directly in-browser.
- **AI Translation** — Automatically generates Chinese translation, part of speech, English example sentence, and Chinese example translation. Supports three AI providers:
  - OpenAI (GPT-4o-mini)
  - Anthropic Claude (Sonnet)
  - Google Gemini (2.5 Flash)
- **Floating Card** — Translation results appear in a floating card near your selection area.
- **Word List** — All saved words are displayed in a responsive card grid layout, with sorting (by date, alphabetical, random) and pin-to-top functionality.
- **Persistent Storage** — Words are stored locally in the browser via `chrome.storage.local`.

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. Click the extension icon → **Settings** to choose your AI provider and enter your API key

## Usage

| Action | Method |
|--------|--------|
| Activate OCR | `Alt+Q` or right-click → "OCR Tutor - Select Word" |
| Cancel selection | `Esc` |
| View word list | Extension popup → **Word List** |
| Change AI provider / API key | Extension popup → **Settings** |

## Project Structure

```
├── manifest.json              # Chrome Extension manifest (MV3)
├── background/
│   └── service-worker.js      # Central orchestrator
├── content/
│   ├── content.js             # Selection overlay + floating card (Shadow DOM)
│   └── content.css
├── offscreen/
│   ├── offscreen.html         # Offscreen document for Tesseract.js
│   └── offscreen.js           # Canvas crop + OCR
├── popup/
│   ├── popup.html             # Two buttons: Word List + Settings
│   ├── popup.js
│   └── popup.css
├── pages/
│   ├── wordlist.html/js/css   # Card grid word list with sorting
│   └── settings.html/js/css   # AI provider + API key config
├── lib/
│   ├── ai-providers.js        # OpenAI / Claude / Gemini API abstraction
│   ├── tesseract.min.js       # Tesseract.js OCR engine
│   ├── worker.min.js          # Tesseract.js web worker
│   ├── tesseract-core-simd-lstm.wasm.js  # WASM core
│   └── eng.traineddata.gz     # English language data
└── utils/
    └── storage.js             # chrome.storage.local CRUD helpers
```

## Tech Stack

- **Chrome Extension Manifest V3**
- **Tesseract.js 5** — Client-side OCR (no server needed)
- **Shadow DOM** — Floating card style isolation from host page
- **Offscreen Document** — Runs Tesseract.js WASM in a DOM context (required by MV3)

## License

MIT
