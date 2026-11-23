import { NextResponse } from "next/server";
import { countOnlineBuddies, listConversations } from "@/lib/chat-data";
import type { ChatListState } from "@/lib/chat-types";
import { getViewer, touchPresence } from "@/lib/session";

/** Polled by the phone conversation list: conversations + counts, without opening (marking read) any thread. */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Signed off" }, { status: 401 });
  await touchPresence(viewer.id);
  const [list, onlineCount] = await Promise.all([listConversations(viewer.id), countOnlineBuddies(viewer.id)]);
  const body: ChatListState = { list, unreadTotal: list.reduce((n, c) => n + c.unread, 0), onlineCount };
  return NextResponse.json(body);
}
