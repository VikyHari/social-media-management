"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface InterviewStepResponse {
  conversationId: string;
  message: string;
  done: boolean;
  profile?: { primaryNiche: string };
  error?: string;
}

export function OnboardingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch("/api/creator/onboarding", { method: "POST" })
      .then((response) => response.json() as Promise<InterviewStepResponse>)
      .then((step) => {
        if (step.error) {
          setError(step.error);
          return;
        }
        setConversationId(step.conversationId);
        setMessages([{ role: "assistant", content: step.message }]);
      })
      .catch(() => setError("Could not reach the server. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !input.trim() || loading || done) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/creator/onboarding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: userMessage }),
      });
      const step = (await response.json()) as InterviewStepResponse;

      if (!response.ok) {
        setError(step.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: step.message }]);
      if (step.done) setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[20rem] flex-col gap-3 rounded-md border border-zinc-800 p-4">
        {messages.map((message, index) => (
          <p
            key={index}
            className={
              message.role === "assistant"
                ? "text-zinc-100"
                : "self-end rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-200"
            }
          >
            {message.content}
          </p>
        ))}
        {loading && messages.length === 0 && (
          <p className="text-sm text-zinc-500">Starting the interview…</p>
        )}
        {loading && messages.length > 0 && <p className="text-sm text-zinc-500">Thinking…</p>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {done ? (
        <Link
          href="/dashboard"
          className="w-fit rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
        >
          Back to your dashboard
        </Link>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading || !conversationId}
            placeholder="Type your answer…"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !conversationId || !input.trim()}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
