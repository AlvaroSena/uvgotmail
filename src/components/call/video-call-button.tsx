"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startCall } from "@/actions/calls";
import { openDm } from "@/actions/chat";

type Props = ({ conversationId: number; targetId?: never } | { targetId: string; conversationId?: never }) & {
  peerName: string;
  className?: string;
  label?: string;
  /** Icon-only on phones (the label stays as the accessible name). */
  compact?: boolean;
};

/** Rings a buddy. Works from a DM (conversationId) or a profile (targetId). */
export function VideoCallButton({ conversationId, targetId, peerName, className = "", label = "Video Call", compact = false }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const call = () =>
    start(async () => {
      setError(null);
      try {
        const conv = conversationId ?? (await openDm(targetId!));
        const r = await startCall(conv, true);
        if (!("error" in r)) return router.push(`/call/${r.callId}`);
        setError(
          r.error === "busy"
            ? `${peerName} is on another call.`
            : r.error === "self-busy"
              ? "You're already on a call. Hang up there first."
              : "You're not in this conversation anymore.",
        );
      } catch {
        setError("Couldn't start the call. Try again.");
      }
    });

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={pending}
        onClick={call}
        aria-label={compact ? label : undefined}
        className={`bevel-btn tap whitespace-nowrap ${className}`}
      >
        📹 <span className={compact ? "hidden sm:inline" : undefined}>{pending ? "Dialing..." : label}</span>
      </button>
      {error && (
        <span
          role="alert"
          onClick={() => setError(null)}
          className="absolute top-full right-0 z-20 mt-1 w-max max-w-[220px] cursor-pointer border border-black bg-tooltip px-1.5 py-1 font-tahoma text-[11px] text-black shadow-[2px_2px_0_rgba(0,0,0,.3)]"
        >
          {error}
        </span>
      )}
    </span>
  );
}
