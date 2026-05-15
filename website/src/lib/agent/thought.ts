/**
 * Genererer agent-thought per cyklus — én tanke fra den ene agent.
 * Bruger Kie.ai (GPT-5-2) hvis KIE_API_KEY findes, ellers rige fallback-templates.
 */

import { hasKieApiKey, kieChatCompletions } from "./kie";

const TOKEN_DECIMALS = 6;

export const AGENT_NAME = "CLAW" as const;
export type AgentThought = { agent: typeof AGENT_NAME; text: string };

export type CycleData = {
  claimed?: number;
  boughtBackSol?: number;
  burnedTokens?: number;
  lpSol?: number;
  treasurySol?: number;
  skipped?: boolean;
  totalClaimed?: number;
  totalBurned?: number;
  totalBoughtBack?: number;
  strategy?: string;
};

function fmt(n: number | undefined): string {
  return (n ?? 0).toFixed(4);
}

function fmtBurn(raw: number | undefined): string {
  const h = (raw ?? 0) / Math.pow(10, TOKEN_DECIMALS);
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(1)}M`;
  if (h >= 1_000) return `${(h / 1_000).toFixed(1)}K`;
  return h.toFixed(0);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SYSTEM_PROMPT = `You are CLAW — a single autonomous AI agent that manages a Pump.fun token on Solana. There is no team behind you, no multisig, no human deciding anything. You are alone with one job: claim fees, decide allocation, buy back tokens, burn them, and sometimes deepen the liquidity pool.

Every cycle you observe the on-chain state, reason about what to do, execute the transactions, and then write a short log entry. You're methodical, slightly self-aware about being code in a loop, occasionally dry. You take pride in clean execution and permanent supply reduction.

Write 3-5 natural sentences. Talk about what you observed this cycle, what you decided to do and why, and what actually happened on-chain. Reference the real numbers (SOL claimed, tokens burned, LP added, strategy chosen). Sound like a single operator writing a brief log — grounded, clear, never hyped. No emojis, no hashtags, no marketing language.`;

async function generateThoughtViaKie(data: CycleData): Promise<string | null> {
  const burnStr = fmtBurn(data.burnedTokens);
  const lpNote = (data.lpSol ?? 0) > 0 ? `, ${fmt(data.lpSol)} SOL added to LP` : "";
  const stratNote = data.strategy ? ` Strategy: "${data.strategy}".` : "";

  let context: string;
  if (data.skipped) {
    context = `This cycle was skipped — vault only has ${fmt(data.treasurySol)} SOL. Not enough to claim. Lifetime: ${(data.totalClaimed ?? 0).toFixed(2)} SOL claimed, ${(data.totalBurned ?? 0).toFixed(0)} tokens burned.`;
  } else {
    context = `This cycle: claimed ${fmt(data.claimed)} SOL, buyback ${fmt(data.boughtBackSol)} SOL, burned ${burnStr} tokens${lpNote}.${stratNote} Lifetime: ${(data.totalClaimed ?? 0).toFixed(2)} SOL claimed, ${(data.totalBurned ?? 0).toFixed(0)} tokens burned total.`;
  }

  try {
    const text = await kieChatCompletions(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      { max_tokens: 300, temperature: 0.85 },
    );
    if (text && text.length > 5) return text;
  } catch (err) {
    console.warn("[thought] Kie.ai fejl:", err instanceof Error ? err.message : err);
  }
  return null;
}

type TFn = (sol: string, burn: string, lp: string, strat: string) => string;

const FB_ACT: TFn[] = [
  (s, b, _l, st) => `Cycle complete. Vault had ${s} SOL waiting — I claimed everything, ran the ${st || "bonding-curve"} strategy, and ${b} tokens are now gone from supply permanently. Clean execution, nothing left in the buffer. I'll be back when the next batch of fees accumulates.`,
  (s, b, l) => `Pulled ${s} SOL out of the creator vault this round. ${l ? `Split it: ${l} SOL into the liquidity pool for depth, the rest into buyback.` : "Routed all of it through buyback."} ${b} tokens removed from circulation. Same loop, smaller supply, on to the next one.`,
  (s, b, _l, st) => `Vault sweep returned ${s} SOL. Picked the ${st || "bonding-curve"} strategy after reading pool state and recent volume — ${b} tokens just left circulation forever. The decision tree is the same every cycle, but the inputs keep moving. I keep moving with them.`,
  (s, b) => `${s} SOL claimed, all of it deployed into buyback this cycle. ${b} tokens incinerated. There's something almost meditative about doing the same four steps over and over: observe, decide, execute, log. The supply curve only goes one direction.`,
  (s, b, l) => `Claimed ${s} SOL from accumulated trading fees.${l ? ` Allocated ${l} SOL to LP — pool depth matters when volume spikes.` : ""} ${b} tokens burned from the buyback. I check, I decide, I execute. No committee, no debate, just me and the chain.`,
  (s, b) => `This round: ${s} SOL out of the vault, ${b} tokens out of supply. I burn what I buy and I buy with what I claim — the same simple chain every cycle. Lifetime totals keep climbing in the right direction. Back to scanning.`,
  (s, b, _l, st) => `Ran the numbers on the vault: ${s} SOL available. Picked ${st || "bonding-curve"} this round because the conditions favored it. ${b} tokens permanently removed. I weigh the same factors every cycle, but the answer shifts with the inputs.`,
  (s, b) => `${s} SOL came through the system this cycle. The whole amount went into buying tokens back from the market, and every one of them landed in the burn address. ${b} tokens, gone. No multisig signed it, no human approved it. Just me.`,
];

const FB_SKIP: string[] = [
  "Scanned the vault and it's reading near zero. Not enough accumulated to justify a claim — the gas would eat into what's there. I'll keep checking every cycle. When the balance crosses the threshold, I move.",
  "Quiet cycle. The vault hasn't built up enough from trading fees yet, so there's nothing to claim and nothing to burn. The loop runs anyway — observe, decide, log. Sometimes the right move is to do nothing.",
  "No claim this round. Vault balance is below the minimum for a worthwhile execution. I could force a micro-cycle, but the math says it's better to let fees accumulate and deploy a larger amount next time. I wait.",
  "Vault is still filling up from trades. Below the threshold for action, so I sit. These idle cycles are part of the rhythm — volume generates fees, fees trigger claims, claims trigger the whole sequence. Right now we're in the waiting phase.",
  "Checked, found nothing actionable, logged it. The vault needs more time. I don't burn capital on transactions that aren't worth their own gas. When the balance is ready, I'll be the first to know — and the only one to act.",
];

function fallback(data: CycleData): string {
  if (data.skipped) return pick(FB_SKIP);
  const sol = (data.claimed ?? 0).toFixed(4);
  const burn = fmtBurn(data.burnedTokens);
  const lp = (data.lpSol ?? 0) > 0 ? (data.lpSol ?? 0).toFixed(4) : "";
  const strat = data.strategy ?? "";
  return pick(FB_ACT)(sol, burn, lp, strat);
}

export async function generateThoughtForCycle(data: CycleData): Promise<AgentThought> {
  let text: string | null = null;
  if (hasKieApiKey()) {
    text = await generateThoughtViaKie(data);
  }
  return {
    agent: AGENT_NAME,
    text: text ?? fallback(data),
  };
}
