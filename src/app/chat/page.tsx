import { Suspense } from "react";
import { ChatListScreen } from "@/components/chat/chat-app";
import { ChatLoading } from "@/components/chat/chat-loading";
import { countOnlineBuddies, listConversations } from "@/lib/chat-data";
import { requireViewer, touchPresence } from "@/lib/session";

export default function ChatIndex() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <Conversations />
    </Suspense>
  );
}

/** Phones: the Conversations screen. Desktop: the client forwards to the latest conversation. */
async function Conversations() {
  const viewer = await requireViewer();
  await touchPresence(viewer.id);
  const [list, onlineCount] = await Promise.all([listConversations(viewer.id), countOnlineBuddies(viewer.id)]);
  return (
    <ChatListScreen
      initial={{ list, onlineCount, unreadTotal: list.reduce((n, c) => n + c.unread, 0) }}
      latestId={list[0]?.id ?? null}
      viewerUsername={viewer.screenName.toLowerCase()}
    />
  );
}
