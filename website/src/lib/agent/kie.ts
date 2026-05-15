/**
 * Kie.ai GPT-5-2 — direkte HTTP til api.kie.ai (ingen OpenAI SDK).
 * Alle agent-LLM kald går herfra.
 */

const KIE_BASE = "https://api.kie.ai/gpt-5-2/v1";

export type KieChatRole = "system" | "user" | "assistant";

export type KieChatMessage = { role: KieChatRole; content: string };

type KieResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export type KieChatOptions = {
  max_tokens?: number;
  temperature?: number;
};

export function hasKieApiKey(): boolean {
  return Boolean(process.env.KIE_API_KEY?.trim());
}

/**
 * POST /v1/chat/completions — returnerer assistant-tekst eller null hvis ingen key / tom svar.
 */
export async function kieChatCompletions(
  messages: KieChatMessage[],
  options: KieChatOptions = {},
): Promise<string | null> {
  const key = process.env.KIE_API_KEY;
  if (!key) return null;

  const res = await fetch(`${KIE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-5-2",
      messages,
      max_tokens: options.max_tokens ?? 512,
      temperature: options.temperature ?? 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Kie.ai ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as KieResponse;
  if (data.error) {
    throw new Error(`Kie.ai error: ${data.error.message ?? "unknown"}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
