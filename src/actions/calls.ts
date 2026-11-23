"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { callParticipants, callRings, calls } from "@/db/schema";
import {
  activeParticipants,
  convForMember,
  currentCallFor,
  getCallView,
  isTerminal,
  liveCallIn,
  MAX_IN_CALL,
  sweepCall,
  type CallView,
} from "@/lib/call-data";
import { requireViewer } from "@/lib/session";

const Id = z.number().int().positive();

export type StartCallResult = { callId: number } | { error: "busy" | "self-busy" | "not-member"; peerName?: string; callId?: number };

/**
 * Starts a call in a conversation, or returns the one already going there (drop-in).
 * DMs and groups ring every other member; public rooms don't ring anyone.
 */
export async function startCall(conversationId: number, withVideo: boolean): Promise<StartCallResult> {
  const viewer = await requireViewer();
  Id.parse(conversationId);
  const c = await convForMember(conversationId, viewer.id);
  if (!c) return { error: "not-member" };

  const live = await liveCallIn(conversationId);
  if (live) return { callId: live.id };

  const mine = await currentCallFor(viewer.id);
  if (mine) return { error: "self-busy", callId: mine };

  const others = c.memberIds.filter((m) => m !== viewer.id);
  if (c.conv.kind === "dm" && others[0] && (await currentCallFor(others[0]))) return { error: "busy" };

  const [call] = await db
    .insert(calls)
    .values({ conversationId, startedBy: viewer.id, status: "active", withVideo: z.boolean().parse(withVideo) })
    .returning({ id: calls.id });
  if (c.conv.kind !== "room" && others.length) {
    await db.insert(callRings).values(others.map((userId) => ({ callId: call.id, userId })));
  }
  return { callId: call.id };
}

export type JoinResult =
  | { pid: number; call: CallView }
  | { error: "full" | "ended" | "self-busy" | "not-member"; call?: CallView | null; busyCallId?: number };

/** Puts the viewer into a call (after they've allowed camera / mic). */
export async function joinCall(callId: number, withVideo: boolean): Promise<JoinResult> {
  const viewer = await requireViewer();
  Id.parse(callId);
  const call = await sweepCall(callId);
  if (!call) return { error: "not-member" };
  if (!(await convForMember(call.conversationId, viewer.id))) return { error: "not-member" };
  if (isTerminal(call.status)) return { error: "ended", call: await getCallView(callId, viewer.id) };

  const busy = await currentCallFor(viewer.id, callId);
  if (busy) return { error: "self-busy", busyCallId: busy };

  // Joining from a second window replaces the first one.
  await db
    .update(callParticipants)
    .set({ leftAt: new Date() })
    .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, viewer.id), isNull(callParticipants.leftAt)));

  const present = await activeParticipants(callId);
  if (present.length >= MAX_IN_CALL) return { error: "full", call: await getCallView(callId, viewer.id) };

  const [me] = await db
    .insert(callParticipants)
    .values({ callId, userId: viewer.id, withVideo: z.boolean().parse(withVideo) })
    .returning({ id: callParticipants.id });
  await db
    .update(callRings)
    .set({ status: "joined" })
    .where(and(eq(callRings.callId, callId), eq(callRings.userId, viewer.id)));

  const count = present.length + 1;
  await db
    .update(calls)
    .set({
      peakParticipants: Math.max(call.peakParticipants, count),
      ...(count >= 2 && !call.answeredAt ? { answeredAt: new Date() } : {}),
    })
    .where(eq(calls.id, callId));

  // Over the limit because two people joined at the same moment: the later one backs out.
  const after = await activeParticipants(callId);
  if (after.findIndex((p) => p.id === me.id) >= MAX_IN_CALL) {
    await db.update(callParticipants).set({ leftAt: new Date() }).where(eq(callParticipants.id, me.id));
    return { error: "full", call: await getCallView(callId, viewer.id) };
  }

  const view = await getCallView(callId, viewer.id);
  return view ? { pid: me.id, call: view } : { error: "ended" };
}

/** "Decline" on the incoming-call dialog. */
export async function declineCall(callId: number) {
  const viewer = await requireViewer();
  Id.parse(callId);
  await db
    .update(callRings)
    .set({ status: "declined" })
    .where(and(eq(callRings.callId, callId), eq(callRings.userId, viewer.id), eq(callRings.status, "ringing")));
  await sweepCall(callId);
}
