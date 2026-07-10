"use client";

import { useEffect, useMemo, useState } from "react";

const HOLD_DURATION_MS = 15 * 60 * 1000;

interface CountdownTimerProps {
  expiresAt: number;
  onExpired: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    let expired = false;
    const tick = () => {
      const nextRemaining = Math.max(0, expiresAt - Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0 && !expired) {
        expired = true;
        onExpired();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const isUrgent = remainingMs <= 2 * 60 * 1000;
  const progress = useMemo(
    () => Math.max(0, Math.min(100, (remainingMs / HOLD_DURATION_MS) * 100)),
    [remainingMs],
  );

  return (
    <div
      className={`rounded-xl border p-4 ${
        isUrgent
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider">Slot hold expires in</p>
          {isUrgent ? <p className="mt-1 text-sm">Please confirm before the hold is released.</p> : null}
        </div>
        <div className="font-mono text-3xl font-black tabular-nums">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full transition-all ${isUrgent ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
