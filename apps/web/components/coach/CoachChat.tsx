"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Message = {
  id: string;
  role: "user" | "coach";
  text: string;
  createdAt: string;
};

type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const introMessage: Message = {
  id: "intro",
  role: "coach",
  text: "Ask for a plan adjustment, last-run analysis, or whether to run today. I will keep answers tied to training data.",
  createdAt: new Date().toISOString(),
};

function mapApiMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role === "assistant" ? "coach" : "user",
    text: message.content,
    createdAt: message.createdAt,
  };
}

function dateKey(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    day: "2-digit",
    month: "long",
  }).format(new Date(date));
}

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);

  const messagesWithDates = useMemo(
    () =>
      messages.map((message, index) => {
        const currentDate = dateKey(message.createdAt);
        const previousDate = index > 0 ? dateKey(messages[index - 1].createdAt) : null;
        return {
          message,
          showDate: currentDate !== previousDate,
          dateLabel: dateLabel(message.createdAt),
        };
      }),
    [messages],
  );

  useEffect(() => {
    latestMessageRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loadingHistory, sending]);

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
      createdAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
          };
      setMessages((current) => [...current, coachMessage]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to get coach response");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="ask-card flex h-[calc(100svh-7rem)] min-h-[32rem] flex-col p-5 lg:h-full lg:min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Action-based coach</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Coach chat</h2>
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0f67fe]">
          <Icon name="chat" />
        </div>
      </div>
      <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loadingHistory ? <p className="text-sm font-medium leading-6 text-[#818ba0]">Loading chat history...</p> : null}
        {messagesWithDates.map(({ message, showDate, dateLabel }, index) => (
          <Fragment key={`${message.id}-${index}`}>
            {showDate ? (
              <div className="sticky top-0 z-10 flex justify-center py-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-[#818ba0] shadow-[0_8px_20px_rgba(9,14,29,0.06)] backdrop-blur">
                  {dateLabel}
                </span>
              </div>
            ) : null}
            <div ref={index === messagesWithDates.length - 1 ? latestMessageRef : null} className={message.role === "coach" ? "pr-8" : "pl-8"}>
              <p className={message.role === "coach" ? "rounded-bl-sm rounded-2xl bg-[#edf5ff] p-4 text-sm font-medium leading-6 text-[#3d4966]" : "rounded-br-sm rounded-2xl bg-[#0f67fe] p-4 text-sm font-bold leading-6 text-white"}>
                {message.text}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-[#ffe7ea] p-4 text-sm font-bold leading-6 text-[#fa4d5e]">{error}</p> : null}
      <form
        className="mt-5 flex shrink-0 gap-2"
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
