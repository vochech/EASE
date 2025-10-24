"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function FocusPage() {
  const DEFAULT = 25 * 60; // 25:00
  const [left, setLeft] = useState(DEFAULT);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  // timer loop
  useEffect(() => {
    if (!running) {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
      return;
    }
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.floor((t - last) / 1000);
      if (dt >= 1) {
        setLeft((prev) => Math.max(0, prev - dt));
        last = t;
      }
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  // space = start/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = () => { setRunning(false); setLeft(DEFAULT); };
  const finish = () => { setRunning(false); setLeft(0); };

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10 flex flex-col items-center justify-center bg-[--bg]">
      {/* Title (placeholder: jeden úkol) */}
      <h1 className="text-sm tracking-wide text-neutral-500 mb-6">Focus Mode</h1>

      {/* Time */}
      <div className="text-[min(20vw,140px)] leading-none font-mono tabular-nums select-none">
        {fmt(left)}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-3">
        <button
          className="ease-outline-btn"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button className="ease-outline-btn" onClick={finish}>Finish</button>
        <button className="ease-outline-btn" onClick={reset}>Reset</button>
        <Link href="/" className="ease-outline-btn">Back</Link>
      </div>

      {/* Notes */}
      <div className="w-full max-w-xl mt-10">
        <textarea
          placeholder="Notes (optional)…"
          className="w-full min-h-[120px] rounded-(--r) border border-[--border] bg-white p-3 text-sm"
        />
      </div>

      {/* Tip */}
      <p className="mt-4 text-xs text-neutral-500">Tip: Space = Start/Pause</p>
    </div>
  );
}
