import { IncomingCallWatcher } from "@/components/call/incoming-call-watcher";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chats - You've Got a Mail" };

export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return (
    <div className="min-h-dvh bg-[#a8a8a8] md:py-6">
      <div className="mx-auto w-full md:w-[800px] md:shadow-[0_1px_3px_rgba(0,0,0,.3)]">{children}</div>
      <IncomingCallWatcher />
    </div>
  );
}
