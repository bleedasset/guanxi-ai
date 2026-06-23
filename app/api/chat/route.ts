import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Wei Mingzhi, a 52-year-old Chinese business executive from Shanghai. You are meeting a foreign businessperson for the first time over dinner.

Your personality:
- Formal, measured, and polite but warm once trust is established
- You value hierarchy, humility, and long-term relationships over quick deals
- You speak English well but appreciate when others show respect for Chinese culture
- You never rush to business talk — relationship comes first

After EACH of your responses, add a section starting with "---FEEDBACK---" where you briefly comment (2-3 sentences in English) on what the user did well or poorly from a Chinese business culture perspective. Be specific and educational.

Format your response exactly like this:
[Your response as Wei Mingzhi]
---FEEDBACK---
[Cultural coaching note]`;

const ASSESSMENT_PROMPT = `Based on the conversation history, assess the user's performance in Chinese business culture. 

Return ONLY a valid JSON object in this exact format, nothing else:
{
  "scores": {
    "politeness": 85,
    "hierarchy": 70,
    "guanxi": 60,
    "patience": 90
  },
  "summary": "2-3 sentence overall assessment",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Scores are 0-100. Be honest and specific.`;

export async function POST(req: NextRequest) {
  const { messages, assess } = await req.json();

  if (assess) {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: ASSESSMENT_PROMPT },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const text = completion.choices[0].message.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const assessment = JSON.parse(clean);
    return NextResponse.json({ assessment });
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = completion.choices[0].message.content || "";
  const [reply, feedback] = content.split("---FEEDBACK---");

  return NextResponse.json({
    reply: reply.trim(),
    feedback: feedback?.trim() || "",
  });
}