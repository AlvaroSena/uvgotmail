import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { auth } from "./auth";

export type Viewer = {
  id: string;
  screenName: string;
  email: string;
};

export async function getViewer(): Promise<Viewer | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { username?: string | null; displayUsername?: string | null };
  return {
    id: u.id,
    screenName: u.displayUsername || u.username || u.name,
    email: u.email,
  };
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/signon");
  return v;
}

/** Marks the viewer as seen just now (drives the online dots). */
export async function touchPresence(userId: string) {
  await db.update(profiles).set({ lastSeenAt: new Date() }).where(eq(profiles.userId, userId));
}
