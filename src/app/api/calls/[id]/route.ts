import { NextResponse } from "next/server";
import { getCallView, getSignals, heartbeat } from "@/lib/call-data";
import { getViewer } from "@/lib/session";

/**
 * Polled by the call window.
 * With `?pid=` (the viewer's participant session): heartbeat + the signals addressed to it after `?after=`.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/calls/[id]">) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Signed off" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const q = new URL(req.url).searchParams;
  const pid = Number(q.get("pid") ?? 0) || 0;
  const after = Number(q.get("after") ?? 0) || 0;

  const inCall = pid > 0 ? await heartbeat(id, pid, viewer.id) : false;
  const call = await getCallView(id, viewer.id);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const signals = inCall ? await getSignals(id, pid, after) : [];
  return NextResponse.json({ call, signals, inCall });
}
