import { NextResponse } from "next/server";
import { getChatState } from "@/lib/chat-data";
import { getViewer, touchPresence } from "@/lib/session";

/** Polled by the chat UI: returns the full chat state and marks the thread read. */
export async function POST(_req: Request, ctx: RouteContext<"/api/chat/[id]">) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Signed off" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  await touchPresence(viewer.id);
  const state = await getChatState(viewer, id);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(state);
}
