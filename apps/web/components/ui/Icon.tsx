import { cn } from "@/lib/utils";

type IconName =
  | "activity"
  | "calendar"
  | "chat"
  | "body"
  | "home"
  | "settings"
  | "search"
  | "bell"
  | "heart"
  | "sleep"
  | "run"
  | "load"
  | "send"
  | "plus"
  | "shield"
  | "trend";

type IconProps = {
  name: IconName;
  className?: string;
};

const paths: Record<IconName, string[]> = {
  activity: ["M5 13h3l2-7 4 12 2-5h3", "M4 20h16"],
  calendar: ["M7 3v3M17 3v3M4 9h16", "M5 5h14v15H5z"],
  chat: ["M5 6h14v10H8l-3 3z", "M8 9h8M8 12h5"],
  body: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M5 21a7 7 0 0 1 14 0"],
  home: ["M4 11 12 4l8 7", "M6 10v10h12V10"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19 12h2M3 12h2M12 3v2M12 19v2M17 5l-1.4 1.4M8.4 17.6 7 19M19 17l-1.4-1.4M6.4 6.4 5 5"],
  search: ["m21 21-4.3-4.3", "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"],
  bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  heart: ["M20.8 8.6c0 5.3-8.8 10.4-8.8 10.4S3.2 13.9 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4Z"],
  sleep: ["M7 7h7l-7 10h8", "M16 5h4l-4 6h4"],
  run: ["M13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", "m11 9-3 4 4 2 1 5M13 10l3 3h4M10 20l-4 1M12 9l-2 6"],
  load: ["M5 19V9M12 19V5M19 19v-7", "M3 19h18"],
  send: ["M21 3 10 14", "m21 3-7 18-4-7-7-4z"],
  plus: ["M12 5v14M5 12h14"],
  shield: ["M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z", "m9 12 2 2 4-5"],
  trend: ["M4 17 9 12l4 4 7-9", "M15 7h5v5"],
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cn("size-5", className)} aria-hidden="true">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
