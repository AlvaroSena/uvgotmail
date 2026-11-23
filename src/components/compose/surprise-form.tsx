"use client";

import { useActionState, useState } from "react";
import { sendNote, type NoteState } from "@/actions/notes";
import { Envelope } from "@/components/pixel/icons";
import { WinTitleBar } from "@/components/retro/retro";

type Variant = "portal" | "geocities" | "ie5";

function useSurprise() {
  const [state, action, pending] = useActionState<NoteState, FormData>(sendNote, { status: "idle" });
  // `gen` changes after every successful send; the form is keyed on it so the inputs clear,
  // and field state recorded under an older gen is treated as reset.
  const gen = state.status === "sent" ? (state.sentAt ?? 0) : 0;
  const [fields, setFields] = useState({ gen: 0, count: 0, anon: false });
  const cur = fields.gen === gen ? fields : { gen, count: 0, anon: false };
  const [dismissed, setDismissed] = useState<number | undefined>();

  const sent = state.status === "sent" && dismissed !== state.sentAt;
  return {
    action,
    pending,
    formKey: gen,
    v: state.status === "error" ? state.values : undefined,
    count: cur.count,
    anon: cur.anon,
    sent,
    error: state.status === "error" ? state.error : undefined,
    onMsg: (e: React.FormEvent<HTMLTextAreaElement>) => setFields({ ...cur, count: e.currentTarget.value.length }),
    onAnon: (e: React.ChangeEvent<HTMLInputElement>) => setFields({ ...cur, anon: e.target.checked }),
    onReset: () => setFields({ gen, count: 0, anon: false }),
    close: (e?: React.MouseEvent) => {
      e?.preventDefault();
      setDismissed(state.sentAt);
    },
  };
}

const sunken = "bevel-in-deep font-courier text-[13px] px-[5px] py-[3px] outline-none bg-white disabled:bg-win-light";

export function SurpriseForm({ variant }: { variant: Variant }) {
  const s = useSurprise();
  if (variant === "portal") return <PortalForm s={s} />;
  if (variant === "geocities") return <GeoForm s={s} />;
  return <Ie5Form s={s} />;
}

type S = ReturnType<typeof useSurprise>;

function ErrorLine({ error, className = "" }: { error?: string; className?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className={`font-verdana text-[11px] font-bold text-alert ${className}`}>
      {error}
    </div>
  );
}

/* ---------- 1a: portal ---------- */

function PortalForm({ s }: { s: S }) {
  return (
    <>
      {s.sent && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5 border border-black bg-butter px-2.5 py-1.5 font-verdana text-xs font-bold md:flex-nowrap">
          <Envelope size="sm" />
          <span>Your message is on its way. Thanks for making someone&apos;s day!</span>
          <a href="#" onClick={s.close} className="tap ml-auto inline-flex items-center font-normal">
            close
          </a>
        </div>
      )}
      <form key={s.formKey} action={s.action} onReset={s.onReset} className="m-0">
        <input type="hidden" name="variant" value="portal" />
        <fieldset className="m-0 min-w-0 border-2 [border-style:groove] border-white px-2 py-2.5 md:px-3">
          <legend className="px-1 font-verdana text-[11px] font-bold">Compose message</legend>
          <div className="grid grid-cols-1 items-center gap-x-2 gap-y-1 md:grid-cols-[96px_1fr] md:gap-y-2">
            <label htmlFor="pa-to" className="font-verdana text-xs font-bold md:text-right">
              To:
            </label>
            <input id="pa-to" name="to" defaultValue={s.v?.to} type="email" required placeholder="friend@hotmail.com" className={sunken} />
            <label htmlFor="pa-from" className="mt-1.5 font-verdana text-xs font-bold md:mt-0 md:text-right">
              From:
            </label>
            <input
              id="pa-from"
              name="from"
              type="text"
              disabled={s.anon}
              placeholder="your name (optional)"
              className={sunken}
            />
            <label htmlFor="pa-msg" className="mt-1.5 self-start font-verdana text-xs font-bold md:mt-0 md:pt-[3px] md:text-right">
              Your message:
            </label>
            <div>
              <textarea
                id="pa-msg"
                name="message"
                defaultValue={s.v?.message}
                maxLength={500}
                rows={8}
                required
                onInput={s.onMsg}
                placeholder="Hi! Just wanted to say..."
                className={`${sunken} box-border w-full resize-y text-[13px]/[1.4]`}
              />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 font-verdana text-[11px] text-win-dark md:mt-0.5 md:text-[10px]">
                <label className="tap flex items-center gap-1.5 text-black md:gap-1">
                  <input type="checkbox" name="anonymous" defaultChecked={s.v?.anonymous} onChange={s.onAnon} className="m-0" />
                  Send anonymously
                </label>
                <span className="font-courier">{s.count}/500 characters</span>
              </div>
            </div>
          </div>
          <ErrorLine error={s.error} className="mt-2 text-center" />
          <div className="mt-3 flex justify-center gap-2">
            <button type="submit" disabled={s.pending} className="bevel-btn tap flex-1 px-[22px] py-[5px] font-arial text-[13px] font-bold md:flex-none">
              {s.pending ? "Sending..." : "Send Message!"}
            </button>
            <button type="reset" className="bevel-btn tap px-3.5 py-[5px] font-arial text-[13px]">
              Clear
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}

/* ---------- 1b: GeoCities ---------- */

const geoInput = "box-border w-full border-2 [border-style:inset] border-[#ccc] px-1 py-0.5 font-courier text-[13px] bg-white disabled:bg-[#eee]";

function GeoForm({ s }: { s: S }) {
  return (
    <>
      {s.sent && (
        <div className="mx-auto my-2.5 w-full border-2 border-dashed border-alert bg-butter p-2 text-center md:w-[440px]">
          <div className="flex justify-center">
            <Envelope size="big" />
          </div>
          <div className="mt-1.5 font-times text-xl font-bold text-navy">Message sent! Somebody&apos;s day just got better.</div>
          <a href="#" onClick={s.close} className="tap inline-flex items-center text-[13px]">
            Send another one
          </a>
        </div>
      )}
      <form key={s.formKey} action={s.action} className="mx-auto mt-3 w-full md:w-[520px]">
        <input type="hidden" name="variant" value="geocities" />
        <table cellPadding={5} className="w-full border-separate border-2 [border-style:outset] border-[#ccc] bg-lavender">
          <tbody>
            <tr>
              <td className="w-[76px] text-right font-bold md:w-[120px]">
                <label htmlFor="gc-to">To:</label>
              </td>
              <td>
                <input id="gc-to" name="to" defaultValue={s.v?.to} type="email" required placeholder="who@aol.com" className={geoInput} />
              </td>
            </tr>
            <tr>
              <td className="text-right font-bold">
                <label htmlFor="gc-from">From:</label>
              </td>
              <td>
                <input id="gc-from" name="from" defaultValue={s.v?.from} type="text" disabled={s.anon} placeholder="(optional)" className={geoInput} />
              </td>
            </tr>
            <tr>
              <td className="pt-2 text-right align-top font-bold">
                <label htmlFor="gc-msg">Your message:</label>
              </td>
              <td>
                <textarea
                  id="gc-msg"
                  name="message"
                defaultValue={s.v?.message}
                  rows={7}
                  maxLength={500}
                  required
                  onInput={s.onMsg}
                  className={`${geoInput} resize-y py-[3px] text-[13px]/[1.4]`}
                />
                <div className="text-right font-courier text-[11px] text-[#555]">{s.count} of 500 characters</div>
              </td>
            </tr>
            <tr>
              <td />
              <td>
                <label className="tap flex items-center gap-[5px] text-sm">
                  <input type="checkbox" name="anonymous" defaultChecked={s.v?.anonymous} onChange={s.onAnon} />
                  Keep me a secret (anonymous)
                </label>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="pt-2 text-center">
                <ErrorLine error={s.error} className="mb-1.5" />
                <button
                  type="submit"
                  disabled={s.pending}
                  className="tap w-full cursor-pointer border-[3px] [border-style:outset] border-[#eee] bg-win-gray px-[26px] py-1.5 font-arial text-[15px] font-bold active:[border-style:inset] md:w-auto"
                >
                  {s.pending ? "Sending..." : "Send Message!"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </>
  );
}

/* ---------- 1c: IE5 ---------- */

const ieInput = "bevel-in px-1 py-0.5 font-courier text-xs outline-none bg-white disabled:bg-win-light";

function Ie5Form({ s }: { s: S }) {
  return (
    <>
      <form key={s.formKey} action={s.action} className="bevel-out m-0 bg-win-gray p-[3px]">
        <input type="hidden" name="variant" value="ie5" />
        <div className="bg-navy px-[5px] py-0.5 font-tahoma text-[11px] font-bold text-white">New Message</div>
        <div className="flex gap-1 border-b border-win-shadow px-1 py-[5px]">
          <button
            type="submit"
            disabled={s.pending}
            className="bevel-out tap flex cursor-pointer items-center gap-[5px] bg-win-gray px-2.5 py-[3px] font-tahoma text-xs font-bold active:[border-color:#404040_#fff_#fff_#404040] md:text-[11px]"
          >
            <Envelope size="xs" />
            {s.pending ? "Sending..." : "Send Message!"}
          </button>
          <span className="ml-auto self-center font-courier text-[11px] text-black">{s.count}/500</span>
        </div>
        <div className="grid grid-cols-[52px_1fr] items-center gap-[5px] px-1.5 pt-[7px] pb-1 font-tahoma text-[11px]">
          <label htmlFor="ie-to" className="text-right">
            To:
          </label>
          <input id="ie-to" name="to" defaultValue={s.v?.to} type="email" required placeholder="someone@yahoo.com" className={ieInput} />
          <label htmlFor="ie-from" className="text-right">
            From:
          </label>
          <input id="ie-from" name="from" defaultValue={s.v?.from} type="text" disabled={s.anon} placeholder="optional" className={ieInput} />
        </div>
        <div className="px-1.5 pb-1.5 font-tahoma text-[11px]">
          <label htmlFor="ie-msg" className="mb-[3px] block">
            Your message:
          </label>
          <textarea
            id="ie-msg"
            name="message"
                defaultValue={s.v?.message}
            rows={9}
            maxLength={500}
            required
            onInput={s.onMsg}
            className={`${ieInput} box-border w-full resize-none py-[3px] text-xs/[1.4]`}
          />
          <label className="tap mt-[5px] flex items-center gap-1">
            <input type="checkbox" name="anonymous" defaultChecked={s.v?.anonymous} onChange={s.onAnon} className="m-0" />
            Send as Anonymous
          </label>
          <ErrorLine error={s.error} className="mt-1" />
        </div>
      </form>
      {s.sent && (
        <div
          role="dialog"
          aria-label="Message sent"
          className="bevel-window absolute top-[180px] left-1/2 z-10 w-[92%] max-w-[300px] -translate-x-1/2 bg-win-gray p-0.5 font-tahoma text-[11px] shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#808080,4px_4px_0_rgba(0,0,0,.25)]"
        >
          <WinTitleBar title="You've Got a Mail" icon={false} />
          <div className="flex items-center gap-3 px-3 py-3.5">
            <Envelope size="big" />
            <span>Your message has been sent. Somebody&apos;s going to smile.</span>
          </div>
          <div className="flex justify-center pb-2.5">
            <button
              type="button"
              onClick={() => s.close()}
              autoFocus
              className="bevel-out tap cursor-pointer bg-win-gray px-[22px] py-[3px] font-tahoma text-[11px] outline-1 -outline-offset-[5px] outline-black outline-dotted"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
