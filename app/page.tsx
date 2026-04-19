"use client";

import { useState } from "react";
import PixelCharacter from "@/components/PixelCharacter";
import Chat from "@/components/Chat";

export default function Home() {
  const [smiling, setSmiling] = useState(false);

  function triggerSmile() {
    setSmiling(true);
    setTimeout(() => setSmiling(false), 2200);
  }

  return (
    <main className="stage">
      {/* LEFT: pixel stage */}
      <section className="left-panel">
        <div className="name-card">
          <h1>Mason Um</h1>
          <div className="subtitle">TPM, GPU Engineering Ops @ NVIDIA · Mountain View, CA</div>
        </div>

        <div className="scene">
          <div style={{ position: "relative" }}>
            <PixelCharacter scale={10} smiling={smiling} />
            <div className="floor-shadow" />
          </div>
        </div>

        <div className="stat-readout">
          <div><span className="k">focus</span><span className="v">Rubin NPI</span></div>
          <div><span className="k">based</span><span className="v">Mountain View</span></div>
          <div className="reach-cell">
            <span className="k">reach</span>
            <span className="v reach-btns">
              <a className="link-btn" href="mailto:masonum86@gmail.com">email</a>
              <a className="link-btn" href="https://www.linkedin.com/in/mason-u" target="_blank" rel="noreferrer">linkedin</a>
            </span>
          </div>
        </div>
      </section>

      {/* RIGHT: chat */}
      <Chat onAssistantReply={triggerSmile} />
    </main>
  );
}
