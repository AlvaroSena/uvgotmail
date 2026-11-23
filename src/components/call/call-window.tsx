"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { startCall } from "@/actions/calls";
import { Envelope } from "@/components/pixel/icons";
import { WinTitleBar } from "@/components/retro/retro";
import type { CallView, Person } from "@/lib/call-data";
import { IncomingCallWatcher } from "./incoming-call-watcher";
import { CallVideo, LevelMeter, RemoteAudio, useAudioLevel } from "./retro-video";
import { type RemotePeer, useMeeting } from "./use-meeting";

type Props = { initial: CallView; answerMode: "video" | "voice" | null };
type M = ReturnType<typeof useMeeting>;

const STATIC_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

const fmt = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

export function CallWindow({ initial, answerMode }: Props) {
  const m = useMeeting(initial, answerMode);
  const [retro, setRetro] = useState(true);
  const [showPeople, setShowPeople] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const live = m.phase === "live";
  const inCall = m.peers.length + 1;
  const title =
    m.call.kind === "dm" ? `Video Chat with ${m.call.title}` : `Video Chat · ${m.call.title}${live ? ` (${inCall}/${m.call.max})` : ""}`;

  // Buzz! from someone in the call shakes the window.
  useEffect(() => {
    if (!m.buzzedAt) return;
    windowRef.current?.animate(
      [0, -8, 8, -6, 6, -3, 3, 0].map((x) => ({ transform: `translate(${x}px, ${x / 2}px)` })),
      { duration: 450 },
    );
  }, [m.buzzedAt]);

  return (
    <div className="flex h-dvh flex-col bg-win-gray p-1 font-verdana text-xs/[1.4] text-black md:block md:h-auto md:p-1.5">
      <div ref={windowRef} className="bevel-window flex min-h-0 flex-1 flex-col bg-win-gray p-0.5 md:block">
        <WinTitleBar title={title} onClose={live ? m.end : undefined} />
        <Toolbar m={m} retro={retro} onRetro={() => setRetro((r) => !r)} onPeople={() => setShowPeople(true)} />

        <div className="bevel-in-deep relative mx-[3px] mt-1 min-h-0 flex-1 overflow-hidden bg-black md:aspect-[4/3] md:flex-none">
          {live && <Stage m={m} retro={retro} />}
          <PhaseOverlay m={m} />
          {showPeople && <PeopleDialog m={m} onClose={() => setShowPeople(false)} />}
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex max-w-[75%] flex-col items-start gap-1">
            {m.note && live && <Toast text={m.note} />}
            {m.toasts.map((t) => (
              <Toast key={t.id} text={t.text} />
            ))}
          </div>
        </div>

        <StatusBar m={m} />
      </div>
      {m.peers.map((p) => (
        <RemoteAudio key={p.pid} stream={p.stream} />
      ))}
      {/* Once you're out of this call, a new call can still ring you here. */}
      {(m.phase === "ended" || m.phase === "full" || m.phase === "denied") && <IncomingCallWatcher />}
      <div className="hidden pt-1.5 font-verdana text-[11px] md:block">
        <Link href={`/chat/${m.call.conversationId}`}>◄ Back to chat</Link> · Video is peer-to-peer: it goes straight between
        your computers. Up to {m.call.max} people per call.
      </div>
    </div>
  );
}

/* ---------- stage layouts ---------- */

function Stage({ m, retro }: { m: M; retro: boolean }) {
  const n = m.peers.length;

  if (n === 0) {
    return (
      <>
        <SelfTile m={m} retro={retro} className="absolute inset-0" big />
        <WaitingPanel m={m} />
      </>
    );
  }

  if (n === 1) {
    return (
      <>
        <RemoteTile peer={m.peers[0]} retro={retro} className="absolute inset-0" big />
        <div className="absolute top-2 right-2 z-[5] w-[28%] max-w-[180px] min-w-[96px] border-2 border-white shadow-[2px_2px_0_#000]">
          <SelfTile m={m} retro={retro} className="relative aspect-[4/3]" />
        </div>
      </>
    );
  }

  // 3–4 people: a 2×2 grid of equal tiles, with an empty seat when there are 3.
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[3px] bg-win-gray p-[3px]">
      <SelfTile m={m} retro={retro} className="bevel-in relative" />
      {m.peers.map((p) => (
        <RemoteTile key={p.pid} peer={p} retro={retro} className="bevel-in relative" />
      ))}
      {n === 2 && (
        <div className="bevel-in flex flex-col items-center justify-center gap-1 bg-win-dark p-2 text-center font-tahoma text-[11px] text-win-light">
          <span className="text-lg leading-none">🪑</span>
          Empty seat · {n + 1}/{m.call.max}
        </div>
      )}
    </div>
  );
}

function NameStrip({ name, muted }: { name: string; muted: boolean }) {
  return (
    <span className="absolute bottom-0 left-0 z-[2] max-w-full truncate bg-navy px-1 font-tahoma text-[10px] text-white md:text-[11px]">
      {name}
      {muted ? " · 🔇" : ""}
    </span>
  );
}

function SelfTile({ m, retro, className, big = false }: { m: M; retro: boolean; className: string; big?: boolean }) {
  const level = useAudioLevel(m.localStream);
  return (
    <div className={`overflow-hidden bg-win-dark ${className}`}>
      {m.cam ? (
        <CallVideo stream={m.localStream} retro={retro} mirror className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
          <span className="font-tahoma text-[10px]">{m.hasCamera ? "Camera off" : "No camera"}</span>
          <LevelMeter level={level} label="Your microphone level" compact={!big} />
        </div>
      )}
      <NameStrip name="You" muted={!m.mic} />
    </div>
  );
}

function RemoteTile({ peer, retro, className, big = false }: { peer: RemotePeer; retro: boolean; className: string; big?: boolean }) {
  const level = useAudioLevel(peer.stream);
  const p = peer.person;
  const hasVideo = (peer.stream?.getVideoTracks().length ?? 0) > 0;
  const showVideo = hasVideo && peer.cam && (peer.state === "connected" || peer.state === "reconnecting");

  return (
    <div className={`overflow-hidden bg-win-dark ${className}`}>
      {peer.state === "connecting" ? (
        <div className="absolute inset-0 flex animate-static items-center justify-center bg-[#222] p-2" style={{ backgroundImage: STATIC_BG }}>
          <span className="bg-black/70 px-2 py-1 text-center font-tahoma text-[11px] text-lcd">Connecting to {p.screenName}...</span>
        </div>
      ) : peer.state === "failed" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center font-tahoma text-[11px] text-white">
          <span className="text-xl leading-none">⚠</span>
          <b>Couldn&apos;t connect to {p.screenName}</b>
          <span className="text-win-light">Their network may block direct calls.</span>
        </div>
      ) : showVideo ? (
        <CallVideo stream={peer.stream} retro={retro} className="absolute inset-0" />
      ) : (
        <AvatarTile person={p} caption={hasVideo && !peer.cam ? "Camera off" : "Voice only"} level={level} big={big} />
      )}
      {peer.state === "reconnecting" && (
        <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-center gap-1.5 bg-black/70 py-1 font-tahoma text-[11px] text-lcd">
          <span className="animate-blink-fast">●</span> Line noise... reconnecting
        </div>
      )}
      {!peer.mic && big && (
        <span className="absolute top-2 left-2 z-[2] border border-black bg-white px-1.5 py-0.5 font-tahoma text-[11px] font-bold">
          🔇 {p.screenName} is muted
        </span>
      )}
      <NameStrip name={p.screenName} muted={!peer.mic} />
    </div>
  );
}

function AvatarTile({ person, caption, level, big }: { person: Person; caption: string; level: number; big: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-1">
      <div
        className={`bevel-out flex items-center justify-center font-verdana font-bold text-white ${big ? "size-24 text-[32px] md:size-32 md:text-[44px]" : "size-12 text-base md:size-16 md:text-xl"}`}
        style={{ background: person.avatar }}
      >
        {person.initials}
      </div>
      {big && <div className="font-times text-lg font-bold text-white">{person.screenName}</div>}
      <div className="font-tahoma text-[11px] text-win-light">{caption}</div>
      <LevelMeter level={level} label={`${person.screenName}'s microphone level`} compact={!big} />
    </div>
  );
}

/** Shown over your own camera while nobody else is in the call yet. */
function WaitingPanel({ m }: { m: M }) {
  const c = m.call;
  const ringing = c.ringing.length > 0;
  const who = c.kind === "dm" ? c.peer : null;
  return (
    <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-black/60 p-4 text-center text-white">
      {who ? (
        <div className="bevel-out flex size-24 animate-bob items-center justify-center font-verdana text-[32px] font-bold" style={{ background: who.avatar }}>
          {who.initials}
        </div>
      ) : (
        <Envelope size="big" bob />
      )}
      <div className="font-times text-xl font-bold">
        {ringing ? (who ? `Dialing ${who.screenName}...` : `Ringing ${c.title}...`) : "You're the only one here"}
      </div>
      <div className="max-w-[320px] font-tahoma text-[11px] text-win-light">
        {ringing
          ? who
            ? who.online
              ? "Ringing. Give them a moment to pick up."
              : `${who.screenName} looks offline. They'll see a missed call.`
            : `Ringing ${c.ringing.map((p) => p.screenName).join(", ")}. 1 of ${c.max} in the call.`
          : `Others in ${c.kind === "dm" ? "this chat" : c.title} can join from the chat window.`}
      </div>
      <button type="button" onClick={m.end} className="bevel-btn tap mt-2 px-6 py-1 font-tahoma text-[11px] font-bold text-alert">
        {ringing && c.startedByMe ? "Cancel Call" : "Hang Up"}
      </button>
    </div>
  );
}

/* ---------- toolbar & status ---------- */

function Toolbar({ m, retro, onRetro, onPeople }: { m: M; retro: boolean; onRetro: () => void; onPeople: () => void }) {
  const live = m.phase === "live";
  const btn =
    "bevel-btn tap flex min-w-0 flex-1 items-center justify-center gap-1 px-2 py-[3px] font-tahoma text-[11px] whitespace-nowrap md:flex-none";
  return (
    <div className="order-last mx-[3px] mt-1 flex gap-1 border-t border-white pt-1 md:order-none md:mt-0 md:border-t-0 md:border-b md:border-b-win-shadow md:pt-1 md:pb-1">
      <button type="button" onClick={m.toggleMic} disabled={!live} aria-pressed={!m.mic} aria-label={m.mic ? "Mute" : "Unmute"} className={btn}>
        {m.mic ? "🎤" : "🔇"} <span className="hidden sm:inline">{m.mic ? "Mute" : "Unmute"}</span>
      </button>
      <button
        type="button"
        onClick={m.toggleCam}
        disabled={!live || !m.hasCamera}
        aria-pressed={!m.cam}
        aria-label={m.cam ? "Camera Off" : "Camera On"}
        className={btn}
      >
        📷 <span className="hidden sm:inline">{m.cam ? "Camera Off" : "Camera On"}</span>
      </button>
      <button type="button" onClick={onRetro} aria-pressed={retro} title="Switch between 1999 webcam and full quality video" className={btn}>
        {retro ? "Hi-Fi" : "Retro"}
      </button>
      <button type="button" onClick={onPeople} aria-label={`People (${live ? m.peers.length + 1 : 0})`} className={btn}>
        👥 <span className="hidden sm:inline">People ({live ? m.peers.length + 1 : 0})</span>
      </button>
      <button type="button" onClick={m.buzz} disabled={!live || m.peers.length === 0} className={`${btn} font-bold`}>
        Buzz!
      </button>
      <button type="button" onClick={m.end} disabled={!live} className={`${btn} font-bold text-alert md:ml-auto`}>
        Hang Up
      </button>
    </div>
  );
}

function StatusBar({ m }: { m: M }) {
  const others = m.peers.length;
  const label =
    m.phase === "live"
      ? others === 0
        ? m.call.ringing.length
          ? `Ringing ${m.call.kind === "dm" ? m.call.title : `${m.call.ringing.length} people`}`
          : "Waiting for others"
        : `${others + 1} in call · peer-to-peer`
      : {
          media: "Waiting for camera & mic",
          denied: "No camera or mic access",
          joining: "Joining...",
          full: "Call is full",
          busy: "Already on another call",
          ended: "Disconnected",
          elsewhere: "Joined in another window",
        }[m.phase];
  return (
    <div className="mx-[3px] mt-1 flex gap-0.5 font-tahoma text-[11px]">
      <span className="bevel-thin-in min-w-0 flex-1 truncate px-[5px] py-px">{label}</span>
      <span className="bevel-thin-in w-[72px] flex-none px-[5px] py-px text-center font-courier">
        <CallTimer since={m.phase === "live" && others > 0 ? m.call.answeredAt : null} />
      </span>
      <span className="bevel-thin-in hidden w-[110px] flex-none px-[5px] py-px sm:block">
        {m.kbps != null && m.phase === "live" && others > 0 ? `${m.kbps.toFixed(1)} kbps` : "-- kbps"}
      </span>
    </div>
  );
}

function CallTimer({ since }: { since: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  if (!since) return <>--:--:--</>;
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <>
      {hh}:{mm}:{ss}
    </>
  );
}

/* ---------- People dialog ---------- */

function PeopleDialog({ m, onClose }: { m: M; onClose: () => void }) {
  const c = m.call;
  const live = m.phase === "live";
  const row = (key: string, p: Pick<Person, "screenName" | "initials" | "avatar">, note: string, dot: string) => (
    <li key={key} className="flex items-center gap-2 border-b border-dotted border-win-shadow py-1.5 last:border-b-0">
      <span className="flex size-7 flex-none items-center justify-center border border-black text-[11px] font-bold text-white" style={{ background: p.avatar }}>
        {p.initials}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">{p.screenName}</span>
      <span className="flex flex-none items-center gap-1 text-win-dark">
        <span className="size-[7px] border border-black" style={{ background: dot }} />
        {note}
      </span>
    </li>
  );
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 md:items-center md:p-3">
      <div role="dialog" aria-label="People" className="bevel-window w-full bg-win-gray p-0.5 font-tahoma text-[11px] md:max-w-[340px]">
        <WinTitleBar title={`People · ${live ? m.peers.length + 1 : 0}/${c.max} in call`} onClose={onClose} icon={false} />
        <ul className="bevel-in m-1.5 max-h-[50dvh] list-none overflow-y-auto bg-white px-2 py-0.5 md:max-h-[260px]">
          {live && row("me", { screenName: "You", initials: "ME", avatar: "#000080" }, "In call", "#00FF00")}
          {m.peers.map((p) =>
            row(
              `p${p.pid}`,
              p.person,
              p.state === "connected" ? "In call" : p.state === "failed" ? "Can't connect" : "Connecting",
              p.state === "failed" ? "#CC0000" : "#00FF00",
            ),
          )}
          {c.ringing.map((p) => row(`r${p.userId}`, p, "Ringing...", "#FFCC00"))}
          {c.declined.map((p) => row(`d${p.userId}`, p, "Declined", "#808080"))}
        </ul>
        <div className="flex justify-end px-1.5 pb-1.5">
          <button type="button" onClick={onClose} className="bevel-btn tap px-4 py-[3px]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- phase overlays ---------- */

function PhaseOverlay({ m }: { m: M }) {
  const back = `/chat/${m.call.conversationId}`;
  if (m.phase === "live") return null;

  if (m.phase === "media" || m.phase === "joining") {
    return (
      <div className="absolute inset-0 animate-static bg-[#222] opacity-95" style={{ backgroundImage: STATIC_BG }}>
        <Dialog title={m.phase === "media" ? "Getting ready" : "Connecting"}>
          <div className="flex items-start gap-3">
            <Envelope size="md" bob />
            <div>
              {m.phase === "media" ? (
                <>
                  <b>Waiting for your camera and microphone...</b>
                  <p className="mt-1 mb-0">Your browser will ask for permission. We only use them during this call.</p>
                </>
              ) : (
                <>
                  <b>Negotiating 56k handshake...</b>
                  <p className="mt-1 mb-0">Joining {m.call.kind === "dm" ? `your call with ${m.call.title}` : m.call.title}.</p>
                </>
              )}
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  if (m.phase === "denied") {
    return (
      <Backdrop>
        <Dialog title="Camera & Microphone Blocked" icon="⚠">
          <b>Your browser blocked the camera and microphone.</b>
          <p className="mt-1">
            To fix it, click the icon at the left of the address bar, allow <b>Camera</b> and <b>Microphone</b>, then try again.
          </p>
          <DialogButtons>
            <button type="button" onClick={() => window.location.reload()} className="bevel-btn tap px-3 py-[3px]">
              Try Again
            </button>
            <button type="button" onClick={m.retryVoiceOnly} className="bevel-btn tap px-3 py-[3px]">
              Join with Voice Only
            </button>
            <BackLink href={back} />
          </DialogButtons>
        </Dialog>
      </Backdrop>
    );
  }

  if (m.phase === "full") {
    return (
      <Backdrop>
        <Dialog title="Call Is Full" icon="⚠">
          <b>
            This call is full ({m.call.max}/{m.call.max}).
          </b>
          <p className="mt-1 mb-0">Video calls can have up to {m.call.max} people. Try again when someone leaves.</p>
          <DialogButtons>
            <button type="button" onClick={() => window.location.reload()} className="bevel-btn tap px-3 py-[3px] font-bold">
              Try Again
            </button>
            <BackLink href={back} />
          </DialogButtons>
        </Dialog>
      </Backdrop>
    );
  }

  if (m.phase === "busy") {
    return (
      <Backdrop>
        <Dialog title="Already On a Call" icon="⚠">
          <p className="m-0">You&apos;re already on another call. Hang up there first.</p>
          <DialogButtons>
            {m.busyCallId && (
              <Link href={`/call/${m.busyCallId}`} className="bevel-btn tap inline-flex items-center px-3 py-[3px] font-bold text-black! no-underline">
                Go to That Call
              </Link>
            )}
            <BackLink href={back} />
          </DialogButtons>
        </Dialog>
      </Backdrop>
    );
  }

  const { title, text, rejoin } = endCopy(m);
  return (
    <Backdrop>
      <Dialog title={title}>
        <p className="m-0">{text}</p>
        <DialogButtons>
          {rejoin ? (
            <button type="button" onClick={() => window.location.reload()} className="bevel-btn tap px-3 py-[3px] font-bold">
              Rejoin
            </button>
          ) : (
            m.phase !== "elsewhere" && <CallAgain conversationId={m.call.conversationId} withVideo={m.call.withVideo} />
          )}
          <BackLink href={back} />
        </DialogButtons>
      </Dialog>
    </Backdrop>
  );
}

function endCopy(m: M): { title: string; text: string; rejoin?: boolean } {
  const c = m.call;
  const starter = c.starter?.screenName ?? "Someone";
  if (m.phase === "elsewhere") return { title: "Joined Elsewhere", text: "You joined this call from another window." };
  if (c.status === "active") {
    const n = c.participants.length;
    return {
      title: "You Left the Call",
      text: n > 0 ? `${n} ${n === 1 ? "person is" : "people are"} still in it. You can rejoin while it's going.` : "You left the call.",
      rejoin: n > 0 && n < c.max,
    };
  }
  switch (c.status) {
    case "declined":
      return {
        title: "Call Declined",
        text: c.startedByMe ? (c.kind === "dm" ? `${c.title} can't talk right now.` : "Nobody can talk right now.") : "The call was declined.",
      };
    case "missed":
      return {
        title: "No Answer",
        text: c.startedByMe
          ? c.kind === "dm"
            ? `No answer from ${c.title}. They'll see a missed call.`
            : "Nobody picked up. They'll see a missed call."
          : `You missed a call from ${starter}.`,
      };
    case "cancelled":
      return { title: "Call Cancelled", text: c.startedByMe ? "You cancelled the call." : `${starter} hung up before anyone answered.` };
    default: {
      if (!c.answeredAt) return { title: "Call Ended", text: "The call ended." };
      const secs = c.endedAt ? Math.round((new Date(c.endedAt).getTime() - new Date(c.answeredAt).getTime()) / 1000) : 0;
      const people = c.kind !== "dm" && c.peak > 2 ? ` · ${c.peak} people` : "";
      const by = c.kind === "dm" && !c.endedByMe ? ` ${c.title} hung up.` : "";
      return { title: "Call Ended", text: `Call ended · ${fmt(Math.max(0, secs))}${people}.${by}` };
    }
  }
}

function CallAgain({ conversationId, withVideo }: { conversationId: number; withVideo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startCall(conversationId, withVideo);
            if (!("error" in r)) router.push(`/call/${r.callId}`);
            else setError(r.error === "busy" ? "They're on another call." : "You're already on a call.");
          })
        }
        className="bevel-btn tap px-3 py-[3px] font-bold"
      >
        {pending ? "Dialing..." : "Call Again"}
      </button>
      {error && <span className="w-full font-bold text-alert">{error}</span>}
    </>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="bevel-btn tap inline-flex items-center px-3 py-[3px] text-black! no-underline">
      Back to Chat
    </Link>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 bg-teal/95">{children}</div>;
}

function Dialog({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-3">
      <div role="alertdialog" aria-label={title} className="bevel-window w-full max-w-[360px] bg-win-gray p-0.5 font-tahoma text-[11px]">
        <WinTitleBar title={title} icon={false} />
        <div className="flex items-start gap-3 px-3 py-3">
          {icon && <span className="text-2xl leading-none">{icon}</span>}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function DialogButtons({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex flex-wrap justify-end gap-1.5">{children}</div>;
}

function Toast({ text }: { text: string }) {
  return (
    <div role="status" className="border border-black bg-butter px-2 py-1 font-tahoma text-[11px] shadow-[2px_2px_0_rgba(0,0,0,.4)]">
      {text}
    </div>
  );
}
