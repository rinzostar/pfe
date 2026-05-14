import { callGemini, courseGenerationPrompt, parseGeneratedCourse } from '../../lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { moduleName, request } = req.body || {};
    if (!request?.trim()) return res.status(400).json({ error: 'Describe the course to generate' });
    const text = await callGemini({
      prompt: courseGenerationPrompt({ moduleName, request }),
      temperature: 0.5,
    });
    return res.json({ ok: true, course: parseGeneratedCourse(text), raw: text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
