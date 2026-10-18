export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDays(days: number): string {
  return days >= 99 ? "99+" : `${Math.max(0, days).toFixed(1)}d`;
}
