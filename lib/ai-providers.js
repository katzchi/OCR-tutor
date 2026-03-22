function buildPrompt(word) {
  return `You are an English-Chinese dictionary assistant. Given the English word "${word}", respond with a JSON object containing:
- "word": the original English word (corrected if there was a typo)
- "translation": the Chinese translation (Traditional Chinese)
- "partOfSpeech": the part of speech in Traditional Chinese (e.g. "名詞", "動詞", "形容詞")
- "exampleEn": a natural English example sentence using this word
- "exampleZh": the Traditional Chinese translation of that example sentence
Respond ONLY with the JSON object, no other text.`;
}

async function translateWord(word, provider, apiKey) {
  const prompt = buildPrompt(word);

  switch (provider) {
    case 'openai':
      return await callOpenAI(prompt, apiKey);
    case 'claude':
      return await callClaude(prompt, apiKey);
    case 'gemini':
      return await callGemini(prompt, apiKey);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callClaude(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}

async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}
