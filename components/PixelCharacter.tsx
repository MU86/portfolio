"use client";

import { useEffect, useState } from "react";

/**
 * Hand-authored 16x24 pixel sprite with 2 frames (idle breathing).
 * Each frame is a grid of color indices; 0 = transparent.
 * Palette is CSS-variable friendly, so it matches the site theme.
 */

const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#1a1410", // outline
  2: "#f4c7a1", // skin
  3: "#c99777", // skin shadow
  4: "#2a1f1a", // hair
  5: "#4a3428", // hair highlight
  6: "#a8ff60", // shirt (phosphor green — matches theme)
  7: "#6fb33d", // shirt shadow
  8: "#3a4a5e", // pants
  9: "#25303d", // pants shadow
  10: "#ffb454", // accent (headphones)
  11: "#ffffff", // eye white / glint
  12: "#64e3ff", // glow
};

// 16 wide x 24 tall. Frame A (idle up) and Frame B (idle down, shifts by 1px).
// Designed to read as a friendly dev-coder with headphones.
const FRAME_A: number[][] = [
  // row 0-3: hair top
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,5,5,5,5,4,4,0,0,0,0],
  [0,0,0,4,4,5,5,5,5,5,5,4,4,0,0,0],
  [0,0,4,4,5,5,5,5,5,5,5,5,4,4,0,0],
  // row 4-5: headphone band + hair sides
  [0,10,10,4,5,5,5,5,5,5,5,5,4,10,10,0],
  [0,10,4,4,5,5,5,5,5,5,5,5,4,4,10,0],
  // row 6-10: face
  [0,10,4,2,2,2,2,2,2,2,2,2,2,4,10,0],
  [0,10,4,2,2,11,1,2,2,1,11,2,2,4,10,0], // eyes
  [0,10,4,2,2,11,1,2,2,1,11,2,2,4,10,0],
  [0,0,4,2,2,2,2,2,2,2,2,2,2,4,0,0],
  [0,0,4,2,3,2,2,1,1,2,2,3,2,4,0,0], // mouth
  // row 11: neck
  [0,0,0,4,2,2,2,2,2,2,2,2,4,0,0,0],
  [0,0,0,0,3,2,2,2,2,2,2,3,0,0,0,0],
  // row 13-18: shirt
  [0,0,6,6,6,6,6,6,6,6,6,6,6,6,0,0],
  [0,6,6,6,7,6,6,6,6,6,6,7,6,6,6,0],
  [0,6,6,6,6,6,6,12,12,6,6,6,6,6,6,0], // chest glow
  [0,6,6,6,6,6,6,6,6,6,6,6,6,6,6,0],
  [0,6,7,6,6,6,6,6,6,6,6,6,6,7,6,0],
  [0,0,6,6,6,6,6,6,6,6,6,6,6,6,0,0],
  // row 19-21: pants
  [0,0,8,8,8,8,8,8,8,8,8,8,8,8,0,0],
  [0,0,8,9,8,8,8,0,0,8,8,8,9,8,0,0],
  [0,0,8,9,8,8,8,0,0,8,8,8,9,8,0,0],
  // row 22-23: shoes
  [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
];

// Frame B: same body but mouth slightly different + one-pixel shirt shift = "breathing"
const FRAME_B: number[][] = FRAME_A.map((row, y) => {
  if (y === 10) return [0,0,4,2,2,2,2,1,1,2,2,2,2,4,0,0]; // closed mouth
  if (y === 15) return [0,6,6,6,6,6,6,6,12,12,6,6,6,6,6,0]; // chest glow shifted
  return [...row];
});

// Frame C: blink
const FRAME_C: number[][] = FRAME_A.map((row, y) => {
  if (y === 7 || y === 8) return [0,10,4,2,2,1,1,2,2,1,1,2,2,4,10,0];
  return [...row];
});

// Frame S: smile (corners up + wider open mouth on the row below)
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
    // idle loop: A (600ms) -> B (600ms) -> A -> occasional blink (C, 120ms)
    let i = 0;
    const tick = () => {
      i++;
      // every ~8 ticks, insert a blink
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
