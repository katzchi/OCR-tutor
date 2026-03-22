document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings || {
    aiProvider: 'openai',
    apiKeys: { openai: '', claude: '', gemini: '' }
  };

  // Set provider radio
  const radio = document.querySelector(`input[name="provider"][value="${settings.aiProvider}"]`);
  if (radio) radio.checked = true;

  // Set API keys
  document.getElementById('key-openai').value = settings.apiKeys.openai || '';
  document.getElementById('key-claude').value = settings.apiKeys.claude || '';
  document.getElementById('key-gemini').value = settings.apiKeys.gemini || '';

  // Toggle visibility buttons
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Save button
  document.getElementById('btn-save').addEventListener('click', async () => {
    const provider = document.querySelector('input[name="provider"]:checked')?.value || 'openai';
    const apiKeys = {
      openai: document.getElementById('key-openai').value.trim(),
      claude: document.getElementById('key-claude').value.trim(),
      gemini: document.getElementById('key-gemini').value.trim()
    };

    // Validate selected provider has a key
    if (!apiKeys[provider]) {
      showStatus('Please enter the API key for the selected provider.', 'error');
      return;
    }

    await chrome.storage.local.set({
      settings: { aiProvider: provider, apiKeys }
    });

    showStatus('Settings saved!', 'success');
  });
});

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'status-msg';
  }, 3000);
}
