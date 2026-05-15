import { NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/agent/chat";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const messages = (body?.messages ?? []) as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "too many messages" }, { status: 400 });
    }

    for (const m of messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
        return NextResponse.json({ error: "invalid message shape" }, { status: 400 });
      }
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: "message too long" }, { status: 400 });
      }
    }

    const last = messages[messages.length - 1];
    if (last.role !== "user") {
      return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
    }

    const reply = await chat(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat-api]", err);
    return NextResponse.json({ error: "Could not get reply" }, { status: 500 });
  }
}
