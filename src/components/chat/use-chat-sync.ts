"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChatListState, ChatState } from "@/lib/chat-types";

const POLL_MS = 2000;

/** Polls the chat state for one conversation. Pass `null` to pause. */
export function useChatSync(conversationId: number | null, initial: ChatState | null = null) {
  const [state, setState] = useState<ChatState | null>(initial);
  const [offline, setOffline] = useState(false);
  const inflight = useRef(false);
  const idRef = useRef(conversationId);
  useEffect(() => {
    idRef.current = conversationId;
  }, [conversationId]);

  const refresh = useCallback(async () => {
    const id = idRef.current;
    if (id == null || inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(`/api/chat/${id}`, { method: "POST", cache: "no-store" });
      if (res.status === 401) {
        window.location.assign(new URL("/signon", window.location.origin));
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as ChatState;
      if (idRef.current === id) setState(next);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    if (conversationId == null) return;
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [conversationId, refresh]);

  return { state, setState, refresh, offline };
}

/** Polls just the conversation list (phone list screen). */
export function useChatListSync(initial: ChatListState) {
  const [state, setState] = useState(initial);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/chat", { method: "POST", cache: "no-store" });
        if (res.status === 401) {
          window.location.assign(new URL("/signon", window.location.origin));
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        setState((await res.json()) as ChatListState);
        setOffline(false);
      } catch {
        setOffline(true);
      } finally {
        busy = false;
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, []);

  return { state, offline };
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. Lets us format times in the viewer's timezone safely. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
