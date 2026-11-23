"use client";

import { useEffect, useRef, useState } from "react";

const RETRO_W = 160;
const RETRO_H = 120;
const RETRO_FPS = 12;

type Props = {
  stream: MediaStream | null;
  /** CU-SeeMe look: 160×120 chunky pixels, scanlines, ~12fps. */
  retro: boolean;
  mirror?: boolean;
  className?: string;
};

/** A muted video surface (audio is played separately by <RemoteAudio>). The caller positions it (`absolute`/`relative`). */
export function CallVideo({ stream, retro, mirror = false, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    if (!retro) return;
    const v = videoRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!v || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const t = setInterval(() => {
      if (v.readyState < 2) return;
      // Cover-crop to 4:3, like a 1999 webcam.
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      const scale = Math.max(RETRO_W / vw, RETRO_H / vh);
      const sw = RETRO_W / scale;
      const sh = RETRO_H / scale;
      ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, RETRO_W, RETRO_H);
    }, 1000 / RETRO_FPS);
    return () => clearInterval(t);
  }, [retro, stream]);

  const flip = mirror ? "-scale-x-100" : "";
  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`absolute inset-0 size-full object-cover ${flip} ${retro ? "invisible" : ""}`}
      />
      {retro && (
        <>
          <canvas
            ref={canvasRef}
            width={RETRO_W}
            height={RETRO_H}
            className={`absolute inset-0 size-full object-cover [image-rendering:pixelated] saturate-[.85] contrast-[1.1] ${flip}`}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.28)_0,rgba(0,0,0,.28)_1px,transparent_1px,transparent_3px)]"
          />
        </>
      )}
    </div>
  );
}

/** Plays the other person's audio. */
export function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.srcObject = stream;
    if (stream) a.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

/** 0..1 loudness of a stream's audio, sampled ~10×/s. */
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    const ac = new AudioContext();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const t = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const b of buf) sum += ((b - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    }, 100);
    return () => {
      clearInterval(t);
      void ac.close();
    };
  }, [stream]);
  return stream ? level : 0;
}

/** LED-style 10-segment meter. */
export function LevelMeter({ level, label, compact = false }: { level: number; label: string; compact?: boolean }) {
  const lit = Math.round(level * 10);
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={lit} className={`flex bg-black ${compact ? "gap-px p-0.5" : "gap-0.5 p-1"}`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={compact ? "h-1.5 w-1" : "h-2.5 w-2"}
          style={{ background: i < lit ? (i > 7 ? "#FF3333" : i > 5 ? "#FFCC00" : "#00FF00") : "#103010" }}
        />
      ))}
    </div>
  );
}
