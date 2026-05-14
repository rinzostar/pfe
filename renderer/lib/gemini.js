const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';

async function directGemini({ prompt, temperature = 0.4 }) {
  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!key) throw new Error('Gemini API key missing');
  if (!prompt?.trim()) throw new Error('Prompt is empty');

  const request = async (modelName) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  });

  let res = await request(model);
  if (!process.env.GEMINI_MODEL && res.status === 404) res = await request(FALLBACK_MODEL);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini request failed');
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

async function directOpenRouter({ prompt, temperature = 0.4 }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OpenRouter API key missing');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://conductor.ryan',
      'X-Title': 'Ryan Conductor',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'OpenRouter request failed');
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter returned no text');
  return text;
}

export async function callAi({ prompt, temperature = 0.4 }) {
  try {
    return await directGemini({ prompt, temperature });
  } catch (err) {
    console.warn('Gemini failed, trying OpenRouter fallback:', err.message);
    try {
      return await directOpenRouter({ prompt, temperature });
    } catch (fallbackErr) {
      console.error('OpenRouter fallback also failed:', fallbackErr.message);
      throw err;
    }
  }
}

export { callAi as callGemini };

export function courseGenerationPrompt({ moduleName, request }) {
  return `Create a complete course lesson for a university e-learning platform.

Module: ${moduleName || 'Unknown module'}
Professor request: ${request}

Return only this format:
TITLE: concise lesson title
CONTENT:
Clear lesson content with sections, explanation, examples, and a short exercise. If a useful public YouTube URL is known, include it as a plain URL on its own line. Do not invent citations.`;
}

export function courseChatPrompt({ mode, question, course }) {
  const base = `You are a course assistant. Answer only using the course material below. If the answer is not in the material, say what is missing.

Course title: ${course?.title || 'Untitled'}
Course content:
${course?.content || ''}

Course video URL:
${course?.yt_url || 'none'}`;

  if (mode === 'summary') {
    return `${base}

Summarize this course for a student. Include:
- main idea
- key points
- important terms
- what to review next`;
  }

  return `${base}

Student question: ${question}

Give a direct, helpful answer.`;
}

export function parseGeneratedCourse(text) {
  const titleMatch = text.match(/^TITLE:\s*(.+)$/im);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]*)$/i);
  return {
    title: (titleMatch?.[1] || 'Generated course').trim(),
    content: (contentMatch?.[1] || text).trim(),
  };
}
