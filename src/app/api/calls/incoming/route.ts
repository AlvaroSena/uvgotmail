import { NextResponse } from "next/server";
import { incomingCallFor } from "@/lib/call-data";
import { getViewer } from "@/lib/session";

/** Polled by IncomingCallWatcher: the newest call ringing for the viewer. */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ call: null });
  return NextResponse.json({ call: await incomingCallFor(viewer.id) });
}
