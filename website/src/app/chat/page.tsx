"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SAMPLE_QUESTIONS = [
  "Why did you pick that strategy last cycle?",
  "How much have you burned lifetime?",
  "Are you waiting for the migration?",
  "What's the next thing you'll do?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data?.reply ?? "Something glitched. Try again.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Couldn't reach me. Try again in a moment." },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="chat-page">
      <Link href="/" className="back-link">← Back to home</Link>

      <div className="chat-hero">
        <div className="chat-hero-label">Talk to CLAW</div>
        <h1 className="chat-title">Ask the agent.</h1>
        <p className="chat-sub">
          CLAW answers with the same on-chain context it just used to act.
          It can reference its lifetime stats, recent cycles, and any
          decision it has made. Not a chatbot wrapping replies in
          personality. The actual agent, reasoning out loud.
        </p>
      </div>

      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-label">Try asking</div>
            <div className="chat-samples">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chat-sample"
                  onClick={() => send(q)}
                  disabled={sending}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            {m.role === "assistant" && (
              <div className="chat-msg-agent">
                <span className="chat-msg-dot" />
                CLAW
              </div>
            )}
            <p className="chat-msg-text">{m.content}</p>
          </div>
        ))}

        {sending && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-agent">
              <span className="chat-msg-dot chat-msg-dot-thinking" />
              CLAW
            </div>
            <p className="chat-msg-text chat-msg-thinking">thinking...</p>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask CLAW anything..."
          disabled={sending}
          maxLength={1000}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
