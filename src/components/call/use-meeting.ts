"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { joinCall } from "@/actions/calls";
import { sendBuzz } from "@/actions/chat";
import type { CallView, ParticipantView, SignalView } from "@/lib/call-data";
import { playRingback, stopRinging } from "@/lib/dialup-sound";

export type Phase =
  | "media" // asking for camera / mic
  | "denied" // permission refused
  | "joining"
  | "live" // in the call (alone or with others)
  | "full"
  | "busy" // already in another call
  | "ended"
  | "elsewhere"; // joined from another window

export type PeerState = "connecting" | "connected" | "reconnecting" | "failed";

export type RemotePeer = {
  pid: number;
  person: ParticipantView;
  stream: MediaStream | null;
  mic: boolean;
  cam: boolean;
  state: PeerState;
};

export type Toast = { id: number; text: string };

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const CONNECT_TIMEOUT_MS = 25_000;
const RECONNECT_TIMEOUT_MS = 15_000;
const TERMINAL = new Set(["ended", "declined", "missed", "cancelled"]);

/** Signals go over plain fetch so they're sent in parallel (server actions from one page run one at a time). */
function sendSignal(callId: number, from: number, to: number, kind: "offer" | "answer" | "ice", payload: unknown) {
  return fetch(`/api/calls/${callId}/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, kind, payload }),
  });
}

/** Leaves the call. `keepalive` lets it finish even if the page is closing. */
function hangUp(callId: number, pid: number) {
  return fetch(`/api/calls/${callId}/hangup?pid=${pid}`, { method: "POST", keepalive: true });
}

type Conn = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  pendingIce: RTCIceCandidateInit[];
  timers: ReturnType<typeof setTimeout>[];
};

export function useMeeting(initial: CallView, answerMode: "video" | "voice" | null) {
  const [call, setCall] = useState(initial);
  const [phase, setPhase] = useState<Phase>(TERMINAL.has(initial.status) ? "ended" : "media");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<number, RemotePeer>>({});
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [kbps, setKbps] = useState<number | null>(null);
  const [buzzedAt, setBuzzedAt] = useState(0);
  const [busyCallId, setBusyCallId] = useState<number | null>(null);
  const [forceVoice, setForceVoice] = useState(answerMode === "voice" || !initial.withVideo);
  const [attempt, setAttempt] = useState(0);

  const connsRef = useRef(new Map<number, Conn>());
  const localRef = useRef<MediaStream | null>(null);
  const pidRef = useRef<number | null>(null);
  const doneRef = useRef(TERMINAL.has(initial.status));
  const stateRef = useRef({ mic: true, cam: true });

  const patchPeer = useCallback((pid: number, patch: Partial<RemotePeer>) => {
    setPeers((all) => (all[pid] ? { ...all, [pid]: { ...all[pid], ...patch } } : all));
  }, []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const broadcast = useCallback((msg: object) => {
    const s = JSON.stringify(msg);
    connsRef.current.forEach((c) => {
      if (c.dc?.readyState === "open") c.dc.send(s);
    });
  }, []);

  /* ---------- main lifecycle ---------- */
  useEffect(() => {
    if (doneRef.current) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSignal = 0;
    let known: Set<number> | null = null;
    const names = new Map<number, string>();
    const conns = connsRef.current;
    const callId = initial.id;

    const closeConn = (pid: number) => {
      const c = conns.get(pid);
      if (!c) return;
      c.timers.forEach(clearTimeout);
      c.pc.close();
      conns.delete(pid);
    };

    const teardown = () => {
      stopRinging();
      [...conns.keys()].forEach(closeConn);
      localRef.current?.getTracks().forEach((t) => t.stop());
    };

    const finish = (p: Phase) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (pollTimer) clearTimeout(pollTimer);
      teardown();
      setPhase(p);
    };

    function bindChannel(pid: number, dc: RTCDataChannel) {
      const c = conns.get(pid);
      if (c) c.dc = dc;
      dc.onopen = () => dc.send(JSON.stringify(stateRef.current));
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as { mic?: boolean; cam?: boolean; buzz?: boolean };
          if (msg.buzz) setBuzzedAt(Date.now());
          const patch: Partial<RemotePeer> = {};
          if (typeof msg.mic === "boolean") patch.mic = msg.mic;
          if (typeof msg.cam === "boolean") patch.cam = msg.cam;
          patchPeer(pid, patch);
        } catch {}
      };
    }

    function createConn(pid: number, offerer: boolean) {
      closeConn(pid);
      const stream = localRef.current!;
      const myPid = pidRef.current!;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const conn: Conn = { pc, dc: null, pendingIce: [], timers: [] };
      conns.set(pid, conn);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      if (offerer) {
        if (stream.getVideoTracks().length === 0) pc.addTransceiver("video", { direction: "recvonly" });
        bindChannel(pid, pc.createDataChannel("state"));
      } else {
        pc.ondatachannel = (e) => bindChannel(pid, e.channel);
      }
      pc.ontrack = (e) => patchPeer(pid, { stream: e.streams[0] ?? new MediaStream([e.track]) });
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(callId, myPid, pid, "ice", e.candidate.toJSON()).catch(() => {});
      };
      pc.onconnectionstatechange = () => {
        if (conns.get(pid)?.pc !== pc) return;
        const st = pc.connectionState;
        if (st === "connected") {
          conn.timers.forEach(clearTimeout);
          conn.timers = [];
          patchPeer(pid, { state: "connected" });
        } else if (st === "disconnected") {
          patchPeer(pid, { state: "reconnecting" });
          conn.timers.push(setTimeout(() => pc.connectionState !== "connected" && patchPeer(pid, { state: "failed" }), RECONNECT_TIMEOUT_MS));
        } else if (st === "failed") {
          patchPeer(pid, { state: "failed" });
        }
      };
      conn.timers.push(setTimeout(() => pc.connectionState !== "connected" && patchPeer(pid, { state: "failed" }), CONNECT_TIMEOUT_MS));
      patchPeer(pid, { state: "connecting", stream: null });
      return conn;
    }

    async function offerTo(pid: number) {
      const { pc } = createConn(pid, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(callId, pidRef.current!, pid, "offer", { type: offer.type, sdp: offer.sdp });
    }

    async function applySignal(s: SignalView) {
      if (s.kind === "offer") {
        // A (re)offer always starts a fresh connection with that person.
        const conn = createConn(s.from, false);
        await conn.pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
        const answer = await conn.pc.createAnswer();
        await conn.pc.setLocalDescription(answer);
        await sendSignal(callId, pidRef.current!, s.from, "answer", { type: answer.type, sdp: answer.sdp });
        for (const c of conn.pendingIce.splice(0)) await conn.pc.addIceCandidate(c).catch(() => {});
        return;
      }
      const conn = conns.get(s.from);
      if (!conn) return;
      if (s.kind === "answer") {
        if (conn.pc.signalingState !== "have-local-offer") return;
        await conn.pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
        for (const c of conn.pendingIce.splice(0)) await conn.pc.addIceCandidate(c).catch(() => {});
      } else {
        const c = s.payload as RTCIceCandidateInit;
        if (conn.pc.remoteDescription) await conn.pc.addIceCandidate(c).catch(() => {});
        else conn.pendingIce.push(c);
      }
    }

    function reconcile(view: CallView) {
      const myPid = pidRef.current!;
      const others = view.participants.filter((p) => p.pid !== myPid);
      const ids = new Set(others.map((p) => p.pid));
      setPeers((all) => {
        const next: Record<number, RemotePeer> = {};
        for (const p of others) {
          next[p.pid] = all[p.pid]
            ? { ...all[p.pid], person: p }
            : { pid: p.pid, person: p, stream: null, mic: true, cam: p.withVideo, state: "connecting" };
        }
        return next;
      });
      for (const p of others) {
        // The newer participant (higher id) always makes the offer, so two sides never offer at once.
        if (!conns.has(p.pid) && p.pid < myPid) offerTo(p.pid).catch(() => patchPeer(p.pid, { state: "failed" }));
      }
      for (const pid of [...conns.keys()]) if (!ids.has(pid)) closeConn(pid);
      if (known) {
        for (const p of others) if (!known.has(p.pid)) toast(`${p.screenName} joined`);
        for (const pid of known) if (!ids.has(pid) && names.get(pid)) toast(`${names.get(pid)} left`);
      }
      others.forEach((p) => names.set(p.pid, p.screenName));
      known = ids;
    }

    async function poll() {
      if (cancelled || doneRef.current) return;
      let fast = true;
      try {
        const res = await fetch(`/api/calls/${callId}?pid=${pidRef.current}&after=${lastSignal}`, { method: "POST", cache: "no-store" });
        if (res.status === 401) return window.location.assign(new URL("/signon", window.location.origin));
        if (res.status === 404) return finish("ended");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { call: CallView; signals: SignalView[]; inCall: boolean };
        if (cancelled || doneRef.current) return;
        setCall(data.call);
        if (TERMINAL.has(data.call.status)) return finish("ended");
        if (!data.inCall) return finish("elsewhere");
        reconcile(data.call);
        for (const s of data.signals) {
          await applySignal(s).catch(() => {});
          lastSignal = Math.max(lastSignal, s.id);
        }
        const others = data.call.participants.length - 1;
        fast = others === 0 || [...conns.values()].some((c) => c.pc.connectionState !== "connected");
      } catch {
        /* transient: try again on the next poll */
      }
      pollTimer = setTimeout(poll, fast ? 1000 : 2500);
    }

    async function getMedia(): Promise<MediaStream | null> {
      const wantVideo = !forceVoice;
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: wantVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
        });
      } catch (e) {
        const name = (e as DOMException).name;
        if (name === "NotAllowedError" || name === "SecurityError") return null;
        if (!wantVideo) throw e;
        // No camera, or it's busy in another app: join with voice.
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        setNote(
          name === "NotReadableError"
            ? "Your camera is busy in another app, so you joined with voice only."
            : "No camera found, so you joined with voice only.",
        );
        return audio;
      }
    }

    (async () => {
      setPhase("media");
      let stream: MediaStream | null;
      try {
        stream = await getMedia();
      } catch {
        stream = null;
      }
      if (cancelled) return stream?.getTracks().forEach((t) => t.stop());
      if (!stream) return setPhase("denied");
      localRef.current = stream;
      setLocalStream(stream);
      const hasVideo = stream.getVideoTracks().length > 0;
      setCam(hasVideo);
      stateRef.current = { mic: true, cam: hasVideo };

      setPhase("joining");
      const r = await joinCall(callId, hasVideo).catch(() => ({ error: "ended" as const, call: null }));
      if (cancelled) {
        if ("pid" in r) navigator.sendBeacon(`/api/calls/${callId}/hangup?pid=${r.pid}`);
        return stream.getTracks().forEach((t) => t.stop());
      }
      if ("error" in r) {
        if (r.call) setCall(r.call);
        if (r.error === "self-busy") setBusyCallId(r.busyCallId ?? null);
        return finish(r.error === "full" ? "full" : r.error === "self-busy" ? "busy" : "ended");
      }
      pidRef.current = r.pid;
      setCall(r.call);
      setPhase("live");
      reconcile(r.call);
      poll();
    })();

    const onHide = () => {
      if (!doneRef.current && pidRef.current) navigator.sendBeacon(`/api/calls/${callId}/hangup?pid=${pidRef.current}`);
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
      if (pollTimer) clearTimeout(pollTimer);
      if (!doneRef.current && pidRef.current) {
        navigator.sendBeacon(`/api/calls/${callId}/hangup?pid=${pidRef.current}`);
        doneRef.current = true;
      }
      teardown();
    };
  }, [initial.id, forceVoice, attempt, patchPeer, toast]);

  /* ---------- after you leave: keep the "still in the call" dialog current ---------- */
  const watchAfterLeave = (phase === "ended" || phase === "full") && call.status === "active";
  useEffect(() => {
    if (!watchAfterLeave) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/calls/${initial.id}`, { method: "POST", cache: "no-store" }).catch(() => null);
      if (res?.ok) setCall(((await res.json()) as { call: CallView }).call);
    }, 2500);
    return () => clearInterval(t);
  }, [watchAfterLeave, initial.id]);

  /* ---------- ring-back while you're the only one there ---------- */
  const others = Object.values(peers);
  const waiting = phase === "live" && others.length === 0 && call.ringing.length > 0 && call.startedByMe;
  useEffect(() => {
    if (!waiting) return;
    playRingback();
    return stopRinging;
  }, [waiting]);

  /* ---------- bitrate readout (all incoming streams) ---------- */
  const anyConnected = others.some((p) => p.state === "connected");
  useEffect(() => {
    if (!anyConnected) return;
    let last = 0;
    let lastAt = 0;
    const t = setInterval(async () => {
      let bytes = 0;
      for (const c of connsRef.current.values()) {
        const stats = await c.pc.getStats().catch(() => null);
        stats?.forEach((r) => {
          if (r.type === "inbound-rtp") bytes += (r as RTCInboundRtpStreamStats).bytesReceived ?? 0;
        });
      }
      const now = performance.now();
      if (lastAt && bytes >= last) setKbps(((bytes - last) * 8) / (now - lastAt));
      last = bytes;
      lastAt = now;
    }, 2000);
    return () => clearInterval(t);
  }, [anyConnected]);

  /* ---------- controls ---------- */
  const toggleMic = useCallback(() => {
    const next = !stateRef.current.mic;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    stateRef.current.mic = next;
    setMic(next);
    broadcast({ mic: next });
  }, [broadcast]);

  const toggleCam = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;
    const next = !stateRef.current.cam;
    tracks.forEach((t) => (t.enabled = next));
    stateRef.current.cam = next;
    setCam(next);
    broadcast({ cam: next });
  }, [broadcast]);

  const buzz = useCallback(() => {
    broadcast({ buzz: true });
    sendBuzz(initial.conversationId).catch(() => {});
  }, [initial.conversationId, broadcast]);

  const end = useCallback(async () => {
    const pid = pidRef.current;
    doneRef.current = true;
    stopRinging();
    connsRef.current.forEach((c) => {
      c.timers.forEach(clearTimeout);
      c.pc.close();
    });
    connsRef.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("ended");
    if (pid) await hangUp(initial.id, pid).catch(() => {});
    const res = await fetch(`/api/calls/${initial.id}`, { method: "POST" }).catch(() => null);
    if (res?.ok) setCall(((await res.json()) as { call: CallView }).call);
  }, [initial.id]);

  /** From the "blocked" dialog: join with the microphone only. */
  const retryVoiceOnly = useCallback(() => {
    setForceVoice(true);
    setAttempt((a) => a + 1);
  }, []);

  const hasCamera = (localStream?.getVideoTracks().length ?? 0) > 0;

  return {
    call,
    phase,
    localStream,
    peers: others.sort((a, b) => a.pid - b.pid),
    mic,
    cam: cam && hasCamera,
    hasCamera,
    note,
    toasts,
    kbps,
    buzzedAt,
    busyCallId,
    toggleMic,
    toggleCam,
    buzz,
    end,
    retryVoiceOnly,
  };
}
