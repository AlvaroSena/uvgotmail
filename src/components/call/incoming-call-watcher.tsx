"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { declineCall } from "@/actions/calls";
import { Envelope } from "@/components/pixel/icons";
import { WinTitleBar } from "@/components/retro/retro";
import type { CallView } from "@/lib/call-data";
import { playRing, stopRinging } from "@/lib/dialup-sound";

/** Polls for calls ringing for the viewer and shows the Win98 "incoming call" dialog. */
export function IncomingCallWatcher() {
  const router = useRouter();
  const [call, setCall] = useState<CallView | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/calls/incoming", { method: "POST", cache: "no-store" });
        if (res.ok && live) setCall(((await res.json()) as { call: CallView | null }).call);
      } catch {}
      if (live) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  const showing = call && call.id !== dismissed ? call : null;
  const ringingId = showing?.id ?? null;

  useEffect(() => {
    if (!ringingId) return;
    playRing();
    return stopRinging;
  }, [ringingId]);

  if (!showing) return null;
  const voiceOnlyCall = !showing.withVideo;
  const caller = showing.starter;

  const go = (mode: "video" | "voice") => {
    stopRinging();
    setDismissed(showing.id);
    router.push(`/call/${showing.id}?answer=${mode}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
      <div role="alertdialog" aria-label="Incoming call" className="bevel-window w-full max-w-[340px] bg-win-gray p-0.5 font-tahoma text-[11px] text-black">
        <WinTitleBar title="Incoming Call" icon={false} />
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          <div
            className="flex size-14 flex-none animate-bob items-center justify-center border border-black font-verdana text-lg font-bold text-white"
            style={{ background: caller?.avatar ?? "#000080" }}
          >
            {caller?.initials ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="truncate font-times text-base font-bold text-navy">{caller?.screenName ?? "Someone"}</div>
            <div className="flex items-center gap-1">
              <Envelope size="xs" />
              <span className="min-w-0 truncate">
                is {voiceOnlyCall ? "voice" : "video"} calling {showing.kind === "dm" ? "you" : <b>{showing.title}</b>}...
              </span>
            </div>
            {showing.kind !== "dm" && showing.participants.length > 0 && (
              <div className="mt-0.5 text-win-dark">
                {showing.participants.length}/{showing.max} in the call
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 px-3 pb-3">
          {!voiceOnlyCall && (
            <button type="button" autoFocus onClick={() => go("video")} className="bevel-btn tap px-3 py-[3px] font-bold">
              📹 Accept
            </button>
          )}
          <button type="button" autoFocus={voiceOnlyCall} onClick={() => go("voice")} className={`bevel-btn tap px-3 py-[3px] ${voiceOnlyCall ? "font-bold" : ""}`}>
            🎤 {voiceOnlyCall ? "Accept" : "Voice Only"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                stopRinging();
                setDismissed(showing.id);
                await declineCall(showing.id).catch(() => {});
              })
            }
            className="bevel-btn tap px-3 py-[3px] text-alert"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
