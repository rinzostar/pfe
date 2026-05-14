const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const { AccessToken } = require('livekit-server-sdk');

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';

async function directGemini({ prompt, temperature = 0.4 }) {
  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (!key) throw new Error('Gemini API key missing');
  const request = async (modelName) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  });

  let res = await request(model);
  if (!process.env.GEMINI_MODEL && res.status === 404) res = await request(FALLBACK_GEMINI_MODEL);
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

async function callAi({ prompt, temperature = 0.4, provider: preferredProvider = null }) {
  const providers = [];
  if (preferredProvider === 'openrouter') {
    providers.push(directOpenRouter, directGemini);
  } else {
    providers.push(directGemini, directOpenRouter);
  }

  let lastErr = null;
  for (const provider of providers) {
    try {
      return await provider({ prompt, temperature });
    } catch (err) {
      console.warn(`AI provider in main process failed:`, err.message);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All AI providers failed');
}

function parseGeneratedCourse(text) {
  const titleMatch = text.match(/^TITLE:\s*(.+)$/im);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]*)$/i);
  return {
    title: (titleMatch?.[1] || 'Generated course').trim(),
    content: (contentMatch?.[1] || text).trim(),
  };
}

function courseGenerationPrompt({ moduleName, request }) {
  return `Create a complete course lesson for a university e-learning platform.

Module: ${moduleName || 'Unknown module'}
Professor request: ${request}

Return only this format:
TITLE: concise lesson title
CONTENT:
Clear lesson content with sections, explanation, examples, and a short exercise. If a useful public YouTube URL is known, include it as a plain URL on its own line. Do not invent citations.`;
}

function courseChatPrompt({ mode, question, course }) {
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

function setupApiHandlers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  const adminClient = () => createClient(url, service, { auth: { persistSession: false } });

  ipcMain.handle('api:start-live', async (event, { module_id, host_id }) => {
    try {
      if (!module_id || !host_id) throw new Error('Missing fields');
      const sb = adminClient();
      const room_name = `module-${module_id}`;
      const { data: active, error: activeError } = await sb.from('livestreams')
        .select('*')
        .eq('module_id', module_id)
        .eq('room_name', room_name)
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeError) throw new Error(activeError.message);
      if (active) return { ok: true, livestream: active };

      const { data, error } = await sb.from('livestreams')
        .insert({ module_id, host_id, room_name, status: 'live' })
        .select().single();
      if (error) throw new Error(error.message);
      return { ok: true, livestream: data };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:end-live', async (event, { livestream_id, module_id }) => {
    try {
      const sb = adminClient();
      let q = sb.from('livestreams').update({ status: 'ended' }).eq('status', 'live');
      if (livestream_id) q = q.eq('id', livestream_id);
      else if (module_id) q = q.eq('module_id', module_id);
      else throw new Error('Missing fields');
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:livekit-token', async (event, { roomName, identity, name, isHost }) => {
    try {
      if (!apiKey || !apiSecret) throw new Error('LiveKit env missing');
      const at = new AccessToken(apiKey, apiSecret, { identity, name });
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: !!isHost,
        canPublishData: true,
        canSubscribe: true,
      });
      const token = await at.toJwt();
      return { token };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:create-user', async (event, { email, password, full_name, role }) => {
    try {
      const sb = adminClient();
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });
      if (error) throw new Error(error.message);
      return { ok: true, user: data.user };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:create-post', async (event, { author_id, content, link = null, file_path = null }) => {
    try {
      if (!author_id || !content) throw new Error('Missing fields');
      const sb = adminClient();
      const { data, error } = await sb
        .from('posts')
        .insert({ author_id, content, link, file_path })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, post: data };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:report-post', async (event, { post_id, reporter_id }) => {
    try {
      if (!post_id || !reporter_id) throw new Error('Missing fields');
      const sb = adminClient();
      const { error } = await sb.from('reports').insert({ post_id, reporter_id });
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:delete-post', async (event, { id }) => {
    try {
      if (!id) throw new Error('Missing post id');
      const sb = adminClient();
      await sb.from('reports').delete().eq('post_id', id);
      const { error } = await sb.from('posts').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:dismiss-reports', async (event, { post_id }) => {
    try {
      if (!post_id) throw new Error('Missing post id');
      const sb = adminClient();
      const { error } = await sb.from('reports').delete().eq('post_id', post_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:upload-file', async (event, { bucket, path: filePath, bytes, contentType }) => {
    try {
      if (!bucket || !filePath || !bytes) throw new Error('Missing upload fields');
      const sb = adminClient();
      const body = Buffer.from(new Uint8Array(bytes));
      const { error } = await sb.storage.from(bucket).upload(filePath, body, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
      return { ok: true, path: filePath, url: data.publicUrl };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:ai-course', async (event, { moduleName, request, provider }) => {
    try {
      if (!request?.trim()) throw new Error('Describe the course to generate');
      const text = await callAi({
        prompt: courseGenerationPrompt({ moduleName, request }),
        temperature: 0.5,
        provider,
      });
      return { ok: true, course: parseGeneratedCourse(text), raw: text };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('api:ai-course-chat', async (event, { mode = 'chat', question = '', course, provider }) => {
    try {
      if (mode !== 'summary' && !question.trim()) throw new Error('Ask a question first');
      const answer = await callAi({
        prompt: courseChatPrompt({ mode, question, course }),
        temperature: 0.3,
        provider,
      });
      return { ok: true, answer };
    } catch (e) {
      return { error: e.message };
    }
  });
}

module.exports = { setupApiHandlers };
