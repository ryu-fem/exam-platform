import Groq from "groq-sdk";

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama3-8b-8192";
export const GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant";

const client = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export type GroqMessage = { role: "system" | "user"; content: string };

export async function askGroq(
  messages: GroqMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  if (!client) return null;

  const run = async (model: string) => {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 300,
    });
    return res.choices[0]?.message?.content?.trim() || null;
  };

  try {
    const content = await run(GROQ_MODEL);
    if (content) return content;
  } catch {
    // Primary model unavailable (e.g. retired) — fall through to fallback model.
  }

  try {
    return await run(GROQ_FALLBACK_MODEL);
  } catch {
    return null;
  }
}