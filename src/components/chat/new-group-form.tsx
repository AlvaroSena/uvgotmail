"use client";

import { useActionState, useEffect, useState } from "react";
import { buddiesForGroup, createGroup, type NewGroupState } from "@/actions/groups";
import { dotColor } from "@/lib/presence";

type Buddy = { username: string; screenName: string; online: boolean };

/** "+ New › New Group": name, buddy checkboxes and extra screen names. */
export function NewGroupForm() {
  const [state, action, pending] = useActionState<NewGroupState, FormData>(createGroup, {});
  const [buddies, setBuddies] = useState<Buddy[] | null>(null);
  const v = state.values;

  useEffect(() => {
    let live = true;
    buddiesForGroup()
      .then((b) => live && setBuddies(b))
      .catch(() => live && setBuddies([]));
    return () => {
      live = false;
    };
  }, []);

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <label className="block">
        <span className="mb-[3px] block font-bold">Group name:</span>
        <input
          name="name"
          autoFocus
          required
          maxLength={30}
          defaultValue={v?.name}
          placeholder="Mixtape Club"
          className="bevel-in w-full bg-white px-1 py-0.5 font-courier text-[11px] outline-none"
        />
      </label>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-[3px] p-0 font-bold">Invite buddies:</legend>
        <div className="bevel-in max-h-[132px] overflow-y-auto bg-white px-1 py-0.5">
          {buddies === null ? (
            <div className="py-1 text-win-shadow italic">Loading your Buddy List...</div>
          ) : buddies.length === 0 ? (
            <div className="py-1 text-win-shadow italic">Your Buddy List is empty. Type screen names below.</div>
          ) : (
            buddies.map((b) => (
              <label key={b.username} className="tap flex cursor-pointer items-center gap-1.5 py-0.5">
                <input type="checkbox" name="members" value={b.username} defaultChecked={v?.members.includes(b.username)} className="m-0" />
                <span className="size-[7px] flex-none border border-black" style={{ background: dotColor(b.online) }} />
                <span className="truncate">{b.screenName}</span>
              </label>
            ))
          )}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-[3px] block font-bold">More screen names (comma separated):</span>
        <input
          name="more"
          defaultValue={v?.more}
          placeholder="PenPal_Paris, skater_boi77"
          className="bevel-in w-full bg-white px-1 py-0.5 font-courier text-[11px] outline-none"
        />
      </label>
      {state.error && (
        <div role="alert" className="font-bold text-alert">
          {state.error}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-win-dark">3–12 people, including you.</span>
        <button type="submit" disabled={pending} className="bevel-btn tap flex-none px-3 py-px font-tahoma text-[11px] font-bold">
          {pending ? "Creating..." : "Create Group"}
        </button>
      </div>
    </form>
  );
}
