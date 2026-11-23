import Link from "next/link";
import type { BuddyEntry } from "@/lib/profile-data";
import { dotColor } from "@/lib/presence";
import { PanelTitle, VisitorCounter } from "@/components/retro/retro";

export function BuddyListPanel({ buddies }: { buddies: BuddyEntry[] }) {
  const online = buddies.filter((b) => b.online).length;
  return (
    <div className="bevel-out w-full flex-none bg-win-gray p-0.5 md:w-[180px]">
      <PanelTitle>Buddy List</PanelTitle>
      <div className="bevel-in mx-[3px] my-1 bg-white px-1.5 py-1 font-verdana text-[11px]">
        <div className="mb-[3px] font-bold">
          Buddies ({online}/{buddies.length})
        </div>
        {buddies.length === 0 && <div className="pl-2 text-win-shadow italic">No buddies yet!</div>}
        {buddies.map((b) => (
          <Link
            key={b.username}
            href={`/members/${b.username}`}
            className="tap flex min-w-0 items-center gap-[5px] py-0.5 pl-2 no-underline"
            style={{ color: b.online ? "#000" : "#808080" }}
          >
            <span className="size-[7px] flex-none border border-black" style={{ background: dotColor(b.online) }} />
            <span className="truncate">{b.screenName}</span>
          </Link>
        ))}
      </div>
      <div className="pt-[3px] pb-[5px] text-center font-verdana text-[10px]">
        Visitors: <VisitorCounter />
      </div>
    </div>
  );
}
