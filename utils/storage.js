const StorageUtils = {
  // ---- Words: sync (cross-device) ----
  async getWords() {
    const result = await chrome.storage.sync.get('words');
    return result.words || [];
  },

  async saveWord(entry) {
    const words = await this.getWords();
    words.push(entry);
    await chrome.storage.sync.set({ words });
  },

  async deleteWord(id) {
    const words = await this.getWords();
    const filtered = words.filter(w => w.id !== id);
    await chrome.storage.sync.set({ words: filtered });
  },

  async togglePin(id) {
    const words = await this.getWords();
    const word = words.find(w => w.id === id);
    if (word) {
      word.pinned = !word.pinned;
      await chrome.storage.sync.set({ words });
    }
  },

  /**
   * One-time migration: copy local.words -> sync.words
   * only when sync.words is empty and local.words is non-empty.
   * Safe to run multiple times; does not delete local backup.
   */
  async migrateWordsLocalToSync() {
    const [syncRes, localRes] = await Promise.all([
      chrome.storage.sync.get('words'),
      chrome.storage.local.get('words')
    ]);

    const syncWords = syncRes.words || [];
    const localWords = localRes.words || [];

    if (syncWords.length > 0) return { migrated: false, reason: 'sync-not-empty' };
    if (localWords.length === 0) return { migrated: false, reason: 'local-empty' };

    await chrome.storage.sync.set({ words: localWords });
    return { migrated: true, count: localWords.length };
  },

  // ---- Settings: local (do NOT sync API keys) ----
  async getSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || {
      aiProvider: 'openai',
      apiKeys: { openai: '', claude: '', gemini: '' }
    };
  },

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }
};

if (typeof module !== 'undefined') {
  module.exports = StorageUtils;
}
