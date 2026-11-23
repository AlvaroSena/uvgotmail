import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { callParticipants, callRings, callSignals, calls, conversationMembers, conversations, messages, profiles, user } from "@/db/schema";
import { initials } from "./format";
import { isOnline } from "./presence";

/** Peer-to-peer mesh: every browser sends video to every other one, so keep it small. */
export const MAX_IN_CALL = 4;
export const RING_TIMEOUT_MS = 45_000;
export const HEARTBEAT_TIMEOUT_MS = 30_000;
/** A call nobody has joined yet (the starter is still allowing the camera) survives this long. */
const EMPTY_GRACE_MS = 60_000;

export type CallStatus = (typeof calls.$inferSelect)["status"];
export type CallRow = typeof calls.$inferSelect;
export type ConvKind = "dm" | "room" | "group";

export type Person = { userId: string; screenName: string; username: string; initials: string; avatar: string };
export type ParticipantView = Person & { pid: number; withVideo: boolean };

export type CallView = {
  id: number;
  conversationId: number;
  kind: ConvKind;
  /** The buddy's name in a DM, otherwise the group or room name. */
  title: string;
  status: CallStatus;
  withVideo: boolean;
  startedByMe: boolean;
  starter: Person | null;
  /** For DMs: the other person (used on the dialing screen). */
  peer: (Person & { online: boolean }) | null;
  answeredAt: string | null;
  endedAt: string | null;
  endedByMe: boolean;
  peak: number;
  max: number;
  participants: ParticipantView[];
  ringing: Person[];
  declined: Person[];
};

export type SignalView = { id: number; from: number; kind: "offer" | "answer" | "ice"; payload: unknown };

const TERMINAL: CallStatus[] = ["ended", "declined", "missed", "cancelled"];
export const isTerminal = (s: CallStatus) => TERMINAL.includes(s);

const nameOf = (u: { displayUsername: string | null; username: string | null; name: string | null } | undefined) =>
  u?.displayUsername || u?.username || u?.name || "Someone";

async function people(ids: string[]) {
  const map = new Map<string, Person & { online: boolean }>();
  if (ids.length === 0) return map;
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
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(user.id, ids));
  for (const r of rows) {
    const screenName = nameOf(r);
    map.set(r.id, {
      userId: r.id,
      screenName,
      username: r.username ?? "",
      initials: initials(screenName),
      avatar: r.avatarColor ?? "#000080",
      online: isOnline(r),
    });
  }
  return map;
}

const strip = ({ userId, screenName, username, initials, avatar }: Person): Person => ({ userId, screenName, username, initials, avatar });

/* ---------- lifecycle ---------- */

/** Ends a call once and writes its line into the conversation. */
export async function finishCall(callId: number, status: CallStatus, byUserId: string | null, endedAt = new Date()) {
  const [updated] = await db
    .update(calls)
    .set({ status, endedAt, endedBy: byUserId })
    .where(and(eq(calls.id, callId), inArray(calls.status, ["ringing", "active"])))
    .returning();
  if (!updated) return null;
  await db.update(callParticipants).set({ leftAt: endedAt }).where(and(eq(callParticipants.callId, callId), isNull(callParticipants.leftAt)));
  await db.update(callRings).set({ status: "missed" }).where(and(eq(callRings.callId, callId), eq(callRings.status, "ringing")));

  const [conv] = await db.select({ kind: conversations.kind }).from(conversations).where(eq(conversations.id, updated.conversationId));
  let body: string;
  if (status === "ended" && updated.answeredAt) {
    const secs = Math.max(0, Math.round((endedAt.getTime() - updated.answeredAt.getTime()) / 1000));
    body =
      conv?.kind === "dm"
        ? `call:ended:${secs}:${updated.withVideo ? "video" : "voice"}`
        : `call:group:${secs}:${updated.peakParticipants}`;
  } else {
    body = `call:${status === "ended" ? "cancelled" : status}`;
  }
  await db.insert(messages).values({
    conversationId: updated.conversationId,
    senderId: updated.startedBy ?? updated.callerId,
    kind: "system",
    body,
  });
  return updated;
}

/**
 * Tidies a call before anyone reads it:
 * - rings older than 45s become missed;
 * - people whose call window went quiet for 30s have left;
 * - a call with nobody left in it ends;
 * - a call that rang people, was never answered and has no rings left ends (declined or missed).
 */
export async function sweepCall(callId: number) {
  const call = await getCallRow(callId);
  if (!call || isTerminal(call.status)) return call;
  const now = Date.now();

  await db
    .update(callRings)
    .set({ status: "missed" })
    .where(and(eq(callRings.callId, callId), eq(callRings.status, "ringing"), lt(callRings.createdAt, new Date(now - RING_TIMEOUT_MS))));
  await db
    .update(callParticipants)
    .set({ leftAt: sql`${callParticipants.lastSeenAt}` })
    .where(
      and(
        eq(callParticipants.callId, callId),
        isNull(callParticipants.leftAt),
        lt(callParticipants.lastSeenAt, new Date(now - HEARTBEAT_TIMEOUT_MS)),
      ),
    );

  const [parts, rings] = await Promise.all([
    db.select().from(callParticipants).where(eq(callParticipants.callId, callId)),
    db.select().from(callRings).where(eq(callRings.callId, callId)),
  ]);
  const active = parts.filter((p) => !p.leftAt);

  const dmOver = active.length === 1 && !!call.answeredAt && (await isDmCall(call.conversationId));
  if (dmOver || (active.length === 0 && (parts.length > 0 || now - call.createdAt.getTime() > EMPTY_GRACE_MS))) {
    // The call really ended when the last person left, not now.
    const lastLeft = Math.max(call.createdAt.getTime(), ...parts.map((p) => p.leftAt?.getTime() ?? 0));
    return finishCall(callId, call.answeredAt ? "ended" : "cancelled", null, new Date(Math.min(now, lastLeft)));
  }
  if (!call.answeredAt && rings.length > 0 && !rings.some((r) => r.status === "ringing" || r.status === "joined")) {
    return finishCall(callId, rings.some((r) => r.status === "declined") ? "declined" : "missed", null);
  }
  return call;
}

async function isDmCall(conversationId: number) {
  const [c] = await db.select({ kind: conversations.kind }).from(conversations).where(eq(conversations.id, conversationId));
  return c?.kind === "dm";
}

export async function getCallRow(callId: number) {
  const [row] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  return row ?? null;
}

/** The conversation behind a call, only if the viewer is a member. */
export async function convForMember(conversationId: number, viewerId: string) {
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) return null;
  const members = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
  if (!members.some((m) => m.userId === viewerId)) return null;
  return { conv, memberIds: members.map((m) => m.userId) };
}

export async function activeParticipants(callId: number) {
  return db
    .select()
    .from(callParticipants)
    .where(and(eq(callParticipants.callId, callId), isNull(callParticipants.leftAt)))
    .orderBy(asc(callParticipants.id));
}

export async function getCallView(callId: number, viewerId: string): Promise<CallView | null> {
  await sweepCall(callId);
  const call = await getCallRow(callId);
  if (!call) return null;
  const c = await convForMember(call.conversationId, viewerId);
  if (!c) return null;

  const [parts, rings] = await Promise.all([
    activeParticipants(callId),
    db.select().from(callRings).where(eq(callRings.callId, callId)),
  ]);
  const starterId = call.startedBy ?? call.callerId;
  const ids = [...new Set([...parts.map((p) => p.userId), ...rings.map((r) => r.userId), ...c.memberIds, ...(starterId ? [starterId] : [])])];
  const who = await people(ids);
  const kind = c.conv.kind as ConvKind;
  const peerId = kind === "dm" ? c.memberIds.find((m) => m !== viewerId) : undefined;
  const peer = peerId ? (who.get(peerId) ?? null) : null;
  const starter = starterId ? who.get(starterId) : undefined;

  return {
    id: call.id,
    conversationId: call.conversationId,
    kind,
    title: kind === "dm" ? (peer?.screenName ?? "Someone") : (c.conv.name ?? "Chat Room"),
    status: call.status,
    withVideo: call.withVideo,
    startedByMe: starterId === viewerId,
    starter: starter ? strip(starter) : null,
    peer,
    answeredAt: call.answeredAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    endedByMe: call.endedBy === viewerId,
    peak: call.peakParticipants,
    max: MAX_IN_CALL,
    participants: parts.flatMap((p) => {
      const u = who.get(p.userId);
      return u ? [{ ...strip(u), pid: p.id, withVideo: p.withVideo }] : [];
    }),
    ringing: rings.flatMap((r) => (r.status === "ringing" && who.get(r.userId) ? [strip(who.get(r.userId)!)] : [])),
    declined: rings.flatMap((r) => (r.status === "declined" && who.get(r.userId) ? [strip(who.get(r.userId)!)] : [])),
  };
}

/** Signals addressed to this participant session after `after`. */
export async function getSignals(callId: number, pid: number, after: number): Promise<SignalView[]> {
  const rows = await db
    .select({ id: callSignals.id, from: callSignals.fromParticipantId, kind: callSignals.kind, payload: callSignals.payload })
    .from(callSignals)
    .where(and(eq(callSignals.callId, callId), eq(callSignals.toParticipantId, pid), gt(callSignals.id, after)))
    .orderBy(asc(callSignals.id));
  return rows.map((r) => ({ ...r, from: r.from ?? 0 }));
}

/** Records that this participant's window is still open. False if they've left (or the session isn't theirs). */
export async function heartbeat(callId: number, pid: number, userId: string) {
  const rows = await db
    .update(callParticipants)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(callParticipants.id, pid),
        eq(callParticipants.callId, callId),
        eq(callParticipants.userId, userId),
        isNull(callParticipants.leftAt),
      ),
    )
    .returning({ id: callParticipants.id });
  return rows.length > 0;
}

/** The live call this user is in right now (for the busy check). */
export async function currentCallFor(userId: string, exceptCallId?: number) {
  const rows = await db
    .select({ callId: callParticipants.callId })
    .from(callParticipants)
    .innerJoin(calls, eq(calls.id, callParticipants.callId))
    .where(and(eq(callParticipants.userId, userId), isNull(callParticipants.leftAt), eq(calls.status, "active")));
  for (const { callId } of rows) {
    if (callId === exceptCallId) continue;
    const c = await sweepCall(callId);
    if (!c || isTerminal(c.status)) continue;
    const [still] = await db
      .select({ id: callParticipants.id })
      .from(callParticipants)
      .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId), isNull(callParticipants.leftAt)))
      .limit(1);
    if (still) return callId;
  }
  return null;
}

/** The live call in a conversation, if any. */
export async function liveCallIn(conversationId: number) {
  const rows = await db
    .select({ id: calls.id })
    .from(calls)
    .where(and(eq(calls.conversationId, conversationId), eq(calls.status, "active")))
    .orderBy(desc(calls.id));
  for (const r of rows) {
    const c = await sweepCall(r.id);
    if (c && !isTerminal(c.status)) return c;
  }
  return null;
}

/** Live calls (with how many people are in each) for a set of conversations. Cheap: no sweeping. */
export async function liveCallsFor(conversationIds: number[]) {
  const map = new Map<number, { id: number; count: number }>();
  if (conversationIds.length === 0) return map;
  const fresh = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const rows = await db
    .select({
      conversationId: calls.conversationId,
      id: calls.id,
      count: sql<number>`count(${callParticipants.id}) filter (where ${callParticipants.leftAt} is null and ${callParticipants.lastSeenAt} > ${fresh})`.mapWith(
        Number,
      ),
    })
    .from(calls)
    .leftJoin(callParticipants, eq(callParticipants.callId, calls.id))
    .where(and(inArray(calls.conversationId, conversationIds), eq(calls.status, "active")))
    .groupBy(calls.conversationId, calls.id)
    .orderBy(desc(calls.id));
  for (const r of rows) if (r.count > 0 && !map.has(r.conversationId)) map.set(r.conversationId, { id: r.id, count: r.count });
  return map;
}

/** The newest call ringing for this user, if any. */
export async function incomingCallFor(userId: string) {
  const rows = await db
    .select({ callId: callRings.callId })
    .from(callRings)
    .innerJoin(calls, eq(calls.id, callRings.callId))
    .where(
      and(
        eq(callRings.userId, userId),
        eq(callRings.status, "ringing"),
        eq(calls.status, "active"),
        gt(callRings.createdAt, new Date(Date.now() - RING_TIMEOUT_MS)),
      ),
    )
    .orderBy(desc(callRings.callId))
    .limit(3);
  for (const r of rows) {
    const view = await getCallView(r.callId, userId);
    if (view?.status === "active" && view.ringing.some((p) => p.userId === userId)) return view;
  }
  return null;
}

/**
 * Takes one participant session out of a call. The last person out ends it, and a starter who
 * leaves before anyone answered stops the ringing. Route handlers call this (not a server action),
 * so it never waits behind the page's other requests.
 */
export async function leaveParticipant(callId: number, viewerId: string, pid: number) {
  const call = await getCallRow(callId);
  if (!call) return false;
  const left = await db
    .update(callParticipants)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(callParticipants.id, pid),
        eq(callParticipants.callId, callId),
        eq(callParticipants.userId, viewerId),
        isNull(callParticipants.leftAt),
      ),
    )
    .returning({ id: callParticipants.id });
  if (!left.length) return false;
  if (!call.answeredAt && call.startedBy === viewerId) {
    await db.update(callRings).set({ status: "missed" }).where(and(eq(callRings.callId, callId), eq(callRings.status, "ringing")));
  }
  const remaining = (await activeParticipants(callId)).length;
  if (remaining === 0 || (remaining === 1 && call.answeredAt && (await isDmCall(call.conversationId)))) {
    // A 1:1 call ends for both when either person hangs up, like a phone. Groups stay open until the last one leaves.
    await finishCall(callId, call.answeredAt ? "ended" : "cancelled", viewerId);
  }
  return true;
}

const SIGNAL_KINDS = ["offer", "answer", "ice"] as const;

/** Stores a WebRTC message from one of the viewer's participant sessions to another session in the same call. */
export async function storeSignal(viewerId: string, callId: number, fromPid: number, toPid: number, kind: string, payload: unknown) {
  if (!SIGNAL_KINDS.includes(kind as (typeof SIGNAL_KINDS)[number])) return false;
  if (JSON.stringify(payload ?? null).length > 20_000) return false;
  const [from] = await db
    .select({ id: callParticipants.id })
    .from(callParticipants)
    .where(
      and(
        eq(callParticipants.id, fromPid),
        eq(callParticipants.callId, callId),
        eq(callParticipants.userId, viewerId),
        isNull(callParticipants.leftAt),
      ),
    )
    .limit(1);
  const [to] = await db
    .select({ id: callParticipants.id })
    .from(callParticipants)
    .where(and(eq(callParticipants.id, toPid), eq(callParticipants.callId, callId), ne(callParticipants.id, fromPid)))
    .limit(1);
  if (!from || !to) return false;
  await db.insert(callSignals).values({
    callId,
    fromUserId: viewerId,
    fromParticipantId: fromPid,
    toParticipantId: toPid,
    kind: kind as (typeof SIGNAL_KINDS)[number],
    payload: payload ?? null,
  });
  return true;
}
