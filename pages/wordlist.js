let currentSort = 'date';
let cachedWords = [];

document.addEventListener('DOMContentLoaded', () => {
  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderWords(cachedWords);
  });

  loadWords();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.words) {
      cachedWords = changes.words.newValue || [];
      renderWords(cachedWords);
    }
  });
});

async function loadWords() {
  const result = await chrome.storage.local.get('words');
  cachedWords = result.words || [];
  renderWords(cachedWords);
}

function renderWords(words) {
  const grid = document.getElementById('word-grid');
  const emptyState = document.getElementById('empty-state');
  const wordCount = document.getElementById('word-count');

  wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;

  if (words.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  // Separate pinned and unpinned
  const pinned = words.filter(w => w.pinned);
  const unpinned = words.filter(w => !w.pinned);

  // Sort only unpinned cards
  sortWords(pinned);
  sortWords(unpinned);

  const sorted = [...pinned, ...unpinned];

  grid.innerHTML = sorted.map(word => `
    <div class="word-card ${word.pinned ? 'pinned' : ''}" data-id="${word.id}">
      <div class="card-top">
        <div class="card-word">${escapeHTML(word.word)}</div>
        <div class="card-actions">
          <button class="btn-speak" title="Pronounce">🔊</button>
          <button class="btn-pin" title="${word.pinned ? 'Unpin' : 'Pin to top'}">${word.pinned ? '📌' : '📍'}</button>
          <button class="btn-delete" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="card-translation">${escapeHTML(word.translation)}</div>
      <span class="card-pos">${escapeHTML(word.partOfSpeech)}</span>
      <div class="card-example">${escapeHTML(word.exampleEn)}</div>
      <div class="card-example-zh">${escapeHTML(word.exampleZh)}</div>
      <div class="card-date">${new Date(word.createdAt).toLocaleDateString('zh-TW')}</div>
    </div>
  `).join('');

  // Attach event listeners
  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.word-card');
      const id = card.dataset.id;
      if (confirm('Are you sure you want to delete this word?')) {
        const result = await chrome.storage.local.get('words');
        const words = (result.words || []).filter(w => w.id !== id);
        await chrome.storage.local.set({ words });
      }
    });
  });

  grid.querySelectorAll('.btn-pin').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.word-card');
      const id = card.dataset.id;
      const result = await chrome.storage.local.get('words');
      const words = result.words || [];
      const word = words.find(w => w.id === id);
      if (word) {
        word.pinned = !word.pinned;
        await chrome.storage.local.set({ words });
      }
    });
  });

  grid.querySelectorAll('.btn-speak').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.word-card');
      const id = card.dataset.id;
      const word = cachedWords.find(w => w.id === id);
      if (!word || !word.word) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word.word);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    });
  });
}

function sortWords(arr) {
  switch (currentSort) {
    case 'date':
      arr.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'alpha':
      arr.sort((a, b) => a.word.localeCompare(b.word));
      break;
    case 'random':
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      break;
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
