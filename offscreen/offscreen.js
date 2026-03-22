let worker = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'do-ocr') {
    console.log('[OCR Tutor] Offscreen received do-ocr, rect:', message.rect);
    performOCR(message.dataUrl, message.rect, message.devicePixelRatio, message.tabId);
  }
});

async function performOCR(dataUrl, rect, dpr, tabId) {
  try {
    console.log('[OCR Tutor] Starting crop, dpr:', dpr);
    const croppedDataUrl = await cropImage(dataUrl, rect, dpr);
    console.log('[OCR Tutor] Crop done, data length:', croppedDataUrl.length);

    if (!worker) {
      console.log('[OCR Tutor] Creating Tesseract worker...');
      worker = await Tesseract.createWorker('eng', 1, {
        workerPath: chrome.runtime.getURL('lib/worker.min.js'),
        corePath: chrome.runtime.getURL('lib/tesseract-core-simd-lstm.wasm.js'),
        langPath: chrome.runtime.getURL('lib/'),
        workerBlobURL: false,
      });
      console.log('[OCR Tutor] Tesseract worker created successfully');
    }

    console.log('[OCR Tutor] Running recognize...');
    const result = await worker.recognize(croppedDataUrl);
    const text = result.data.text.trim();
    console.log('[OCR Tutor] OCR result text:', JSON.stringify(text));

    chrome.runtime.sendMessage({
      action: 'ocr-result',
      text,
      tabId,
      rect
    });
  } catch (err) {
    console.error('[OCR Tutor] OCR failed:', err.message, err.stack);
    chrome.runtime.sendMessage({
      action: 'ocr-result',
      text: '',
      tabId,
      rect
    });
  }
}

function cropImage(dataUrl, rect, dpr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const sx = Math.round(rect.x * dpr);
      const sy = Math.round(rect.y * dpr);
      const sw = Math.round(rect.width * dpr);
      const sh = Math.round(rect.height * dpr);

      console.log('[OCR Tutor] Image size:', img.width, 'x', img.height,
        '| Crop:', sx, sy, sw, sh);

      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = dataUrl;
  });
}
