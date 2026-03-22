const StorageUtils = {
  async getWords() {
    const result = await chrome.storage.local.get('words');
    return result.words || [];
  },

  async saveWord(entry) {
    const words = await this.getWords();
    words.push(entry);
    await chrome.storage.local.set({ words });
  },

  async deleteWord(id) {
    const words = await this.getWords();
    const filtered = words.filter(w => w.id !== id);
    await chrome.storage.local.set({ words: filtered });
  },

  async togglePin(id) {
    const words = await this.getWords();
    const word = words.find(w => w.id === id);
    if (word) {
      word.pinned = !word.pinned;
      await chrome.storage.local.set({ words });
    }
  },

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
