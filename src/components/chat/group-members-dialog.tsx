"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addMember, leaveGroup, renameGroup } from "@/actions/groups";
import { WinTitleBar } from "@/components/retro/retro";
import type { ChatState } from "@/lib/chat-types";
import { dotColor } from "@/lib/presence";

/** "Members" button in a group's thread header, with its Win98 dialog. */
export function GroupMembersButton({ state }: { state: ChatState }) {
  const [open, setOpen] = useState(false);
  const n = state.members?.length ?? 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Members (${n})`}
        className="bevel-btn tap flex-none px-2.5 py-[3px] font-tahoma text-[11px] font-bold whitespace-nowrap"
      >
        👥 <span className="hidden sm:inline">Members</span> ({n})
      </button>
      {open && <MembersDialog state={state} onClose={() => setOpen(false)} />}
    </>
  );
}

function MembersDialog({ state, onClose }: { state: ChatState; onClose: () => void }) {
  const c = state.current;
  const members = state.members ?? [];
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, start] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const field = "bevel-in min-w-0 flex-1 bg-white px-1 py-0.5 font-courier text-[11px] outline-none";
  const btn = "bevel-btn tap flex-none px-3 py-px font-tahoma text-[11px]";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 md:items-center md:p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`${c.name} members`}
        onClick={(e) => e.stopPropagation()}
        className="bevel-window w-full bg-win-gray p-0.5 font-verdana text-[11px] text-black md:max-w-[380px]"
      >
        <WinTitleBar title={`${c.name} · Members`} onClose={onClose} />
        {confirmLeave ? (
          <div className="flex items-start gap-3 p-3">
            <span className="text-2xl leading-none">⚠</span>
            <div className="min-w-0 flex-1">
              <b>Leave {c.name}?</b>
              <p className="mt-1 mb-0">
                You won&apos;t get its messages anymore, and someone in the group would have to add you back.
                {members.length <= 1 ? " You're the last member, so the group will be deleted." : ""}
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                <button type="button" onClick={() => setConfirmLeave(false)} className={btn}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => leaveGroup(c.id))}
                  className={`${btn} font-bold text-alert`}
                >
                  {pending ? "Leaving..." : "Leave Group"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            <div className="font-tahoma text-win-dark">
              {members.length} of 12 members · {members.filter((m) => m.online).length} online
            </div>
            <ul className="bevel-in m-0 max-h-[40dvh] list-none overflow-y-auto bg-white px-2 py-0.5 md:max-h-[220px]">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 border-b border-dotted border-win-shadow py-1 last:border-b-0">
                  <span
                    className="flex size-6 flex-none items-center justify-center border border-black text-[10px] font-bold text-white"
                    style={{ background: m.avatar }}
                  >
                    {m.initials}
                  </span>
                  <Link href={`/members/${m.username}`} className="min-w-0 flex-1 truncate font-bold">
                    {m.screenName}
                  </Link>
                  <span className="size-[7px] flex-none border border-black" style={{ background: dotColor(m.online) }} />
                  <span className="w-11 flex-none text-win-dark">{m.online ? "Online" : "Away"}</span>
                </li>
              ))}
            </ul>

            <form
              key={addKey}
              action={(fd) =>
                start(async () => {
                  const r = await addMember(c.id, String(fd.get("screenName") ?? ""));
                  if ("error" in r) {
                    setAddError(r.error);
                    setNote(null);
                  }
                  else {
                    setAddError(null);
                    setNote(`Added ${String(fd.get("screenName"))}. They'll show up in a moment.`);
                    setAddKey((k) => k + 1);
                  }
                })
              }
            >
              <label htmlFor="add-member" className="mb-[3px] block font-bold">
                Add a member:
              </label>
              <div className="flex gap-[3px]">
                <input id="add-member" name="screenName" required placeholder="skater_boi77" className={field} />
                <button type="submit" disabled={pending || members.length >= 12} className={`${btn} font-bold`}>
                  Add
                </button>
              </div>
              {addError && <div className="mt-1 font-bold text-alert">{addError}</div>}
            </form>

            <form
              action={(fd) =>
                start(async () => {
                  const r = await renameGroup(c.id, String(fd.get("name") ?? ""));
                  if ("error" in r) {
                    setRenameError(r.error);
                    setNote(null);
                  }
                  else {
                    setRenameError(null);
                    setNote("Renamed. Everyone will see the new name.");
                  }
                })
              }
            >
              <label htmlFor="rename-group" className="mb-[3px] block font-bold">
                Group name:
              </label>
              <div className="flex gap-[3px]">
                <input id="rename-group" name="name" required maxLength={30} defaultValue={c.name} className={field} />
                <button type="submit" disabled={pending} className={btn}>
                  Rename
                </button>
              </div>
              {renameError && <div className="mt-1 font-bold text-alert">{renameError}</div>}
            </form>

            {note && (
              <div role="status" className="border border-win-shadow bg-tooltip px-1.5 py-1">
                {note}
              </div>
            )}

            <div className="flex justify-between gap-1.5 border-t border-white pt-2">
              <button type="button" onClick={() => setConfirmLeave(true)} className={`${btn} text-alert`}>
                Leave Group...
              </button>
              <button type="button" onClick={onClose} className={`${btn} font-bold`}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
