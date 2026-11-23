"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversationMembers, messageHearts, messages } from "@/db/schema";
import { findOrCreateDm, findUserByScreenName, isMember } from "@/lib/chat-data";
import { requireViewer } from "@/lib/session";

const Id = z.number().int().positive();
const Body = z.string().trim().min(1).max(2000);

async function memberOrThrow(conversationId: number) {
  const viewer = await requireViewer();
  Id.parse(conversationId);
  if (!(await isMember(conversationId, viewer.id))) throw new Error("Not a member of this conversation");
  return viewer;
}

export async function sendMessage(conversationId: number, body: string) {
  const viewer = await memberOrThrow(conversationId);
  const text = Body.parse(body);
  await db.insert(messages).values({ conversationId, senderId: viewer.id, body: text });
  await db
    .update(conversationMembers)
    .set({ typingUntil: null })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewer.id)));
}

export async function sendBuzz(conversationId: number) {
  const viewer = await memberOrThrow(conversationId);
  await db.insert(messages).values({ conversationId, senderId: viewer.id, kind: "system", body: "buzz" });
}

export async function toggleHeart(messageId: number) {
  const viewer = await requireViewer();
  Id.parse(messageId);
  const [msg] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg || !(await isMember(msg.conversationId, viewer.id))) throw new Error("Message not found");

  const where = and(eq(messageHearts.messageId, messageId), eq(messageHearts.userId, viewer.id));
  const removed = await db.delete(messageHearts).where(where).returning();
  if (removed.length === 0) {
    await db.insert(messageHearts).values({ messageId, userId: viewer.id }).onConflictDoNothing();
  }
}

export async function setTyping(conversationId: number) {
  const viewer = await memberOrThrow(conversationId);
  await db
    .update(conversationMembers)
    .set({ typingUntil: new Date(Date.now() + 4000) })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewer.id)));
}

export type StartDmState = { error?: string };

export async function startDm(_prev: StartDmState, formData: FormData): Promise<StartDmState> {
  const viewer = await requireViewer();
  const name = String(formData.get("screenName") ?? "").trim();
  if (!name) return { error: "Type a screen name." };
  const other = await findUserByScreenName(name);
  if (!other) return { error: `No member named ${name}.` };
  if (other.id === viewer.id) return { error: "That's you, silly!" };
  const id = await findOrCreateDm(viewer.id, other.id);
  redirect(`/chat/${id}`);
}

/** Used by the profile page's Instant Message window. */
export async function openDm(otherUserId: string): Promise<number> {
  const viewer = await requireViewer();
  const id = z.string().min(1).parse(otherUserId);
  if (id === viewer.id) throw new Error("Can't IM yourself");
  return findOrCreateDm(viewer.id, id);
}
