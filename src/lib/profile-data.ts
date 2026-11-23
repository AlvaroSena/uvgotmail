import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buddies, profiles, user } from "@/db/schema";
import { isOnline } from "./presence";

export type BuddyEntry = { username: string; screenName: string; online: boolean };

export async function getMemberProfile(username: string) {
  const [row] = await db
    .select({
      id: user.id,
      username: user.username,
      displayUsername: user.displayUsername,
      name: user.name,
      createdAt: user.createdAt,
      profile: profiles,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.username, username.toLowerCase()))
    .limit(1);
  if (!row || !row.username) return null;
  return {
    ...row,
    screenName: row.displayUsername || row.username,
    online: isOnline(row.profile),
  };
}

export async function getBuddyList(viewerId: string): Promise<BuddyEntry[]> {
  const rows = await db
    .select({
      username: user.username,
      displayUsername: user.displayUsername,
      name: user.name,
      invisible: profiles.invisible,
      lastSeenAt: profiles.lastSeenAt,
      addedAt: buddies.createdAt,
    })
    .from(buddies)
    .innerJoin(user, eq(user.id, buddies.buddyId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(buddies.ownerId, viewerId))
    .orderBy(buddies.createdAt);
  const now = Date.now();
  return rows
    .map((r) => ({
      username: r.username ?? r.name,
      screenName: r.displayUsername || r.username || r.name,
      online: isOnline(r, now),
    }))
    .sort((a, b) => Number(b.online) - Number(a.online));
}

export async function isBuddy(ownerId: string, buddyId: string) {
  const [row] = await db
    .select({ id: buddies.buddyId })
    .from(buddies)
    .where(and(eq(buddies.ownerId, ownerId), eq(buddies.buddyId, buddyId)))
    .limit(1);
  return !!row;
}
