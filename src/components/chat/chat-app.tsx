"use client";

import { VideoCallButton } from "@/components/call/video-call-button";
import { GroupMembersButton } from "./group-members-dialog";
import { JoinCallBar } from "./join-call-bar";
import { NewGroupForm } from "./new-group-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  sendBuzz,
  sendMessage,
  setTyping,
  startDm,
  toggleHeart,
  type StartDmState,
} from "@/actions/chat";
import { Envelope, Heart } from "@/components/pixel/icons";
import { PanelTitle } from "@/components/retro/retro";
import { SignOffButton } from "@/components/retro/sign-off-client";
import { useSoundEnabled } from "@/hooks/use-sound-enabled";
import {
  markPlayedThisSession,
  playDialup,
  playedThisSession,
} from "@/lib/dialup-sound";
import type {
  ChatListState,
  ChatState,
  ConversationSummary,
  ThreadMessage,
} from "@/lib/chat-types";
import { formatLongDate, formatShort, formatTime } from "@/lib/format";
import { dotColor } from "@/lib/presence";
import { useChatListSync, useChatSync, useHydrated } from "./use-chat-sync";

type Props = { initial: ChatState; viewerName: string; viewerUsername: string };

export function ChatApp({ initial, viewerName, viewerUsername }: Props) {
  const { state, setState, refresh, offline } = useChatSync(
    initial.current.id,
    initial,
  );
  const s = state ?? initial;
  const myProfile = `/members/${viewerUsername}`;
  useDialOnFirstGesture();

  return (
    <ChatShell>
      <ChatHeader myProfile={myProfile} className="hidden md:flex" />

      <div className="flex min-h-0 flex-1 gap-1 md:mt-1 md:h-[520px] md:flex-none">
        <ConversationList
          list={s.list}
          currentId={s.current.id}
          unreadTotal={s.unreadTotal}
          className="hidden md:flex md:w-[230px] md:flex-none"
        />
        <section className="bevel-out flex min-w-0 flex-1 flex-col bg-win-gray p-[3px]">
          <ThreadHeader state={s} />
          {s.current.liveCall && <JoinCallBar call={s.current.liveCall} />}
          <Thread state={s} onChanged={refresh} />
          <Composer
            conversationId={s.current.id}
            onSent={(text) => {
              setState((prev) =>
                prev
                  ? {
                      ...prev,
                      messages: [
                        ...prev.messages,
                        {
                          id: Number.MAX_SAFE_INTEGER,
                          kind: "text",
                          body: text,
                          senderName: viewerName,
                          mine: true,
                          at: new Date().toISOString(),
                          heartCount: 0,
                          heartedByMe: false,
                        },
                      ],
                    }
                  : prev,
              );
            }}
            onDone={refresh}
          />
        </section>
      </div>

      <ChatStatusBar offline={offline} onlineCount={s.onlineCount} />
    </ChatShell>
  );
}

/* ---------- Phone list screen (/chat on phones) ---------- */

type ListProps = {
  initial: ChatListState;
  latestId: number | null;
  viewerUsername: string;
};

/**
 * `/chat`: on phones this is the Conversations screen (like the AIM buddy window);
 * on desktop it forwards to the latest conversation, as before.
 */
export function ChatListScreen({
  initial,
  latestId,
  viewerUsername,
}: ListProps) {
  const router = useRouter();
  const { state, offline } = useChatListSync(initial);
  useDialOnFirstGesture();

  useEffect(() => {
    if (latestId == null) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const go = () => mq.matches && router.replace(`/chat/${latestId}`);
    go();
    mq.addEventListener("change", go);
    return () => mq.removeEventListener("change", go);
  }, [latestId, router]);

  return (
    <ChatShell>
      <ChatHeader myProfile={`/members/${viewerUsername}`} />
      <div className="mt-1 flex min-h-0 flex-1 md:h-[520px] md:flex-none">
        {latestId != null && (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 md:flex">
            <Envelope size="big" bob />
            <span>Dialing up... please wait</span>
          </div>
        )}
        <ConversationList
          list={state.list}
          unreadTotal={state.unreadTotal}
          className={`flex w-full flex-1 ${latestId != null ? "md:hidden" : ""}`}
        />
      </div>
      <ChatStatusBar offline={offline} onlineCount={state.onlineCount} />
    </ChatShell>
  );
}

/* ---------- Shared chrome ---------- */

/** Full-height window on phones (keyboard-aware via dvh); the fixed 800px layout on desktop. */
function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-win-gray p-1 font-verdana text-xs/[1.4] text-black md:block md:h-auto md:p-1.5">
      {children}
    </div>
  );
}

function ChatHeader({
  myProfile,
  className = "flex",
}: {
  myProfile: string;
  className?: string;
}) {
  return (
    <header
      className={`bevel-out flex-wrap items-center gap-x-2.5 gap-y-0.5 bg-navy px-2.5 py-1 md:flex-nowrap md:py-1.5 ${className}`}
    >
      <Envelope size="sm" />
      <Link
        href="/"
        className="min-w-0 flex-1 truncate font-times text-[20px]/none font-bold italic text-white! no-underline md:text-[22px]/none"
      >
        You&apos;ve Got a Mail
      </Link>
      <nav className="flex w-full flex-none justify-between gap-2.5 font-verdana text-xs font-bold whitespace-nowrap md:w-auto md:justify-start md:text-[11px]">
        <Link href="/chat" className="tap inline-flex items-center text-white!">
          Chats
        </Link>
        <Link
          href={myProfile}
          className="tap inline-flex items-center text-sunny!"
        >
          Buddy List
        </Link>
        <Link
          href={myProfile}
          className="tap inline-flex items-center text-sunny!"
        >
          My Profile
        </Link>
        <SignOffButton className="tap font-bold text-sunny" />
      </nav>
    </header>
  );
}

function ChatStatusBar({
  offline,
  onlineCount,
}: {
  offline: boolean;
  onlineCount: number;
}) {
  return (
    <footer className="mt-1 flex gap-0.5 font-tahoma text-[11px]">
      <span className="bevel-thin-in flex min-w-0 flex-1 items-center gap-2 px-[5px] py-px">
        <span className="truncate">
          {offline
            ? "Reconnecting... (is someone using the phone line?)"
            : "Connected at 56,000 bps"}
        </span>
        <SoundToggle />
      </span>
      <span className="bevel-thin-in flex-none px-[5px] py-px md:w-[170px]">
        {onlineCount}
        <span className="hidden sm:inline">
          {" "}
          {onlineCount === 1 ? "buddy" : "buddies"}
        </span>{" "}
        online
      </span>
      <span className="bevel-thin-in hidden w-[130px] px-[5px] py-px md:block">
        Visitors: 001337
      </span>
    </footer>
  );
}

/** Returning with a saved session: browsers need a gesture before audio, so dial on the first click/key. */
function useDialOnFirstGesture() {
  useEffect(() => {
    if (playedThisSession()) return;
    const dial = () => {
      remove();
      if (playedThisSession()) return;
      playDialup();
      markPlayedThisSession();
    };
    const remove = () => {
      window.removeEventListener("pointerdown", dial);
      window.removeEventListener("keydown", dial);
    };
    window.addEventListener("pointerdown", dial);
    window.addEventListener("keydown", dial);
    return remove;
  }, []);
}

function SoundToggle() {
  const [on, setOn] = useSoundEnabled();
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-pressed={on}
      title={on ? "Mute modem sounds" : "Play modem sounds"}
      className="tap ml-auto flex-none cursor-pointer border-0 bg-transparent p-0 font-tahoma text-[11px] text-black"
    >
      {on ? "\u{1F50A}" : "\u{1F507}"} Sound: {on ? "On" : "Off"}
    </button>
  );
}

/* ---------- Conversations ---------- */

type ConversationListProps = {
  list: ConversationSummary[];
  unreadTotal: number;
  currentId?: number;
  className?: string;
};

function ConversationList({
  list: all,
  unreadTotal,
  currentId,
  className = "",
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKind, setNewKind] = useState<"im" | "group">("im");
  const [dmState, dmAction, dmPending] = useActionState<StartDmState, FormData>(
    startDm,
    {},
  );
  const hydrated = useHydrated();
  const q = query.trim().toLowerCase();
  const list = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;

  return (
    <aside
      className={`bevel-out min-h-0 flex-col bg-win-gray p-[3px] ${className}`}
    >
      <PanelTitle className="justify-between">
        <span>Conversations</span>
        <span className="flex-none font-normal whitespace-nowrap">
          {unreadTotal} new
        </span>
      </PanelTitle>
      <div className="flex gap-[3px] px-0.5 py-[5px]">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a buddy..."
          aria-label="Find a buddy"
          className="bevel-in min-w-0 flex-1 bg-white px-1 py-0.5 font-verdana text-[11px] outline-none"
        />
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className="bevel-btn tap flex-none px-2.5 py-px font-tahoma text-[11px] font-bold whitespace-nowrap md:px-1.5"
        >
          + New
        </button>
      </div>
      {adding && (
        <div className="mx-0.5 mb-[5px] border border-win-shadow bg-tooltip p-1.5 font-verdana text-[11px]">
          <div
            role="radiogroup"
            aria-label="Start a"
            className="mb-1.5 flex gap-3 border-b border-dotted border-win-shadow pb-1.5"
          >
            {(
              [
                ["im", "Instant Message"],
                ["group", "New Group"],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                className="tap flex cursor-pointer items-center gap-1 font-bold"
              >
                <input
                  type="radio"
                  name="new-kind"
                  checked={newKind === k}
                  onChange={() => setNewKind(k)}
                  className="m-0"
                />
                {label}
              </label>
            ))}
          </div>
          {newKind === "group" ? (
            <NewGroupForm />
          ) : (
            <form action={dmAction}>
              <label htmlFor="new-dm" className="mb-[3px] block font-bold">
                IM a screen name:
              </label>
              <div className="flex gap-[3px]">
                <input
                  id="new-dm"
                  name="screenName"
                  autoFocus
                  required
                  placeholder="DialUpDave"
                  className="bevel-in min-w-0 flex-1 bg-white px-1 py-0.5 font-courier text-[11px] outline-none"
                />
                <button
                  type="submit"
                  disabled={dmPending}
                  className="bevel-btn tap px-3 font-tahoma text-[11px] font-bold md:px-1.5"
                >
                  Go
                </button>
              </div>
              {dmState.error && (
                <div className="mt-1 font-bold text-alert">{dmState.error}</div>
              )}
            </form>
          )}
        </div>
      )}
      <div className="bevel-in flex-1 overflow-auto bg-white">
        {list.length === 0 && (
          <div className="p-2 font-verdana text-[11px] text-win-shadow italic">
            {q ? "Nobody by that name." : "No conversations yet. Click + New!"}
          </div>
        )}
        {list.map((c) => {
          const sel = c.id === currentId;
          return (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              aria-current={sel ? "page" : undefined}
              className="flex min-h-14 cursor-pointer items-center gap-[7px] border-b border-dotted border-win-gray p-1.5 no-underline md:min-h-0 md:items-start"
              style={{
                background: sel ? "#000080" : "#fff",
                color: sel ? "#fff" : "#000",
              }}
            >
              <div
                className={`relative size-[30px] flex-none border border-black text-center font-verdana text-xs/[30px] font-bold text-white ${c.kind === "group" ? "shadow-[3px_-3px_0_-1px_#808080,3px_-3px_0_0_#000]" : ""}`}
                style={{ background: c.avatar }}
              >
                {c.initials}
                <span
                  className="absolute -right-[3px] -bottom-[3px] size-[7px] border border-black"
                  style={{ background: dotColor(c.online) }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <b className="truncate font-verdana text-[11px]">
                      {c.name}
                    </b>
                    {c.liveCall && (
                      <span
                        title={`Video call: ${c.liveCall.count} in call`}
                        className="flex-none border border-black bg-black px-[3px] font-courier text-[10px]/[13px] text-lcd"
                      >
                        📹{c.liveCall.count}
                      </span>
                    )}
                  </span>
                  <span className="flex-none font-courier text-[10px]">
                    {hydrated && c.lastAt ? formatShort(c.lastAt) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-arial text-[11px] opacity-85">
                    {c.preview}
                  </span>
                  {c.unread > 0 && (
                    <span className="flex-none border border-black bg-alert px-1 font-verdana text-[10px]/[14px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

/* ---------- Thread ---------- */

function ThreadHeader({ state }: { state: ChatState }) {
  const c = state.current;
  const hydrated = useHydrated();
  const [buzzing, startBuzz] = useTransition();
  const status =
    c.online || c.kind === "room"
      ? c.status
      : `Offline${hydrated && c.lastSeenAt ? ` · last seen ${formatShort(c.lastSeenAt)}` : ""}`;

  return (
    <div className="flex items-center gap-2 border-b border-win-shadow px-1 pt-1 pb-1.5">
      <Link
        href="/chat"
        aria-label={
          state.unreadTotal
            ? `Back to conversations, ${state.unreadTotal} new`
            : "Back to conversations"
        }
        className="bevel-btn tap inline-flex flex-none items-center gap-1 px-2 font-tahoma text-[11px] font-bold text-black! no-underline md:hidden"
      >
        ◄
        {state.unreadTotal > 0 ? (
          <span className="border border-black bg-alert px-1 text-[10px]/[14px] text-white">
            {state.unreadTotal}
          </span>
        ) : (
          "Back"
        )}
      </Link>
      <div
        className="size-[34px] flex-none border border-black text-center font-verdana text-[13px]/[34px] font-bold text-white"
        style={{ background: c.avatar }}
      >
        {c.initials}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate font-times text-base font-bold text-navy">
          {c.otherScreenName ? (
            <Link
              href={`/members/${c.otherScreenName}`}
              className="text-navy! no-underline hover:underline"
            >
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </h1>
        <div className="flex min-w-0 items-center gap-1 font-verdana text-[11px] text-win-dark">
          <span
            className="size-[7px] flex-none border border-black"
            style={{ background: dotColor(c.online) }}
          />
          <span className="truncate">{status}</span>
        </div>
      </div>
      {c.otherScreenName && (
        <Link
          href={`/members/${c.otherScreenName}`}
          className="hidden flex-none font-verdana text-[11px] whitespace-nowrap md:inline"
        >
          View Profile
        </Link>
      )}
      {c.kind === "group" && <GroupMembersButton state={state} />}
      {!c.liveCall && (
        <VideoCallButton
          conversationId={c.id}
          peerName={c.name}
          label="Call"
          compact
          className="flex-none px-2.5 py-[3px] font-tahoma text-[11px] font-bold"
        />
      )}
      <button
        type="button"
        disabled={buzzing}
        onClick={() => startBuzz(() => sendBuzz(c.id))}
        className="bevel-btn tap flex-none px-2.5 py-[3px] font-tahoma text-[11px] font-bold whitespace-nowrap"
      >
        Buzz!
      </button>
    </div>
  );
}

function Thread({
  state,
  onChanged,
}: {
  state: ChatState;
  onChanged: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const msgs = state.messages;
  const lastMine = useMemo(
    () => [...msgs].reverse().find((m) => m.mine && m.kind === "text"),
    [msgs],
  );
  const lastId = msgs.at(-1)?.id;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, msgs.length, state.typing]);

  const heart = async (m: ThreadMessage) => {
    if (m.id === Number.MAX_SAFE_INTEGER) return;
    await toggleHeart(m.id);
    onChanged();
  };

  return (
    <div
      ref={ref}
      aria-live="polite"
      className="bevel-in mt-1 flex min-h-0 flex-1 flex-col gap-2 overflow-auto overscroll-contain bg-white px-2 py-2.5 md:px-3"
    >
      {msgs.length === 0 && (
        <div className="m-auto text-center font-verdana text-[11px] text-win-shadow italic">
          No messages yet. Say hi! :-)
        </div>
      )}
      {msgs.map((m, i) => {
        const prev = msgs[i - 1];
        const newDay =
          hydrated &&
          (!prev ||
            new Date(prev.at).toDateString() !== new Date(m.at).toDateString());
        return (
          <div key={`${m.id}-${i}`} className="contents">
            {newDay && <DateDivider at={m.at} />}
            {m.kind === "system" ? (
              <div className="text-center font-verdana text-[11px] text-win-shadow italic">
                *** {m.body} ***
              </div>
            ) : (
              <div
                className="flex flex-col"
                style={{ alignItems: m.mine ? "flex-end" : "flex-start" }}
              >
                <div
                  onDoubleClick={() => heart(m)}
                  title="Double-click to heart"
                  className="relative max-w-[85%] cursor-default md:max-w-[72%] border border-black px-[9px] py-[5px] font-arial text-[13px]/[1.4] whitespace-pre-wrap shadow-[2px_2px_0_#808080] select-none [overflow-wrap:anywhere]"
                  style={{ background: m.mine ? "#CCCCFF" : "#FFFFE1" }}
                >
                  <div
                    className="mb-px font-verdana text-[10px] font-bold"
                    style={{ color: m.mine ? "#0000CC" : "#CC0000" }}
                  >
                    {m.senderName}
                  </div>
                  {m.body}
                  {m.heartCount > 0 && (
                    <span className="absolute right-1.5 -bottom-[9px] flex items-center gap-0.5 border border-black bg-white px-[3px] py-px font-verdana text-[9px] font-bold">
                      <Heart />
                      {m.heartCount}
                    </span>
                  )}
                </div>
                <div className="mt-[3px] font-courier text-[10px] text-win-shadow">
                  {hydrated ? formatTime(m.at) : " "}
                  {m === lastMine && m === msgs.at(-1) && state.readUpTo >= m.id
                    ? " · Read"
                    : ""}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {state.typing && (
        <div className="flex items-center gap-1 font-verdana text-[11px] text-win-dark italic">
          {state.typing} is typing
          <span className="animate-blink-fast">...</span>
        </div>
      )}
    </div>
  );
}

function DateDivider({ at }: { at: string }) {
  return (
    <div className="flex items-center gap-2 font-verdana text-[11px] text-win-shadow">
      <hr className="flex-1 border-0 border-t-2 [border-style:groove] border-white" />
      <span className="flex-none whitespace-nowrap">{formatLongDate(at)}</span>
      <hr className="flex-1 border-0 border-t-2 [border-style:groove] border-white" />
    </div>
  );
}

/* ---------- Composer ---------- */

function Composer({
  conversationId,
  onSent,
  onDone,
}: {
  conversationId: number;
  onSent: (text: string) => void;
  onDone: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lastTyping = useRef(0);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setError(null);
    onSent(text);
    try {
      await sendMessage(conversationId, text);
    } catch {
      setError("Message didn't go through. Try again?");
      setDraft(text);
    }
    await onDone();
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const now = Date.now();
    if (e.target.value && now - lastTyping.current > 2500) {
      lastTyping.current = now;
      setTyping(conversationId).catch(() => {});
    }
  };

  const fmt = "bevel-thin-out font-times text-[11px] px-1.5 text-win-shadow";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="mt-1"
    >
      <div className="flex items-center gap-0.5 pt-0.5 pb-[3px]">
        <span className="hidden items-center gap-0.5 md:flex">
          <span className={`${fmt} font-bold`} title="Coming in version 2.0">
            B
          </span>
          <span
            className={`${fmt} px-[7px] italic`}
            title="Coming in version 2.0"
          >
            I
          </span>
          <span className={`${fmt} underline`} title="Coming in version 2.0">
            U
          </span>
          <span className="mx-[3px] h-3.5 w-px bg-win-shadow" />
        </span>
        <button
          type="button"
          onClick={() => setDraft((d) => (d ? `${d} ` : "") + ":-)")}
          className="bevel-thin-out tap cursor-pointer bg-win-gray px-3 font-courier text-[11px] font-bold md:px-1.5"
        >
          :-)
        </button>
        <span
          className={`${fmt} tap inline-flex items-center px-3 font-tahoma md:px-1.5`}
          title="Coming in version 2.0"
        >
          Attach...
        </span>
        <span className="ml-auto font-verdana text-[10px] text-win-dark">
          {error ? (
            <b className="text-alert">{error}</b>
          ) : (
            <span className="hidden md:inline">
              Enter to send · Shift+Enter for new line
            </span>
          )}
        </span>
      </div>
      <div className="flex items-stretch gap-1">
        <textarea
          rows={2}
          value={draft}
          onChange={onChange}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={2000}
          placeholder="Type a message..."
          aria-label="Message"
          className="bevel-in-deep min-w-0 flex-1 resize-none bg-white px-1.5 py-1 font-arial text-[13px]/[1.4] outline-none"
        />
        <button
          type="submit"
          className="bevel-btn flex flex-col items-center justify-center gap-0.5 px-4 py-[3px] font-arial text-xs font-bold"
        >
          <Envelope size="xs" />
          Send
        </button>
      </div>
    </form>
  );
}
