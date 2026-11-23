import { PixelArt } from "./pixel-art";

const ENVELOPE = [
  "XXXXXXXXXXXXXXX",
  "XXYYYYYYYYYYYXX",
  "X.XYYYYYYYYYX.X",
  "X..XYYYYYYYX..X",
  "X...XYYYYYX...X",
  "X....XYYYX....X",
  "X.....XYX.....X",
  "X......X...RR.X",
  "X..........RR.X",
  "X.............X",
  "XXXXXXXXXXXXXXX",
] as const;
const ENVELOPE_COLORS = { X: "#000", ".": "#fff", Y: "#FFFFCC", R: "#CC0000" };

const STAR = ["..X..", "..X..", "XXXXX", ".XXX.", ".X.X."] as const;
const HEART = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."] as const;

const ENVELOPE_SCALE = { xs: 1, sm: 2, md: 4, big: 5 } as const;

export function Envelope({
  size = "md",
  bob = false,
}: {
  size?: keyof typeof ENVELOPE_SCALE;
  bob?: boolean;
}) {
  const art = <PixelArt map={ENVELOPE} colors={ENVELOPE_COLORS} scale={ENVELOPE_SCALE[size]} />;
  return bob ? <div className="animate-bob">{art}</div> : art;
}

export function Star({ delayed = false }: { delayed?: boolean }) {
  return (
    <div className="animate-blink" style={delayed ? { animationDelay: "0.7s" } : undefined}>
      <PixelArt map={STAR} colors={{ X: "#FFCC00" }} scale={3} />
    </div>
  );
}

export function Heart() {
  return <PixelArt map={HEART} colors={{ X: "#CC0000" }} scale={2} />;
}
