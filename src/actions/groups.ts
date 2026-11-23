"use server";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { conversationMembers, conversations, messages, user } from "@/db/schema";
import { findUserByScreenName } from "@/lib/chat-data";
import { getBuddyList } from "@/lib/profile-data";
import { requireViewer } from "@/lib/session";

/** Biggest group, counting you. */
const MAX_GROUP = 12;
const Id = z.number().int().positive();
const GroupName = z.string().trim().min(1, "Give your group a name.").max(30, "Group names can be up to 30 characters.");

export type NewGroupState = {
  error?: string;
  values?: { name: string; members: string[]; more: string };
};

/** Buddies to offer as checkboxes in the New Group form. */
export async function buddiesForGroup() {
  const viewer = await requireViewer();
  return getBuddyList(viewer.id);
}

const splitNames = (raw: string) =>
  raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function createGroup(_prev: NewGroupState, formData: FormData): Promise<NewGroupState> {
  const viewer = await requireViewer();
  const values = {
    name: String(formData.get("name") ?? ""),
    members: formData.getAll("members").map(String),
    more: String(formData.get("more") ?? ""),
  };
  const name = GroupName.safeParse(values.name);
  if (!name.success) return { error: name.error.issues[0].message, values };

  const wanted = [...new Set([...values.members, ...splitNames(values.more)].map((n) => n.toLowerCase()))];
  const ids: string[] = [];
  for (const n of wanted) {
    const u = await findUserByScreenName(n);
    if (!u) return { error: `No member named ${n}.`, values };
    if (u.id !== viewer.id && !ids.includes(u.id)) ids.push(u.id);
  }
  if (ids.length < 2) return { error: "Pick at least 2 people for a group (for one person, just IM them).", values };
  if (ids.length + 1 > MAX_GROUP) return { error: `Groups can have up to ${MAX_GROUP} people, including you.`, values };

  const [conv] = await db
    .insert(conversations)
    .values({ kind: "group", name: name.data, createdBy: viewer.id })
    .returning({ id: conversations.id });
  await db.insert(conversationMembers).values([viewer.id, ...ids].map((userId) => ({ conversationId: conv.id, userId })));
  await db.insert(messages).values({ conversationId: conv.id, senderId: viewer.id, kind: "system", body: "group:created" });
  redirect(`/chat/${conv.id}`);
}

async function groupForMember(conversationId: number) {
  const viewer = await requireViewer();
  Id.parse(conversationId);
  const [row] = await db
    .select({ kind: conversations.kind })
    .from(conversations)
    .innerJoin(
      conversationMembers,
      and(eq(conversationMembers.conversationId, conversations.id), eq(conversationMembers.userId, viewer.id)),
    )
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (row?.kind !== "group") throw new Error("Not a member of this group");
  return viewer;
}

export type GroupEditResult = { ok: true } | { error: string };

export async function addMember(conversationId: number, screenName: string): Promise<GroupEditResult> {
  const viewer = await groupForMember(conversationId);
  const n = screenName.trim();
  if (!n) return { error: "Type a screen name." };
  const u = await findUserByScreenName(n);
  if (!u) return { error: `No member named ${n}.` };
  const [{ n: size }] = await db
    .select({ n: count() })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
  const inserted = await db
    .insert(conversationMembers)
    .values({ conversationId, userId: u.id })
    .onConflictDoNothing()
    .returning({ userId: conversationMembers.userId });
  if (!inserted.length) return { error: `${n} is already in the group.` };
  if (size + 1 > MAX_GROUP) {
    await db.delete(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, u.id)));
    return { error: `Groups can have up to ${MAX_GROUP} people.` };
  }
  const [who] = await db.select({ username: user.username, displayUsername: user.displayUsername }).from(user).where(eq(user.id, u.id));
  await db.insert(messages).values({
    conversationId,
    senderId: viewer.id,
    kind: "system",
    body: `group:added:${who?.displayUsername || who?.username || n}`,
  });
  return { ok: true };
}

export async function renameGroup(conversationId: number, name: string): Promise<GroupEditResult> {
  const viewer = await groupForMember(conversationId);
  const parsed = GroupName.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.update(conversations).set({ name: parsed.data }).where(eq(conversations.id, conversationId));
  await db.insert(messages).values({ conversationId, senderId: viewer.id, kind: "system", body: `group:renamed:${parsed.data}` });
  return { ok: true };
}

/** Leaves a group. The last one out deletes it. */
export async function leaveGroup(conversationId: number) {
  const viewer = await groupForMember(conversationId);
  await db
    .delete(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewer.id)));
  const [{ n }] = await db
    .select({ n: count() })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
  if (n === 0) await db.delete(conversations).where(eq(conversations.id, conversationId));
  else await db.insert(messages).values({ conversationId, senderId: viewer.id, kind: "system", body: "group:left" });
  redirect("/chat");
}
