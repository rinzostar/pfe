import { callGemini, courseChatPrompt } from '../../lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { mode = 'chat', question = '', course } = req.body || {};
    if (mode !== 'summary' && !question.trim()) return res.status(400).json({ error: 'Ask a question first' });
    const answer = await callGemini({
      prompt: courseChatPrompt({ mode, question, course }),
      temperature: 0.3,
    });
    return res.json({ ok: true, answer });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
