importScripts('../utils/storage.js', '../lib/ai-providers.js');

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ocr-tutor-activate',
    title: 'OCR Tutor - Select Word',
    contexts: ['page', 'image']
  });
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'activate-ocr') {
    activateOCR();
  }
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ocr-tutor-activate') {
    activateOCR(tab);
  }
});

// Handle messages from content script and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OCR Tutor SW] Received message:', message.action);

  if (message.action === 'capture-area') {
    handleCaptureArea(message.rect, message.devicePixelRatio, sender.tab.id);
    return true;
  }
  if (message.action === 'ocr-result') {
    console.log('[OCR Tutor SW] OCR result received, text:', JSON.stringify(message.text));
    handleOCRResult(message.text, message.tabId, message.rect);
    return true;
  }
  return false;
});

async function activateOCR(tab) {
  try {
    const targetTab = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!targetTab?.id) return;
    chrome.tabs.sendMessage(targetTab.id, { action: 'start-selection' });
  } catch (err) {
    console.error('[OCR Tutor SW] Failed to activate OCR:', err);
  }
}

async function handleCaptureArea(rect, devicePixelRatio, tabId) {
  try {
    console.log('[OCR Tutor SW] Capturing visible tab...');
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    console.log('[OCR Tutor SW] Captured, dataUrl length:', dataUrl.length);

    await ensureOffscreenDocument();
    console.log('[OCR Tutor SW] Offscreen document ready, sending do-ocr');

    chrome.runtime.sendMessage({
      action: 'do-ocr',
      dataUrl,
      rect,
      devicePixelRatio,
      tabId
    });
  } catch (err) {
    console.error('[OCR Tutor SW] Failed to capture area:', err);
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-error',
      error: 'Failed to capture screen area: ' + err.message
    });
  }
}

async function handleOCRResult(text, tabId, rect) {
  if (!text || text.trim().length === 0) {
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-error',
      error: 'No text detected in selected area.'
    });
    return;
  }

  const words = text
    .split(/[^a-zA-Z]+/)
    .filter(w => w.length >= 2)
    .map(w => w.toLowerCase());

  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
    'being', 'do', 'does', 'did', 'has', 'have', 'had', 'it', 'its',
    'in', 'on', 'at', 'to', 'of', 'or', 'and', 'but', 'if', 'so',
    'no', 'not', 'he', 'she', 'we', 'my', 'me', 'by', 'as', 'up'
  ]);

  const significantWords = words.filter(w => !stopWords.has(w));
  const word = significantWords.length > 0 ? significantWords[0] : words[0];

  if (!word) {
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-error',
      error: 'No English word detected.'
    });
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    action: 'show-loading',
    word,
    rect
  });

  try {
    const settings = await StorageUtils.getSettings();
    if (!settings.apiKeys[settings.aiProvider]) {
      chrome.tabs.sendMessage(tabId, {
        action: 'show-card',
        error: `Please set your ${settings.aiProvider.toUpperCase()} API key in settings.`,
        rect
      });
      return;
    }

    const result = await translateWord(word, settings.aiProvider, settings.apiKeys[settings.aiProvider]);

    const entry = {
      id: crypto.randomUUID(),
      word: result.word || word,
      translation: result.translation,
      partOfSpeech: result.partOfSpeech,
      exampleEn: result.exampleEn,
      exampleZh: result.exampleZh,
      pinned: false,
      createdAt: Date.now()
    };
    await StorageUtils.saveWord(entry);

    chrome.tabs.sendMessage(tabId, {
      action: 'show-card',
      data: entry,
      rect
    });
  } catch (err) {
    console.error('[OCR Tutor SW] AI translation failed:', err);
    chrome.tabs.sendMessage(tabId, {
      action: 'show-card',
      error: `Translation failed: ${err.message}`,
      rect
    });
  }
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Tesseract.js OCR requires DOM and WebAssembly context'
  });
}
