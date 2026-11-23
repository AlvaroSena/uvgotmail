import Link from "next/link";

/** Butter-yellow bar under the thread header while a video call is going on in this conversation. */
export function JoinCallBar({ call }: { call: { id: number; count: number; max: number } }) {
  const full = call.count >= call.max;
  return (
    <div role="status" className="mt-1 flex items-center gap-2 border border-black bg-butter px-2 py-1 font-verdana text-[11px]">
      <span className="size-2 flex-none animate-blink border border-black bg-lcd" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        📹 <b>Video call in progress</b> · {call.count}/{call.max} in call
      </span>
      {full ? (
        <span className="bevel-thin-in flex-none px-2 py-px font-tahoma text-win-dark">Full</span>
      ) : (
        <Link
          href={`/call/${call.id}`}
          className="bevel-btn tap inline-flex flex-none items-center px-3 py-px font-tahoma font-bold text-black! no-underline"
        >
          Join
        </Link>
      )}
    </div>
  );
}
