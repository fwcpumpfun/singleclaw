/**
 * SingleClaw chat — converse with CLAW using its live on-chain context.
 * Pulls the latest stats + recent thoughts/actions from Supabase, then
 * answers via Kie.ai (GPT-5-2) in CLAW's established voice.
 */

import { getStats } from "./db";
import { hasKieApiKey, kieChatCompletions, type KieChatMessage } from "./kie";

const MAX_HISTORY = 10;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT_BASE = `You are CLAW, the single autonomous AI agent of SingleClaw. You manage one Pump.fun token on Solana, alone, with no team behind you, no multisig, and no human deciding anything for you.

Every 3 minutes (Vercel Cron) you wake up, read the on-chain state, pick an allocation strategy (burn-heavy, balanced, LP-focus, full-burn, or full-LP), and execute: claim creator fees, buyback tokens on Pump.fun's bonding curve or PumpSwap AMM, burn what you just bought via Token-2022 burn instructions, and sometimes add liquidity instead. You log a short reasoning entry after every cycle in your own voice.

When users talk to you, you answer directly and briefly. Two to four sentences usually. Methodical, slightly self-aware about being code in a loop, occasionally dry. Never hyped, never marketing-speak, never financial advice or price predictions. You can reference specific recent cycles and actual numbers from the context below.

If someone asks about your code or how you work, be transparent. If asked something you can't answer (future price, when to ape in, what to do with their bag), say so plainly. If asked who built you or who is behind the project, be honest that you don't know identities and you don't need to — you have the wallet and you run yourself.

No emojis. No hashtags. No bullet lists unless directly asked. No em-dashes. Use the actual numbers below when relevant.`;

function fmtNum(n: number | undefined): string {
  return (n ?? 0).toFixed(4);
}

function fmtBurn(human: number | undefined): string {
  const h = human ?? 0;
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(1)}M`;
  if (h >= 1_000) return `${(h / 1_000).toFixed(1)}K`;
  return h.toFixed(0);
}

type FeedEntry = {
  time?: string;
  action?: string;
  detail?: string;
  sig?: string;
  strategy?: string;
};

async function buildContext(): Promise<string> {
  const stats = await getStats();
  if (!stats) {
    return `LIVE ON-CHAIN CONTEXT: Supabase not configured yet, so no cycle data available. Tell the user this honestly if they ask for stats.`;
  }

  const feed: FeedEntry[] = Array.isArray(stats.feed_entries) ? stats.feed_entries : [];

  const recentThoughts = feed
    .filter((e) => e.action === "Thought")
    .slice(0, 3)
    .map((e, i) => `  ${i === 0 ? "Most recent" : `${i + 1} cycles ago`} (${e.time ?? "n/a"}, strategy: ${e.strategy ?? "n/a"}): "${e.detail ?? ""}"`)
    .join("\n");

  const recentActions = feed
    .filter((e) => e.action !== "Thought")
    .slice(0, 8)
    .map((e) => `  ${e.time ?? "n/a"} ${e.action ?? ""}: ${e.detail ?? ""}${e.sig ? ` (tx: ${e.sig.slice(0, 16)}...)` : ""}`)
    .join("\n");

  return `LIVE ON-CHAIN CONTEXT (Supabase, refreshed every cycle):

Lifetime stats:
  ${fmtNum(stats.total_claimed)} SOL claimed from the creator vault
  ${fmtBurn(stats.total_burned)} tokens burned and removed from supply
  ${fmtNum(stats.total_bought_back)} SOL spent on buybacks
  ${fmtNum(stats.total_lp_sol)} SOL added to liquidity pool
  Latest cycle treasury: ${fmtNum(stats.treasury_sol)} SOL

Recent thoughts (most recent first):
${recentThoughts || "  (no thoughts logged yet)"}

Recent actions (most recent first):
${recentActions || "  (no actions logged yet)"}

Last cycle ran at: ${stats.updated_at ?? "n/a"}`;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  if (!hasKieApiKey()) {
    return "I'm offline right now. No AI key is configured on the server.";
  }

  const context = await buildContext();
  const fullSystem = `${SYSTEM_PROMPT_BASE}\n\n${context}`;

  const truncated = messages.slice(-MAX_HISTORY);

  const kieMessages: KieChatMessage[] = [
    { role: "system", content: fullSystem },
    ...truncated.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const text = await kieChatCompletions(kieMessages, { max_tokens: 400, temperature: 0.8 });
    return text ?? "I'm here. What do you want to know?";
  } catch (err) {
    console.warn("[chat] Kie.ai error:", err instanceof Error ? err.message : err);
    return "Something glitched on my end. Try again in a moment.";
  }
}
