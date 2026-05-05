"use client";

import { useEffect, useState } from "react";
import { QuickCommands } from "./QuickCommands";
import { Icon } from "@/components/ui/Icon";

type Message = {
  id: string;
  role: "user" | "coach";
  text: string;
};

type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const introMessage: Message = {
  id: "intro",
  role: "coach",
  text: "Ask for a plan adjustment, last-run analysis, or whether to run today. I will keep answers tied to training data.",
};

function mapApiMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role === "assistant" ? "coach" : "user",
    text: message.content,
  };
}

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await fetch("/api/coach/chat", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load chat history");
        const data = (await response.json()) as { messages?: ApiMessage[] };
        if (!active) return;
        const history = (data.messages ?? []).map(mapApiMessage);
        setMessages(history.length > 0 ? history : [introMessage]);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Failed to load chat history");
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimisticMessage: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setError(null);
    setDraft("");
    setSending(true);
    setMessages((current) => [...current.filter((message) => message.id !== "intro"), optimisticMessage]);

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await response.json()) as { answer?: string; message?: ApiMessage; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to get coach response");

      const coachMessage: Message = data.message
        ? mapApiMessage(data.message)
        : {
            id: `coach-${Date.now()}`,
            role: "coach",
            text: data.answer ?? "I could not produce a response.",
          };
      setMessages((current) => [...current, coachMessage]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to get coach response");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="ask-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Action-based coach</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Coach chat</h2>
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0f67fe]">
          <Icon name="chat" />
        </div>
      </div>
      <div className="mt-5">
        <QuickCommands onCommand={send} />
      </div>
      <div className="mt-6 space-y-3">
        {loadingHistory ? <p className="text-sm font-medium leading-6 text-[#818ba0]">Loading chat history...</p> : null}
        {messages.map((message, index) => (
          <div key={`${message.id}-${index}`} className={message.role === "coach" ? "pr-8" : "pl-8"}>
            <p className={message.role === "coach" ? "rounded-bl-sm rounded-2xl bg-[#edf5ff] p-4 text-sm font-medium leading-6 text-[#3d4966]" : "rounded-br-sm rounded-2xl bg-[#0f67fe] p-4 text-sm font-bold leading-6 text-white"}>
              {message.text}
            </p>
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-[#ffe7ea] p-4 text-sm font-bold leading-6 text-[#fa4d5e]">{error}</p> : null}
      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask the coach..."
          disabled={sending}
          className="min-w-0 flex-1 rounded-xl bg-[#f2f5f9] px-4 py-3 text-sm font-semibold text-[#3d4966] outline-none ring-1 ring-transparent focus:ring-[#0f67fe]"
        />
        <button type="submit" disabled={sending || draft.trim().length === 0} className="flex size-12 items-center justify-center rounded-xl bg-[#001441] text-white disabled:cursor-not-allowed disabled:bg-[#818ba0]">
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}
