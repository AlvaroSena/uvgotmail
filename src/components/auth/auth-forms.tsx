"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOn, signUp, type SignOnState, type SignUpState } from "@/actions/auth";
import { Envelope } from "@/components/pixel/icons";
import { PanelTitle } from "@/components/retro/retro";
import { useSoundEnabled } from "@/hooks/use-sound-enabled";
import { clearPlayedThisSession, markPlayedThisSession, playDialup, stopDialup } from "@/lib/dialup-sound";

function dialIn() {
  playDialup();
  markPlayedThisSession();
}

const field = "bevel-in-deep box-border w-full px-[5px] py-[3px] font-courier text-[13px] outline-none bg-white";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function SignOnForm() {
  const [state, action, pending] = useActionState<SignOnState, FormData>(signOn, {});
  const [soundOn, setSoundOn] = useSoundEnabled();
  // A failed sign on hangs up the modem.
  useEffect(() => {
    if (!state.error) return;
    stopDialup();
    clearPlayedThisSession();
  }, [state]);
  return (
    <form action={action} onSubmit={dialIn} className="bevel-out m-0 bg-win-gray p-[3px]">
      <PanelTitle>
        <Envelope size="xs" />
        Sign On
      </PanelTitle>
      <div className="px-3 pt-3.5 pb-3">
        <div className="mb-2.5 flex justify-center">
          <Envelope size="big" />
        </div>
        <label htmlFor="so-name" className="mb-[3px] block font-verdana text-[11px] font-bold">
          Screen Name:
        </label>
        <input id="so-name" name="screenName" defaultValue={state.screenName} type="text" required autoComplete="username" placeholder="StarGazer99" className={field} />
        <label htmlFor="so-pw" className="mt-2 mb-[3px] block font-verdana text-[11px] font-bold">
          Password:
        </label>
        <input id="so-pw" name="password" type="password" required autoComplete="current-password" className={field} />
        <div className="mt-2 flex flex-col gap-[3px] font-verdana text-[11px]">
          <label className="tap flex items-center gap-1.5 md:gap-1">
            <input type="checkbox" name="remember" defaultChecked className="m-0" />
            Remember my screen name
          </label>
          <label className="tap flex items-center gap-1.5 md:gap-1">
            <input type="checkbox" name="invisible" className="m-0" />
            Sign on invisible
          </label>
          <label className="tap flex items-center gap-1.5 md:gap-1">
            <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} className="m-0" />
            Play modem sounds
          </label>
        </div>
        {state.error && (
          <div role="alert" className="mt-2.5 font-verdana text-[11px] font-bold text-alert">
            {state.error}
          </div>
        )}
        {pending && (
          <div className="mt-2.5 flex items-center gap-2 border border-black bg-butter px-2 py-[5px] font-verdana text-[11px] font-bold">
            <Envelope size="sm" />
            <span>Signing on... Welcome back!</span>
          </div>
        )}
        <div className="mt-3 flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-between">
          <span className="font-verdana text-[10px] text-win-dark">Forgot password? Too bad, it&apos;s 1999.</span>
          <button type="submit" disabled={pending} className="bevel-btn tap px-[22px] py-[5px] font-arial text-[13px] font-bold">
            Sign On
          </button>
        </div>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, {});
  const router = useRouter();
  useEffect(() => {
    if (!state.error) return;
    stopDialup();
    clearPlayedThisSession();
  }, [state]);
  useEffect(() => {
    if (!state.done) return;
    const t = setTimeout(() => router.push("/chat"), 1500);
    return () => clearTimeout(t);
  }, [state.done, router]);

  const label = "mt-1 md:mt-0 md:text-right";
  return (
    <form action={action} onSubmit={dialIn} className="m-0">
      <fieldset className="m-0 min-w-0 border-2 [border-style:groove] border-white px-2 py-2.5 md:px-3">
        <legend className="px-1 font-verdana text-[11px] font-bold">New here? Get a free screen name</legend>
        <div className="grid grid-cols-1 items-center gap-x-2 gap-y-1 font-verdana text-[11px] font-bold md:grid-cols-[104px_1fr] md:gap-y-[7px]">
          <label htmlFor="su-name" className={label}>Screen Name:</label>
          <input id="su-name" name="screenName" defaultValue={state.values?.screenName} type="text" required autoComplete="username" placeholder="pick something fun" className={`${field} text-xs`} />
          <label htmlFor="su-email" className={label}>E-mail:</label>
          <input id="su-email" name="email" defaultValue={state.values?.email} type="email" required autoComplete="email" placeholder="you@hotmail.com" className={`${field} text-xs`} />
          <label htmlFor="su-pw" className={label}>Password:</label>
          <input id="su-pw" name="password" type="password" required autoComplete="new-password" className={`${field} text-xs`} />
          <label htmlFor="su-pw2" className={label}>Retype it:</label>
          <input id="su-pw2" name="password2" type="password" required autoComplete="new-password" className={`${field} text-xs`} />
          <span className={label}>Birthday:</span>
          <div className="flex gap-1">
            <select name="month" aria-label="Birth month" defaultValue={state.values?.month || "Month"} className="bevel-in min-w-0 flex-1 bg-white font-verdana text-[11px] md:flex-none">
              <option>Month</option>
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input name="day" defaultValue={state.values?.day} type="text" inputMode="numeric" maxLength={2} aria-label="Birth day" placeholder="DD" className="bevel-in w-12 md:w-7 bg-white px-[3px] py-0.5 font-courier text-xs" />
            <input name="year" defaultValue={state.values?.year} type="text" inputMode="numeric" maxLength={4} aria-label="Birth year" placeholder="YYYY" className="bevel-in w-16 md:w-[42px] bg-white px-[3px] py-0.5 font-courier text-xs" />
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-[3px] font-verdana text-[11px] md:ml-28">
          <label className="tap flex items-center gap-1.5 md:gap-1">
            <input type="checkbox" name="directory" defaultChecked className="m-0" />
            Let people find me in the Member Directory
          </label>
          <label className="tap flex flex-wrap items-center gap-1.5 md:gap-1">
            <input type="checkbox" name="rules" className="m-0" />
            I agree to the <Link href="#rules">Rules of the Road</Link>
          </label>
        </div>
        {state.error && (
          <div role="alert" className="mt-2.5 font-verdana md:ml-28 text-[11px] font-bold text-alert">
            {state.error}
          </div>
        )}
        {state.done && (
          <div className="mt-2.5 border border-black md:ml-28 bg-butter px-2 py-[5px] font-verdana text-[11px] font-bold">
            Your screen name is ready! Signing you on...
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={pending || state.done} className="bevel-btn tap w-full px-[18px] md:w-auto py-[5px] font-arial text-[13px] font-bold">
            {pending ? "One moment..." : "Sign Me Up!"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
