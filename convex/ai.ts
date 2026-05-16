"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

async function callGemini(prompt: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callMistral(prompt: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("Mistral API key not configured");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Mistral error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenRouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3-8b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateWithFallback(prompt: string) {
  try {
    return await callMistral(prompt);
  } catch {
    try {
      return await callGemini(prompt);
    } catch {
      return await callOpenRouter(prompt);
    }
  }
}

export const generateCourse = action({
  args: {
    title: v.string(),
    topics: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const prompt = `Generate a structured course outline for "${args.title}". ${args.topics ? "Cover these topics: " + args.topics : ""} Return it as markdown with sections and bullet points.`;
    const result = await generateWithFallback(prompt);
    return { result };
  },
});

export const chatCourse = action({
  args: {
    courseContent: v.string(),
    question: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `Based on the following course content, answer the question.\n\nCourse Content:\n${args.courseContent}\n\nQuestion: ${args.question}`;
    const result = await generateWithFallback(prompt);
    return { result };
  },
});
