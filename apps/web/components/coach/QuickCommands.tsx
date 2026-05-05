"use client";

const commands = [
  "Analyze last run",
  "Adjust this week",
  "Why is recovery low?",
  "Plan interval workout",
  "Should I run today?",
  "Update my goal",
  "I feel tired",
  "I have pain",
];

export function QuickCommands({ onCommand }: { onCommand: (command: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {commands.map((command) => (
        <button
          key={command}
          type="button"
          onClick={() => onCommand(command)}
          className="rounded-lg bg-[#edf5ff] px-3 py-2 text-sm font-extrabold text-[#0f67fe] transition hover:bg-[#d0e4ff]"
        >
          {command}
        </button>
      ))}
    </div>
  );
}
