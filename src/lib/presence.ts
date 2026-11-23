export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(p: { invisible?: boolean | null; lastSeenAt?: Date | null } | null | undefined, now = Date.now()) {
  if (!p || p.invisible || !p.lastSeenAt) return false;
  return now - new Date(p.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export const dotColor = (online: boolean) => (online ? "#00CC00" : "#C0C0C0");
