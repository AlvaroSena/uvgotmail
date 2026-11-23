import "server-only";
import { and, count, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  buddies,
  conversationMembers,
  conversations,
  messageHearts,
  messages,
  profiles,
  user,
} from "@/db/schema";
import { initials } from "./format";
import { isOnline } from "./presence";
import { liveCallsFor, MAX_IN_CALL } from "./call-data";
import type { ChatState, ConversationSummary, MemberView, ThreadMessage } from "./chat-types";

const THREAD_LIMIT = 200;

const screenName = (u: { username: string | null; displayUsername: string | null; name: string }) =>
  u.displayUsername || u.username || u.name;

export async function isMember(conversationId: number, userId: string) {
  const [row] = await db
    .select({ id: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function listConversations(viewerId: string): Promise<ConversationSummary[]> {
  const mine = await db
    .select({ conversationId: conversationMembers.conversationId, lastRead: conversationMembers.lastReadMessageId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, viewerId));
  if (mine.length === 0) return [];
  const ids = mine.map((m) => m.conversationId);

  const [convs, others, lastMsgs, unread, liveCalls] = await Promise.all([
    db.select().from(conversations).where(inArray(conversations.id, ids)),
    db
      .select({
        conversationId: conversationMembers.conversationId,
        username: user.username,
        displayUsername: user.displayUsername,
        name: user.name,
        avatarColor: profiles.avatarColor,
        awayMessage: profiles.awayMessage,
        invisible: profiles.invisible,
        lastSeenAt: profiles.lastSeenAt,
      })
      .from(conversationMembers)
      .innerJoin(user, eq(user.id, conversationMembers.userId))
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(and(inArray(conversationMembers.conversationId, ids), ne(conversationMembers.userId, viewerId))),
    db
      .selectDistinctOn([messages.conversationId], {
        id: messages.id,
        conversationId: messages.conversationId,
        body: messages.body,
        kind: messages.kind,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .orderBy(messages.conversationId, desc(messages.id)),
    db
      .select({ conversationId: messages.conversationId, n: count() })
      .from(messages)
      .innerJoin(
        conversationMembers,
        and(eq(conversationMembers.conversationId, messages.conversationId), eq(conversationMembers.userId, viewerId)),
      )
      .where(
        and(
          gt(messages.id, conversationMembers.lastReadMessageId),
          sql`(${messages.senderId} is null or ${messages.senderId} <> ${viewerId})`,
        ),
      )
      .groupBy(messages.conversationId),
    liveCallsFor(ids),
  ]);

  const now = Date.now();
  const summaries = convs.map((c): ConversationSummary & { sortKey: number } => {
    const members = others.filter((o) => o.conversationId === c.id);
    const last = lastMsgs.find((m) => m.conversationId === c.id);
    const unreadN = unread.find((u) => u.conversationId === c.id)?.n ?? 0;
    const preview = last
      ? last.kind === "system"
        ? last.body.startsWith("call:")
          ? "*** Call ***"
          : last.body.startsWith("group:")
            ? "*** Group news ***"
            : "*** Buzz! ***"
        : (last.senderId === viewerId ? "You: " : "") + last.body
      : "No messages yet";

    const lc = liveCalls.get(c.id);
    const liveCall = lc ? { ...lc, max: MAX_IN_CALL } : null;

    if (c.kind === "group") {
      const name = c.name ?? "Group";
      const onlineN = members.filter((m) => isOnline(m, now)).length;
      return {
        id: c.id,
        kind: "group",
        name,
        initials: initials(name),
        avatar: groupColor(c.id),
        online: onlineN > 0,
        status: `${members.length + 1} members · ${onlineN} online`,
        preview,
        lastAt: last?.createdAt.toISOString() ?? null,
        unread: unreadN,
        otherScreenName: null,
        liveCall,
        sortKey: last?.id ?? c.id,
      };
    }

    if (c.kind === "room") {
      const name = c.name ?? "Chat Room";
      return {
        id: c.id,
        kind: "room",
        name,
        initials: initials(name),
        avatar: "#806000",
        online: true,
        status: `Chat room · ${members.length + 1} people here`,
        preview,
        lastAt: last?.createdAt.toISOString() ?? null,
        unread: unreadN,
        otherScreenName: null,
        liveCall,
        sortKey: last?.id ?? 0,
      };
    }
    const other = members[0];
    const name = other ? screenName(other) : "(nobody)";
    const online = isOnline(other, now);
    const status = online
      ? other?.awayMessage
        ? `Online · "${other.awayMessage}"`
        : "Online"
      : "Offline";
    return {
      id: c.id,
      kind: "dm",
      name,
      initials: initials(name),
      avatar: other?.avatarColor ?? "#000080",
      online,
      status,
      lastSeenAt: online ? null : (other?.lastSeenAt?.toISOString() ?? null),
      preview,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread: unreadN,
      otherScreenName: other ? other.username : null,
      liveCall,
      sortKey: last?.id ?? 0,
    };
  });

  summaries.sort((a, b) => b.sortKey - a.sortKey);
  return summaries.map((x) => {
    const { sortKey, ...rest } = x;
    void sortKey;
    return rest;
  });
}

export async function getThread(conversationId: number, viewerId: string, viewerName: string, conv: ConversationSummary) {
  const rows = await db
    .select({
      id: messages.id,
      kind: messages.kind,
      body: messages.body,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      username: user.username,
      displayUsername: user.displayUsername,
      name: user.name,
    })
    .from(messages)
    .leftJoin(user, eq(user.id, messages.senderId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.id))
    .limit(THREAD_LIMIT);
  rows.reverse();

  const ids = rows.map((r) => r.id);
  const [hearts, otherMembers] = await Promise.all([
    ids.length
      ? db
          .select({
            messageId: messageHearts.messageId,
            n: count(),
            mine: sql<boolean>`bool_or(${messageHearts.userId} = ${viewerId})`,
          })
          .from(messageHearts)
          .where(inArray(messageHearts.messageId, ids))
          .groupBy(messageHearts.messageId)
      : Promise.resolve([]),
    db
      .select({
        lastRead: conversationMembers.lastReadMessageId,
        typingUntil: conversationMembers.typingUntil,
        username: user.username,
        displayUsername: user.displayUsername,
        name: user.name,
      })
      .from(conversationMembers)
      .innerJoin(user, eq(user.id, conversationMembers.userId))
      .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.userId, viewerId))),
  ]);

  const msgs: ThreadMessage[] = rows.map((r) => {
    const mine = r.senderId === viewerId;
    const sender = r.username ? screenName({ username: r.username, displayUsername: r.displayUsername, name: r.name ?? "" }) : "Someone";
    const h = hearts.find((x) => x.messageId === r.id);
    let body = r.body;
    if (r.kind === "system") {
      body = r.body.startsWith("call:")
        ? callLine(r.body, mine, sender, conv)
        : r.body.startsWith("group:")
          ? groupLine(r.body, mine ? "You" : sender)
          : conv.kind !== "dm"
            ? `${mine ? "You" : sender} buzzed the ${conv.kind}!`
          : mine
            ? `You sent ${conv.name} a Buzz!`
            : `${sender} sent you a Buzz!`;
    }
    return {
      id: r.id,
      kind: r.kind,
      body,
      senderName: mine ? viewerName : sender,
      mine,
      at: r.createdAt.toISOString(),
      heartCount: h?.n ?? 0,
      heartedByMe: !!h?.mine,
    };
  });

  const now = Date.now();
  const typing = otherMembers.find((m) => m.typingUntil && m.typingUntil.getTime() > now);
  const readUpTo = otherMembers.reduce((max, m) => Math.max(max, m.lastRead), 0);

  return {
    messages: msgs,
    readUpTo,
    typing: typing ? screenName({ username: typing.username, displayUsername: typing.displayUsername, name: typing.name }) : null,
  };
}

export async function markRead(conversationId: number, viewerId: string, messageId: number) {
  await db
    .update(conversationMembers)
    .set({ lastReadMessageId: sql`greatest(${conversationMembers.lastReadMessageId}, ${messageId})` })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, viewerId)));
}

export async function countOnlineBuddies(viewerId: string) {
  const rows = await db
    .select({ invisible: profiles.invisible, lastSeenAt: profiles.lastSeenAt })
    .from(buddies)
    .innerJoin(profiles, eq(profiles.userId, buddies.buddyId))
    .where(eq(buddies.ownerId, viewerId));
  const now = Date.now();
  return rows.filter((r) => isOnline(r, now)).length;
}

/** Full chat state for one conversation, also marking it read for the viewer. */
export async function getChatState(viewer: { id: string; screenName: string }, conversationId: number): Promise<ChatState | null> {
  const list = await listConversations(viewer.id);
  const current = list.find((c) => c.id === conversationId);
  if (!current) return null;

  const [thread, onlineCount, members] = await Promise.all([
    getThread(conversationId, viewer.id, viewer.screenName, current),
    countOnlineBuddies(viewer.id),
    current.kind === "group" ? getMembers(conversationId) : Promise.resolve(null),
  ]);

  const lastId = thread.messages.at(-1)?.id ?? 0;
  if (lastId) await markRead(conversationId, viewer.id, lastId);
  current.unread = 0;

  return {
    list,
    current,
    ...thread,
    unreadTotal: list.reduce((n, c) => n + c.unread, 0),
    onlineCount,
    members,
  };
}

export async function getMembers(conversationId: number): Promise<MemberView[]> {
  const rows = await db
    .select({
      id: user.id,
      username: user.username,
      displayUsername: user.displayUsername,
      name: user.name,
      avatarColor: profiles.avatarColor,
      invisible: profiles.invisible,
      lastSeenAt: profiles.lastSeenAt,
    })
    .from(conversationMembers)
    .innerJoin(user, eq(user.id, conversationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(conversationMembers.conversationId, conversationId))
    .orderBy(conversationMembers.joinedAt);
  const now = Date.now();
  return rows.map((r) => {
    const name = screenName(r);
    return {
      id: r.id,
      screenName: name,
      username: r.username ?? "",
      initials: initials(name),
      avatar: r.avatarColor ?? "#000080",
      online: isOnline(r, now),
    };
  });
}

const GROUP_COLORS = ["#008080", "#800080", "#806000", "#008000", "#800000", "#000080"];
const groupColor = (id: number) => GROUP_COLORS[id % GROUP_COLORS.length];

/** Text for group system messages: group:created, group:added:<name>, group:left, group:renamed:<name>. */
function groupLine(code: string, who: string) {
  const [, what, ...rest] = code.split(":");
  const arg = rest.join(":");
  if (what === "created") return `${who} created the group`;
  if (what === "added") return `${who} added ${arg}`;
  if (what === "left") return `${who} left the group`;
  if (what === "renamed") return `${who} renamed the group to "${arg}"`;
  return `${who} updated the group`;
}

export async function findOrCreateDm(a: string, b: string): Promise<number> {
  const key = [a, b].sort().join(":");
  const [existing] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.dmKey, key)).limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(conversations)
    .values({ kind: "dm", dmKey: key })
    .onConflictDoNothing()
    .returning({ id: conversations.id });
  if (!created) {
    const [again] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.dmKey, key)).limit(1);
    return again.id;
  }
  await db.insert(conversationMembers).values([
    { conversationId: created.id, userId: a },
    { conversationId: created.id, userId: b },
  ]);
  return created.id;
}

export async function latestConversationId(viewerId: string) {
  const list = await listConversations(viewerId);
  return list[0]?.id ?? null;
}


export async function findUserByScreenName(screenName: string) {
  const [row] = await db
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(eq(user.username, screenName.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

/** Text for call system messages. The sender of a call line is always the caller. */
function callLine(code: string, callerIsMe: boolean, caller: string, conv: ConversationSummary) {
  const [, what, secs, extra] = code.split(":");
  const dur = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  if (what === "group") return `Group call · ${dur(Number(secs) || 0)} · ${Number(extra) || 2} people`;
  if (conv.kind !== "dm") {
    if (what === "ended") return `Video call · ${dur(Number(secs) || 0)}`;
    if (conv.kind === "room" && what === "cancelled") return callerIsMe ? "Nobody joined your call" : `${caller} started a call`;
    if (what === "cancelled" && callerIsMe) return "You cancelled the call";
    return callerIsMe ? "Nobody picked up your call" : `Missed group call from ${caller}`;
  }
  const peerName = conv.name;
  const medium = extra;
  if (what === "ended") {
    const n = Number(secs) || 0;
    const dur = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
    return `${medium === "voice" ? "Voice" : "Video"} call · ${dur}`;
  }
  if (what === "declined") return callerIsMe ? `${peerName} couldn't talk right now` : "You declined a call";
  if (what === "cancelled") return callerIsMe ? "You cancelled the call" : `Missed call from ${caller}`;
  return callerIsMe ? `${peerName} missed your call` : `Missed call from ${caller}`;
}
