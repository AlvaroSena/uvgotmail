import { NextResponse } from "next/server";
import { storeSignal } from "@/lib/call-data";
import { getViewer } from "@/lib/session";

/**
 * WebRTC offers, answers and ICE candidates between two participant sessions.
 * A route handler (not a server action) so many can be in flight at once: server actions
 * from one page run one at a time, which made connecting slow and queued up Hang Up.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/calls/[id]/signal">) {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse(null, { status: 401 });
  const id = Number((await ctx.params).id);
  const body = (await req.json().catch(() => null)) as { from?: unknown; to?: unknown; kind?: unknown; payload?: unknown } | null;
  const from = Number(body?.from);
  const to = Number(body?.to);
  if (![id, from, to].every((n) => Number.isInteger(n) && n > 0) || typeof body?.kind !== "string") {
    return new NextResponse(null, { status: 400 });
  }
  const ok = await storeSignal(viewer.id, id, from, to, body.kind, body.payload);
  return new NextResponse(null, { status: ok ? 204 : 409 });
}
