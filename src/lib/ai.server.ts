// AI provider: Groq Cloud
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen/qwen3.8-27b";

type ProviderResult =
  | { ok: true; data: any }
  | { ok: false; status: number; text: string; shouldFallback: boolean };

async function tryProvider(
  url: string,
  apiKey: string,
  model: string,
  body: any
): Promise<ProviderResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, model }),
    });

    if (!res.ok) {
      const text = await res.text();
      // 429 and 401 → do NOT fallback, surface immediately
      const shouldFallback = res.status >= 500 && res.status <= 504;
      return { ok: false, status: res.status, text, shouldFallback };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    // Network error → fallback
    console.warn("[AI] Network error, will fallback:", err?.message ?? err);
    return { ok: false, status: 0, text: err?.message ?? "Network error", shouldFallback: true };
  }
}

function parseToolResult(message: any, toolName: string): any {
  const toolCall = message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  }
  // Fallback: parse JSON from text content
  const raw = message?.content ?? "";
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  throw new Error(`Failed to parse structured response for tool: ${toolName}. Output was: ${raw.slice(0, 100)}`);
}

export async function callAI(opts: {
  system: string;
  user: string;
  tool?: { name: string; description: string; parameters: any };
  model?: string;
}) {
  const body: any = {
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.7,
  };

  if (opts.tool) {
    body.messages[0].content += `\n\nYou MUST format your response as a valid JSON object matching this schema:\n${JSON.stringify(opts.tool.parameters)}\n\nDo not include any other text or markdown formatting outside the JSON object.`;
    // We intentionally omit body.tools and body.tool_choice as groq/compound does not support them
  }

  // ── Groq ──
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY missing from environment");

  const groqResult = await tryProvider(GROQ_API, groqKey, opts.model ?? GROQ_MODEL, body);

  if (!groqResult.ok) {
    if (groqResult.status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (groqResult.status === 401) throw new Error("Groq API: Invalid API key. Check GROQ_API_KEY.");
    throw new Error(`Groq API error ${groqResult.status}: ${groqResult.text.slice(0, 300)}`);
  }

  const message = groqResult.data.choices?.[0]?.message;
  if (opts.tool) return parseToolResult(message, opts.tool.name);
  return message?.content ?? "";
}
