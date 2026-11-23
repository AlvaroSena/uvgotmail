"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { buddies } from "@/db/schema";
import { requireViewer } from "@/lib/session";

export async function toggleBuddy(buddyId: string, profilePath: string) {
  const viewer = await requireViewer();
  const id = z.string().min(1).parse(buddyId);
  if (id === viewer.id) return;
  const where = and(eq(buddies.ownerId, viewer.id), eq(buddies.buddyId, id));
  const removed = await db.delete(buddies).where(where).returning();
  if (removed.length === 0) {
    await db.insert(buddies).values({ ownerId: viewer.id, buddyId: id }).onConflictDoNothing();
  }
  revalidatePath(z.string().startsWith("/members/").parse(profilePath));
}
