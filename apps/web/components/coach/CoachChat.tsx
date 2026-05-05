"use client";

import { useState } from "react";
import { QuickCommands } from "./QuickCommands";
import { Icon } from "@/components/ui/Icon";
import type { UserSettings } from "@/lib/health/types";

type Message = {
  role: "user" | "coach";
  text: string;
};

function respond(command: string, settings: UserSettings): string {
  const normalized = command.toLowerCase();

  if (normalized.includes("pain")) {
    return "If pain is sharp, worsening, persistent, or changes your form, skip training today. For chest pain, dizziness, fainting, or unusual shortness of breath, stop exercise and seek medical advice.";
  }
  if (normalized.includes("tired") || normalized.includes("recovery")) {
    return "Keep today easy. Low recovery usually comes from sleep debt, elevated resting HR, or load stacking. I would avoid intervals until recovery is back above 75.";
  }
  if (normalized.includes("interval")) {
    return "Use one controlled VO2 session this week only if recovery and sleep are stable: 10 min warm-up, 5 x 2 min hard / 2 min easy, 10 min cool-down. Hard reps should feel controlled, not all-out.";
  }
  if (normalized.includes("last run")) {
    return "Last run was a long easy run with mostly Zone 2 work. Load was meaningful but not excessive. Good aerobic base session; keep the next run relaxed.";
  }
  if (normalized.includes("today")) {
    return `Today should stay easy unless recovery is strong and load is steady. If effort feels unusually high at ${settings.preferredEasyHrRange}, switch to a walk or rest.`;
  }

  return "For MVP I use deterministic coaching rules, not a live LLM. The recommendation is based on recovery, sleep, HR-zone load, and the weekly plan.";
}

export function CoachChat({ settings }: { settings: UserSettings }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      text: "Ask for a plan adjustment, last-run analysis, or whether to run today. I will keep answers tied to training data.",
    },
  ]);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }, { role: "coach", text: respond(trimmed, settings) }]);
    setDraft("");
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
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "coach" ? "pr-8" : "pl-8"}>
            <p className={message.role === "coach" ? "rounded-bl-sm rounded-2xl bg-[#edf5ff] p-4 text-sm font-medium leading-6 text-[#3d4966]" : "rounded-br-sm rounded-2xl bg-[#0f67fe] p-4 text-sm font-bold leading-6 text-white"}>
              {message.text}
            </p>
          </div>
        ))}
      </div>
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
          className="min-w-0 flex-1 rounded-xl bg-[#f2f5f9] px-4 py-3 text-sm font-semibold text-[#3d4966] outline-none ring-1 ring-transparent focus:ring-[#0f67fe]"
        />
        <button type="submit" className="flex size-12 items-center justify-center rounded-xl bg-[#001441] text-white">
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}
