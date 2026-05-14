import { courseChatPrompt, courseGenerationPrompt, parseGeneratedCourse } from './gemini';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';

function browserGeminiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('gemini_api_key')
    || process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY
    || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    || '';
}

function browserOpenRouterKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('openrouter_api_key')
    || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    || '';
}

function cleanAiError(message = '') {
  const m = String(message);
  if (/leaked|api key not valid|API_KEY_INVALID|permission|denied|PERMISSION_DENIED/i.test(m)) {
    return 'This API key is blocked or invalid. Paste a fresh key.';
  }
  if (/quota|RESOURCE_EXHAUSTED|rate_limit/i.test(m)) {
    return 'AI quota is exhausted. Use another key or try later.';
  }
  if (/missing|localStorage\.gemini_api_key|localStorage\.openrouter_api_key|NEXT_PUBLIC/i.test(m)) {
    return 'AI is not configured. Add a Gemini or OpenRouter API key first.';
  }
  if (/404|not found|models\//i.test(m)) {
    return 'The selected AI model is unavailable. Try another model.';
  }
  if (/network|fetch/i.test(m)) {
    return 'AI request failed. Check your connection and try again.';
  }
  return 'AI request failed. Try again.';
}

class AiClientError extends Error {
  constructor(message) {
    super(cleanAiError(message));
    this.name = 'AiClientError';
  }
}

async function directGemini(prompt, temperature = 0.4) {
  const key = browserGeminiKey();
  const model = localStorage.getItem('gemini_model') || process.env.NEXT_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL;
  if (!key) throw new AiClientError('missing key');

  const request = async (modelName) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  });

  let res = await request(model);
  if (!localStorage.getItem('gemini_model') && res.status === 404) res = await request(FALLBACK_MODEL);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiClientError(data?.error?.message || 'Gemini request failed');
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

async function directOpenRouter(prompt, temperature = 0.4) {
  const key = browserOpenRouterKey();
  if (!key) throw new Error('OpenRouter API key missing');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://conductor.ryan', // Optional, for OpenRouter tracking
      'X-Title': 'Ryan Conductor',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'OpenRouter request failed');
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter returned no text');
  return text;
}

async function callAi(prompt, temperature = 0.4, preferredProvider = null) {
  const providers = [];
  if (preferredProvider === 'openrouter') {
    providers.push(directOpenRouter, directGemini);
  } else if (preferredProvider === 'google') {
    providers.push(directGemini, directOpenRouter);
  } else {
    // Default order
    providers.push(directGemini, directOpenRouter);
  }

  let lastErr = null;
  for (const provider of providers) {
    try {
      return await provider(prompt, temperature);
    } catch (err) {
      console.warn(`AI provider ${provider.name} failed:`, err.message);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All AI providers failed');
}

export async function generateCourseDraft({ moduleName, request, provider = 'google' }) {
  if (typeof window !== 'undefined' && window.electronAPI?.generateCourse) {
    const data = await window.electronAPI.generateCourse({ moduleName, request, provider });
    if (data?.error) throw new AiClientError(data.error);
    return data.course;
  }
  const text = await callAi(courseGenerationPrompt({ moduleName, request }), 0.5, provider);
  return parseGeneratedCourse(text);
}

export async function chatWithCourse({ mode, question, course, provider = 'google' }) {
  if (typeof window !== 'undefined' && window.electronAPI?.chatCourse) {
    const data = await window.electronAPI.chatCourse({ mode, question, course, provider });
    if (data?.error) throw new AiClientError(data.error);
    return data.answer;
  }
  return callAi(courseChatPrompt({ mode, question, course }), 0.3, provider);
}
