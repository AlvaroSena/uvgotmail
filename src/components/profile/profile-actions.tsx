"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toggleBuddy } from "@/actions/buddies";
import { openDm, sendMessage } from "@/actions/chat";
import { Envelope } from "@/components/pixel/icons";
import { WinTitleBar } from "@/components/retro/retro";
import { VideoCallButton } from "@/components/call/video-call-button";
import { useChatSync } from "@/components/chat/use-chat-sync";

type Props = {
  targetId: string;
  targetName: string;
  profilePath: string;
  isBuddy: boolean;
  isSelf: boolean;
};

export function ProfileActions({ targetId, targetName, profilePath, isBuddy, isSelf }: Props) {
  const [imOpen, setImOpen] = useState(false);
  const [buddy, setBuddyOptimistic] = useOptimistic(isBuddy);
  const [, startTransition] = useTransition();

  if (isSelf) {
    return <div className="mt-2.5 font-verdana text-[11px] text-win-dark italic">This is your profile. Lookin&apos; good!</div>;
  }

  return (
    <>
      <div className="mt-2.5 -ml-[76px] flex flex-col gap-1.5 md:ml-0 md:flex-row">
        <button
          type="button"
          onClick={() => setImOpen(true)}
          className="bevel-btn tap flex items-center justify-center gap-[5px] px-3 py-1 font-arial text-xs font-bold"
        >
          <Envelope size="xs" />
          Send Instant Message
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              setBuddyOptimistic(!buddy);
              await toggleBuddy(targetId, profilePath);
            })
          }
          className="bevel-btn tap px-3 py-1 font-arial text-xs"
        >
          {buddy ? "On your Buddy List" : "Add to Buddy List"}
        </button>
        <VideoCallButton targetId={targetId} peerName={targetName} className="flex w-full items-center justify-center px-3 py-1 font-arial text-xs md:w-auto" />
      </div>
      {imOpen && <ImWindow targetId={targetId} targetName={targetName} onClose={() => setImOpen(false)} />}
    </>
  );
}

function ImWindow({ targetId, targetName, onClose }: { targetId: string; targetName: string; onClose: () => void }) {
  const [convId, setConvId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { state, refresh } = useChatSync(convId);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    openDm(targetId)
      .then((id) => live && setConvId(id))
      .catch(() => live && setError("Couldn't open the IM window."));
    return () => {
      live = false;
    };
  }, [targetId]);

  const count = state?.messages.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || convId == null) return;
    setDraft("");
    try {
      await sendMessage(convId, text);
      await refresh();
    } catch {
      setError("Message didn't go through. Try again?");
      setDraft(text);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`${targetName} - Instant Message`}
      className="bevel-window fixed inset-x-0 bottom-0 z-20 w-full pb-[env(safe-area-inset-bottom)] md:absolute md:inset-x-auto md:top-[150px] md:bottom-auto md:left-[150px] md:w-[340px] md:pb-0.5 bg-win-gray p-0.5 font-tahoma text-[11px] shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#808080,4px_4px_0_rgba(0,0,0,.3)]"
    >
      <WinTitleBar title={`${targetName} - Instant Message`} onClose={onClose} />
      <div ref={logRef} className="bevel-in mx-[3px] my-1 h-[45dvh] overflow-auto md:h-[150px] bg-white px-1.5 py-[5px] font-arial text-xs/[1.5]">
        {convId == null && !error && <div className="text-win-shadow italic">Connecting at 56,000 bps...</div>}
        {state && state.messages.length === 0 && <div className="text-win-shadow italic">No messages yet. Say hi! :-)</div>}
        {state?.messages.map((m) =>
          m.kind === "system" ? (
            <div key={m.id} className="text-center text-[11px] text-win-shadow italic">
              *** {m.body} ***
            </div>
          ) : (
            <div key={m.id}>
              <b style={{ color: m.mine ? "#0000CC" : "#CC0000" }}>{m.senderName}:</b> {m.body}
            </div>
          ),
        )}
        {state?.typing && <div className="text-win-dark italic">{state.typing} is typing...</div>}
        {error && <div className="font-bold text-alert">{error}</div>}
      </div>
      <form onSubmit={send} className="mx-[3px] mb-[3px] flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          aria-label="Message"
          autoFocus
          className="bevel-in min-w-0 flex-1 bg-white px-1 py-[3px] font-arial text-xs outline-none"
        />
        <button type="submit" disabled={convId == null} className="bevel-btn tap px-3 py-[3px] font-tahoma text-[11px] font-bold">
          Send
        </button>
      </form>
    </div>
  );
}
