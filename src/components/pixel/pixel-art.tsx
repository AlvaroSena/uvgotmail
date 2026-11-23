type Props = {
  map: readonly string[];
  colors: Record<string, string>;
  scale: number;
  className?: string;
};

/** Renders an ASCII pixel map as a crisp SVG (port of the design's `px()` helper). */
export function PixelArt({ map, colors, scale, className }: Props) {
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const fill = colors[ch];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }),
  );
  return (
    <svg
      aria-hidden
      width={map[0].length * scale}
      height={map.length * scale}
      viewBox={`0 0 ${map[0].length} ${map.length}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block" }}
    >
      {rects}
    </svg>
  );
}
