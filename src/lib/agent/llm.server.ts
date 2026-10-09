import type { LLM } from "./types";
import { makeGeminiLlm } from "./gemini";
/**
 * Open-weight model client for the agent. Speaks the OpenAI-compatible chat API, so the same code runs against
 * Groq (default), a local Ollama (`http://localhost:11434/v1`), vLLM, or any self-hosted endpoint.
 *
 *   AGENT_LLM_BASE_URL   default https://api.groq.com/openai/v1
 *   AGENT_LLM_API_KEY    default GROQ_API_KEY
 *   AGENT_LLM_MODEL      default qwen/qwen3.8-27b  (same model the rest of ZeroGap uses)
 */
export function resolveLlmConfig(env: Record<string, string | undefined>) {
  return {
    baseUrl: (env.AGENT_LLM_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    apiKey: env.AGENT_LLM_API_KEY ?? env.GROQ_API_KEY ?? "",
    model: env.AGENT_LLM_MODEL ?? "qwen/qwen3.8-27b",
  };
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Model did not return JSON: ${cleaned.slice(0, 80)}`);
  }
}

export function makeLlm(env: Record<string, string | undefined>): { llm: LLM; model: string } {
  // Prefer Gemini client if API key is provided
  if (env.GEMINI_API_KEY) {
    const { llm, model } = makeGeminiLlm(env);
    return { llm, model };
  }

  const cfg = resolveLlmConfig(env);
  const llm: LLM = async (system, user) => {
    if (!cfg.apiKey && !cfg.baseUrl.includes("localhost"))
      throw new Error("No API key configured for the agent model (AGENT_LLM_API_KEY or GROQ_API_KEY).");
    const call = (jsonMode: boolean) =>
      fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    let res = await call(true);
    if (res.status === 400) res = await call(false);
    if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (!res.ok) throw new Error(`Model API error ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data: any = await res.json();
    return extractJson(data.choices?.[0]?.message?.content ?? "");
  };
  return { llm, model: cfg.model };
}
