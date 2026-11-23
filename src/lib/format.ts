export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  let h = date.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(date.getMinutes()).padStart(2, "0")} ${ap}`;
}

/** "9:31 PM" for today, "Sun" within a week, else "11/02/99". */
export function formatShort(d: Date | string, now = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (date.toDateString() === now.toDateString()) return formatTime(date);
  const days = (now.getTime() - date.getTime()) / 86_400_000;
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

export function formatLongDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z0-9 _]/g, "").split(/[_ ]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const caps = name.match(/[A-Z]/g);
  if (caps && caps.length >= 2) return (caps[0] + caps[1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
