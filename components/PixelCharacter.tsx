"use client";

import { useEffect, useState } from "react";

/**
 * Hand-authored 16x24 pixel sprite. Formal look: button-up shirt,
 * charcoal vest, tie, dark slacks.
 */

const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#0d0c0a", // outline
  2: "#f4c7a1", // skin
  3: "#c99777", // skin shadow
  4: "#2a1f1a", // hair
  5: "#4a3428", // hair highlight
  6: "#5b6a4d", // sweater olive
  7: "#3f4a36", // sweater shadow
  8: "#3a3026", // chinos warm dark
  9: "#26201a", // chinos shadow
  10: "#5b6a4d", // unused (kept so legacy refs stay valid)
  11: "#f3eee5", // shirt white / eye white
  12: "#5b6a4d", // unused (was tie)
};

// 16 wide x 24 tall. Frame A (idle), B (subtle breath), C (blink), S (smile).
const FRAME_A: number[][] = [
  // hair (rows 0-5)
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,5,5,5,5,4,4,0,0,0,0],
  [0,0,0,4,4,5,5,5,5,5,5,4,4,0,0,0],
  [0,0,4,4,5,5,5,5,5,5,5,5,4,4,0,0],
  [0,0,4,4,5,5,5,5,5,5,5,5,4,4,0,0],
  [0,0,4,4,5,5,5,5,5,5,5,5,4,4,0,0],
  // face (rows 6-10)
  [0,0,4,2,2,2,2,2,2,2,2,2,2,4,0,0],
  [0,0,4,2,2,11,1,2,2,1,11,2,2,4,0,0], // eyes
  [0,0,4,2,2,11,1,2,2,1,11,2,2,4,0,0],
  [0,0,4,2,2,2,2,2,2,2,2,2,2,4,0,0],
  [0,0,4,2,3,2,2,1,1,2,2,3,2,4,0,0], // mouth
  // neck (rows 11-12)
  [0,0,0,4,2,2,2,2,2,2,2,2,4,0,0,0],
  [0,0,0,0,3,2,2,2,2,2,2,3,0,0,0,0],
  // sweater over collared shirt (rows 13-18)
  [0,0,6,6,6,11,11,11,11,11,11,6,6,6,0,0],   // shoulders + white collar peek
  [0,6,6,6,6,6,11,11,11,11,6,6,6,6,6,0],     // V-neck shows shirt
  [0,6,7,6,6,6,6,11,11,6,6,6,6,7,6,0],
  [0,6,7,6,6,6,6,6,6,6,6,6,6,7,6,0],         // sweater body
  [0,6,7,7,6,6,6,6,6,6,6,6,7,7,6,0],
  [0,0,6,7,7,7,6,6,6,6,7,7,7,6,0,0],         // sweater bottom hem
  // pants (rows 19-21)
  [0,0,8,8,8,8,8,8,8,8,8,8,8,8,0,0],
  [0,0,8,9,8,8,8,0,0,8,8,8,9,8,0,0],
  [0,0,8,9,8,8,8,0,0,8,8,8,9,8,0,0],
  // shoes (rows 22-23)
  [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
];

// Frame B: subtle breath — mouth closed, vest shifts a touch
const FRAME_B: number[][] = FRAME_A.map((row, y) => {
  if (y === 10) return [0,0,4,2,2,2,2,1,1,2,2,2,2,4,0,0]; // closed mouth
  return [...row];
});

// Frame C: blink
const FRAME_C: number[][] = FRAME_A.map((row, y) => {
  if (y === 7 || y === 8) return [0,0,4,2,2,1,1,2,2,1,1,2,2,4,0,0];
  return [...row];
});

// Frame S: smile (corners up + open mouth on the chin row)
const FRAME_S: number[][] = FRAME_A.map((row, y) => {
  if (y === 10) return [0,0,4,2,2,1,2,2,2,2,1,2,2,4,0,0];
  if (y === 11) return [0,0,0,4,2,2,1,1,1,1,2,2,4,0,0,0];
  return [...row];
});

function renderFrame(frame: number[][], scale: number, key: string) {
  const rects: JSX.Element[] = [];
  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      const c = frame[y][x];
      if (c === 0) continue;
      rects.push(
        <rect
          key={`${key}-${x}-${y}`}
          x={x * scale}
          y={y * scale}
          width={scale}
          height={scale}
          fill={PALETTE[c]}
          shapeRendering="crispEdges"
        />
      );
    }
  }
  return rects;
}

export default function PixelCharacter({
  scale = 10,
  smiling = false,
}: {
  scale?: number;
  smiling?: boolean;
}) {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      if (i % 9 === 0) {
        setFrameIdx(2);
        setTimeout(() => setFrameIdx(i % 2), 140);
      } else {
        setFrameIdx(i % 2);
      }
    };
    const id = setInterval(tick, 600);
    return () => clearInterval(id);
  }, []);

  const frame = smiling
    ? FRAME_S
    : frameIdx === 0
    ? FRAME_A
    : frameIdx === 1
    ? FRAME_B
    : FRAME_C;
  const w = 16 * scale;
  const h = 24 * scale;

  return (
    <svg
      className="pixel-char"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ imageRendering: "pixelated" }}
      aria-label="Pixel avatar"
    >
      {renderFrame(frame, scale, `f${frameIdx}`)}
    </svg>
  );
}
