import { NextResponse } from "next/server";
import { leaveParticipant } from "@/lib/call-data";
import { getViewer } from "@/lib/session";

/** Leaves the call (`?pid=`): the Hang Up button, and `navigator.sendBeacon` when the window closes. */
export async function POST(req: Request, ctx: RouteContext<"/api/calls/[id]/hangup">) {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse(null, { status: 401 });
  const id = Number((await ctx.params).id);
  const pid = Number(new URL(req.url).searchParams.get("pid") ?? 0);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(pid) || pid <= 0) return new NextResponse(null, { status: 400 });
  await leaveParticipant(id, viewer.id, pid);
  return new NextResponse(null, { status: 204 });
}
