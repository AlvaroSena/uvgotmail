import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CallWindow } from "@/components/call/call-window";
import { getCallView } from "@/lib/call-data";
import { requireViewer, touchPresence } from "@/lib/session";

export const metadata: Metadata = { title: "Video Chat - You've Got a Mail" };

export default function CallPage(props: PageProps<"/call/[callId]">) {
  return (
    <div className="min-h-dvh bg-teal md:py-6">
      <div className="mx-auto w-full md:w-[800px]">
        <Suspense fallback={<CallLoading />}>
          <Call {...props} />
        </Suspense>
      </div>
    </div>
  );
}

async function Call({ params, searchParams }: PageProps<"/call/[callId]">) {
  const { callId } = await params;
  const id = Number(callId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const viewer = await requireViewer();
  await touchPresence(viewer.id);
  const call = await getCallView(id, viewer.id);
  if (!call) notFound();
  const answer = (await searchParams).answer;
  return <CallWindow key={id} initial={call} answerMode={answer === "voice" ? "voice" : answer === "video" ? "video" : null} />;
}

function CallLoading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-win-gray font-tahoma text-[11px] md:h-[640px]">
      <span className="bevel-thin-in px-2 py-1">Loading video chat...</span>
    </div>
  );
}
