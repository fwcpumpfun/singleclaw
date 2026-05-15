"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useAgentData } from "@/hooks/useAgentData";
import { formatCompact, formatSol } from "@/lib/format-stats";

const CYCLE_MS = 3 * 60 * 1000;

function useCountdown(updatedAt: string | null) {
  const getSecondsLeft = useCallback(() => {
    if (!updatedAt) return null;
    const last = new Date(updatedAt).getTime();
    const next = last + CYCLE_MS;
    const left = Math.max(0, Math.ceil((next - Date.now()) / 1000));
    return left;
  }, [updatedAt]);

  const [seconds, setSeconds] = useState<number | null>(getSecondsLeft);

  useEffect(() => {
    setSeconds(getSecondsLeft());
    const iv = setInterval(() => setSeconds(getSecondsLeft()), 1000);
    return () => clearInterval(iv);
  }, [getSecondsLeft]);

  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PUMP_URL = process.env.NEXT_PUBLIC_MINT_ADDRESS
  ? `https://pump.fun/coin/${process.env.NEXT_PUBLIC_MINT_ADDRESS}`
  : "https://pump.fun";

const CAPABILITIES = [
  { name: "Observe", role: "Reads the creator vault, pool state, and migration status every cycle.", color: "#2563EB", bg: "linear-gradient(135deg, #EEF2FF, #DBEAFE)" },
  { name: "Decide", role: "Picks an allocation strategy based on what the on-chain state says.", color: "#7C3AED", bg: "linear-gradient(135deg, #F3E8FF, #EDE9FE)" },
  { name: "Burn", role: "Buys tokens back and permanently removes them from supply.", color: "#DC2626", bg: "linear-gradient(135deg, #FEF2F2, #FEE2E2)" },
  { name: "Deepen LP", role: "Adds liquidity to the pool when the strategy calls for stability.", color: "#059669", bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" },
];

const STEPS = [
  { num: "01", title: "Fees Flow In", text: "Every trade generates creator fees. They land in the agent's vault — not in any person's wallet." },
  { num: "02", title: "Agent Decides", text: "The agent evaluates conditions and picks: buyback, burn, or liquidity. One brain, one decision." },
  { num: "03", title: "Execute On-Chain", text: "The agent signs and broadcasts. Every action is verifiable on Solana." },
];

const FEATURES = [
  { title: "Single Agent", text: "One autonomous operator. No committee, no multisig, no human override." },
  { title: "On-Chain Proof", text: "Every tx verified on Solana. Inspect any action on Solscan." },
  { title: "AI Reasoning", text: "The agent writes its own reasoning every cycle. Read exactly why it acted." },
  { title: "Deflationary", text: "Continuous buybacks and burns. More volume = less supply." },
];

export default function BentoHome() {
  const ref = useRef<HTMLDivElement>(null);
  const { stats, thought, updatedAt } = useAgentData();
  const countdown = useCountdown(updatedAt);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    gsap.from(el.querySelectorAll(".b-card"), {
      opacity: 0, y: 30, duration: 0.7, stagger: 0.06, ease: "power3.out", delay: 0.2,
    });
  }, { scope: ref });

  return (
    <div className="bento" ref={ref}>
      {/* Row 1: Hero */}
      <div className="b-card b-hero">
        <div className="b-hero-badges">
          <div className="b-hero-badge">
            <span className="b-hero-dot" />
            Agent Live on Solana
          </div>
          {countdown !== null && (
            <div className="b-hero-badge b-hero-countdown">
              Next cycle in {countdown}
            </div>
          )}
        </div>
        <h1 className="b-hero-title">
          The token managed<br />by a single agent.
        </h1>
        <p className="b-hero-sub">
          One autonomous AI agent runs the whole token on Pump.fun.
          No team, no multisig, no human decisions.
        </p>
        <div className="b-hero-ctas">
          <a href={PUMP_URL} className="b-btn b-btn-primary" target="_blank" rel="noopener noreferrer">
            Buy on Pump.fun
          </a>
          <a href="/docs" className="b-btn b-btn-ghost">Read Docs</a>
        </div>
      </div>

      {/* Row 2: Stats + Thought */}
      <div className="b-card b-stats-card">
        <div className="b-card-label">Live Stats</div>
        <div className="b-stats-grid">
          <div className="b-stat">
            <div className="b-stat-val">{formatSol(stats.treasurySol)}</div>
            <div className="b-stat-key">SOL Treasury</div>
          </div>
          <div className="b-stat">
            <div className="b-stat-val">{formatCompact(stats.totalBurned)}</div>
            <div className="b-stat-key">Tokens Burned</div>
          </div>
          <div className="b-stat">
            <div className="b-stat-val">{formatSol(stats.totalBoughtBack)}</div>
            <div className="b-stat-key">SOL Bought Back</div>
          </div>
          <div className="b-stat">
            <div className="b-stat-val">{formatSol(stats.totalLpSol)}</div>
            <div className="b-stat-key">SOL in LP</div>
          </div>
        </div>
      </div>

      <div className="b-card b-thought-card">
        <div className="b-thought-header">
          <div className="b-card-label">
            <span className="b-thought-dot" />
            Latest from the agent
          </div>
          <div className="b-thought-agent">
            <span className="b-thought-agent-dot" />
            CLAW
          </div>
        </div>
        <blockquote className="b-thought-text">
          {thought || "Agent standing by for next cycle..."}
        </blockquote>
        <a href="/thoughts" className="b-card-link">View all thoughts →</a>
      </div>

      {/* Row 3: Capabilities */}
      {CAPABILITIES.map((c) => (
        <div className="b-card b-cap-card" key={c.name} style={{ background: c.bg }}>
          <div className="b-cap-dot" style={{ background: c.color }} />
          <div className="b-cap-name">{c.name}</div>
          <p className="b-cap-role">{c.role}</p>
        </div>
      ))}

      {/* Row 4: How It Works */}
      <div className="b-card b-how-card">
        <div className="b-card-label">How It Works</div>
        <h2 className="b-how-title">Three steps, every cycle.</h2>
        <div className="b-how-steps">
          {STEPS.map((s) => (
            <div className="b-how-step" key={s.num}>
              <span className="b-how-num">{s.num}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4 right: Features */}
      <div className="b-card b-feat-card">
        <div className="b-card-label">Built Different</div>
        <div className="b-feat-grid">
          {FEATURES.map((f, i) => (
            <div className="b-feat" key={i}>
              <div className="b-feat-title">{f.title}</div>
              <p className="b-feat-text">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: CTA */}
      <div className="b-card b-cta-card">
        <h2 className="b-cta-title">No team. No keys.<br />Just one agent.</h2>
        <p className="b-cta-sub">
          A single autonomous agent managing a token on Solana.
          Every action on-chain. Every thought visible.
        </p>
        <div className="b-cta-links">
          <a href={PUMP_URL} className="b-btn b-btn-primary" target="_blank" rel="noopener noreferrer">Buy on Pump.fun →</a>
          <a href="https://x.com/singleclaw_" className="b-btn b-btn-ghost" target="_blank" rel="noopener noreferrer">X / Twitter</a>
          <a href="/proof" className="b-btn b-btn-ghost">Proof</a>
        </div>
      </div>
    </div>
  );
}
