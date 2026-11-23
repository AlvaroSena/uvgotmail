import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatApp } from "@/components/chat/chat-app";
import { ChatLoading } from "@/components/chat/chat-loading";
import { getChatState } from "@/lib/chat-data";
import { requireViewer, touchPresence } from "@/lib/session";

type Params = PageProps<"/chat/[conversationId]">["params"];

export default function ConversationPage({ params }: PageProps<"/chat/[conversationId]">) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: Params }) {
  const { conversationId } = await params;
  const id = Number(conversationId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const viewer = await requireViewer();
  await touchPresence(viewer.id);
  const state = await getChatState(viewer, id);
  if (!state) notFound();

  return <ChatApp key={id} initial={state} viewerName={viewer.screenName} viewerUsername={viewer.screenName.toLowerCase()} />;
}
