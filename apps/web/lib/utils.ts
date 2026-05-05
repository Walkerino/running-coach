export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function formatSigned(value: number, digits = 1): string {
  const formatted = Math.abs(value).toFixed(digits);
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
