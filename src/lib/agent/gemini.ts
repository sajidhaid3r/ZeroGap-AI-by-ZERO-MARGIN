/**
 * Gemini client for ZeroGap Tailor.
 * Uses Google Gemini API (REST) with the `gemini-pro` endpoint or any model name.
 * The API key is taken from `process.env.GEMINI_API_KEY` and the desired model
 * from `process.env.TAILOR_LLM_MODEL` (e.g. `gemma-3-27b-it`).
 */
import type { LLM } from "./types";

export function resolveGeminiConfig(env: Record<string, string | undefined>) {
  const apiKey = env.GEMINI_API_KEY ?? "";
  const model = env.TAILOR_LLM_MODEL ?? "gemini-1.5-flash"; // fallback Gemini model
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return { apiKey, model };
}

/**
 * Calls the Gemini API and extracts a plain JSON object from the response.
 * The Gemini REST endpoint expects a POST to:
 *   https://generativeai.googleapis.com/v1/models/${model}:generateContent
 */
export async function makeGeminiLlm(env: Record<string, string | undefined>): { llm: LLM; model: string } {
  const { apiKey, model } = resolveGeminiConfig(env);
  const endpoint = `https://generativeai.googleapis.com/v1/models/${model}:generateContent`;

  const llm: LLM = async (system, user) => {
    const body = {
      contents: [
        { role: "system", parts: [{ text: system }] },
        { role: "user", parts: [{ text: user }] },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 120)}`);
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return cleaned as unknown;
    }
  };

  return { llm, model };
}
