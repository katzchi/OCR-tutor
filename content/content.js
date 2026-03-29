(() => {
  let overlay = null;
  let selectionBox = null;
  let startX = 0;
  let startY = 0;
  let isSelecting = false;
  let cardContainer = null;

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'start-selection':
        startSelectionMode();
        break;
      case 'show-loading':
        showLoadingCard(message.word, message.rect);
        break;
      case 'show-card':
        if (message.error) {
          showErrorCard(message.error, message.rect);
        } else {
          showTranslationCard(message.data, message.rect);
        }
        break;
      case 'ocr-error':
        showErrorCard(message.error, message.rect);
        break;
    }
  });

  function startSelectionMode() {
    if (overlay) return; // already active

    overlay = document.createElement('div');
    overlay.id = 'ocr-tutor-overlay';

    selectionBox = document.createElement('div');
    selectionBox.id = 'ocr-tutor-selection';
    overlay.appendChild(selectionBox);

    document.body.appendChild(overlay);

    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
  }

  function onMouseDown(e) {
    e.preventDefault();
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';

    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }

  function onMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const rect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    };

    cleanupOverlay();

    // Ignore tiny selections
    if (rect.width < 10 || rect.height < 10) return;

    // Send capture request to service worker
    chrome.runtime.sendMessage({
      action: 'capture-area',
      rect,
      devicePixelRatio: window.devicePixelRatio
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanupOverlay();
    }
  }

  function cleanupOverlay() {
    if (overlay) {
      overlay.removeEventListener('mousedown', onMouseDown);
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('mouseup', onMouseUp);
      overlay.remove();
      overlay = null;
      selectionBox = null;
    }
    document.removeEventListener('keydown', onKeyDown);
    isSelecting = false;
  }

  // --- Floating Card (Shadow DOM) ---

  function removeExistingCard() {
    if (cardContainer) {
      cardContainer.remove();
      cardContainer = null;
    }
  }

  function createCardHost(rect) {
    removeExistingCard();

    cardContainer = document.createElement('div');
    cardContainer.id = 'ocr-tutor-card-host';
    cardContainer.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: auto;
    `;

    // Position card near the selection area
    const cardTop = rect.y + rect.height + 8;
    const cardLeft = rect.x;
    cardContainer.style.top = Math.min(cardTop, window.innerHeight - 220) + 'px';
    cardContainer.style.left = Math.min(cardLeft, window.innerWidth - 320) + 'px';

    const shadow = cardContainer.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .ocr-card {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
        width: 280px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        color: #333;
        line-height: 1.5;
      }
      .ocr-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .ocr-card-word {
        font-size: 20px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .ocr-card-header-actions {
        display: flex;
        gap: 2px;
        align-items: center;
      }
      .ocr-card-speak {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #999;
        padding: 0 4px;
        line-height: 1;
      }
      .ocr-card-speak:hover {
        color: #333;
      }
      .ocr-card-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        padding: 0 4px;
        line-height: 1;
      }
      .ocr-card-close:hover {
        color: #333;
      }
      .ocr-card-translation {
        font-size: 18px;
        color: #2563eb;
        margin-bottom: 6px;
      }
      .ocr-card-pos {
        display: inline-block;
        background: #f0f4ff;
        color: #4a6cf7;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .ocr-card-example {
        font-size: 13px;
        color: #555;
        font-style: italic;
        margin-bottom: 4px;
      }
      .ocr-card-example-zh {
        font-size: 13px;
        color: #777;
      }
      .ocr-card-footer {
        margin-top: 10px;
        display: flex;
        justify-content: flex-end;
      }
      .ocr-card-wordlist-btn {
        background: none;
        border: 1px solid #2563eb;
        color: #2563eb;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
      }
      .ocr-card-wordlist-btn:hover {
        background: #eff6ff;
      }
      .ocr-card-error {
        color: #dc2626;
        font-size: 14px;
      }
      .ocr-card-loading {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e0e0e0;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    shadow.appendChild(style);

    document.body.appendChild(cardContainer);
    return shadow;
  }

  function showLoadingCard(word, rect) {
    const shadow = createCardHost(rect);
    const card = document.createElement('div');
    card.className = 'ocr-card';
    card.innerHTML = `
      <div class="ocr-card-header">
        <span class="ocr-card-word">${escapeHTML(word)}</span>
        <button class="ocr-card-close">&times;</button>
      </div>
      <div class="ocr-card-loading">
        <div class="spinner"></div>
        <span style="font-size:14px;color:#777;">Translating...</span>
      </div>
    `;
    card.querySelector('.ocr-card-close').addEventListener('click', removeExistingCard);
    shadow.appendChild(card);
  }

  function showTranslationCard(data, rect) {
    const shadow = createCardHost(rect);
    const card = document.createElement('div');
    card.className = 'ocr-card';
    card.innerHTML = `
      <div class="ocr-card-header">
        <span class="ocr-card-word">${escapeHTML(data.word)}</span>
        <div class="ocr-card-header-actions">
          <button class="ocr-card-speak" title="Pronounce">🔊</button>
          <button class="ocr-card-close">&times;</button>
        </div>
      </div>
      <div class="ocr-card-translation">${escapeHTML(data.translation)}</div>
      <span class="ocr-card-pos">${escapeHTML(data.partOfSpeech)}</span>
      <div class="ocr-card-example">${escapeHTML(data.exampleEn)}</div>
      <div class="ocr-card-example-zh">${escapeHTML(data.exampleZh)}</div>
      <div class="ocr-card-footer">
        <button class="ocr-card-wordlist-btn">View Word List</button>
      </div>
    `;
    card.querySelector('.ocr-card-close').addEventListener('click', removeExistingCard);
    card.querySelector('.ocr-card-speak').addEventListener('click', () => {
      if (!data.word) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(data.word);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    });
    card.querySelector('.ocr-card-wordlist-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'open-wordlist' });
    });
    shadow.appendChild(card);
  }

  function showErrorCard(errorMsg, rect) {
    const shadow = createCardHost(rect || { x: 100, y: 100, width: 0, height: 0 });
    const card = document.createElement('div');
    card.className = 'ocr-card';
    card.innerHTML = `
      <div class="ocr-card-header">
        <span class="ocr-card-word">OCR Tutor</span>
        <button class="ocr-card-close">&times;</button>
      </div>
      <div class="ocr-card-error">${escapeHTML(errorMsg)}</div>
    `;
    card.querySelector('.ocr-card-close').addEventListener('click', removeExistingCard);
    shadow.appendChild(card);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
