"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { fetchActiveAnnouncements } from "@/features/public/components/api/announcements-service";
import type { Announcement } from "@/features/public/components/api/announcements-service";

const FALLBACK_MESSAGES: Announcement[] = [
  {
    id: "1",
    title: "🔥 Rainy season promotion: Get 20% off Ceramic Coating & Undercarriage Wash combo!",
    message: null,
    type: "PROMO",
    active: true,
    priority: 1,
    linkUrl: "/customer/bookings/new",
    linkLabel: "Book now",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "📢 AutoWash is open daily from 7:00 AM to 9:00 PM.",
    message: null,
    type: "INFO",
    active: true,
    priority: 0,
    linkUrl: null,
    linkLabel: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
];

const PAUSE_MS = 10_000; // pause between cycles
const SPEED_PX_PER_MS = 0.07; // scroll speed

export function MarqueeTicker() {
  const { language } = useLanguageStore();
  const [items, setItems] = useState<Announcement[]>(FALLBACK_MESSAGES);

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunning = useRef(false);

  useEffect(() => {
    fetchActiveAnnouncements()
      .then((data) => { if (data && data.length > 0) setItems(data); })
      .catch(() => {});
  }, []);

  const stopAnim = useCallback(() => {
    isRunning.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pauseRef.current !== null) { clearTimeout(pauseRef.current); pauseRef.current = null; }
  }, []);

  const startCycle = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const trackWidth = el.scrollWidth;
    const containerWidth = el.parentElement?.offsetWidth ?? 0;

    // Total travel: start fully off-screen right, end fully off-screen left
    // startX = +containerWidth (content starts just outside right edge)
    // endX   = -trackWidth     (content fully gone past left edge)
    const totalTravel = containerWidth + trackWidth;

    if (totalTravel <= 0) return;

    // Start position: content just off the right edge
    let currentX = containerWidth;
    el.style.transform = `translateX(${currentX}px)`;

    let lastTime: number | null = null;
    isRunning.current = true;

    function step(timestamp: number) {
      if (!isRunning.current) return;
      if (lastTime === null) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      currentX -= delta * SPEED_PX_PER_MS;

      if (currentX <= -trackWidth) {
        // Fully scrolled off left edge — pause then restart
        if (el) el.style.transform = `translateX(-${trackWidth}px)`;
        isRunning.current = false;
        pauseRef.current = setTimeout(() => {
          startCycle();
        }, PAUSE_MS);
        return;
      }

      if (el) el.style.transform = `translateX(${currentX}px)`;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start animation once items are known + DOM rendered
  useEffect(() => {
    const t = setTimeout(() => {
      stopAnim();
      startCycle();
    }, 400);
    return () => { clearTimeout(t); stopAnim(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-sky-500/20 text-white select-none z-50">
      <div className="flex items-center gap-3 px-4 py-2">

        {/* Badge */}
        <div className="flex items-center gap-1.5 shrink-0 bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-sky-400">
          <Megaphone className="h-3 w-3" />
          <span>{translate(language, "Tin mới", "News")}</span>
        </div>

        {/* Scrolling track */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div
            ref={trackRef}
            className="inline-flex items-center whitespace-nowrap will-change-transform"
            style={{ transform: "translateX(100vw)" }}
          >
            {items.map((item, i) => (
              <span key={item.id} className="inline-flex items-center gap-3">
                {/* Message text */}
                <span className="text-xs font-medium tracking-wide text-slate-100">
                  {item.title}
                </span>

                {/* Inline CTA button for this announcement */}
                {item.linkUrl && (
                  <Link
                    href={item.linkUrl}
                    className="inline-flex items-center rounded-full border border-sky-400/50 bg-sky-500/20 px-3 py-0.5 text-[11px] font-bold text-sky-200 hover:bg-sky-500/40 transition-colors"
                  >
                    {item.linkLabel ?? translate(language, "Xem thêm", "Learn more")}
                  </Link>
                )}

                {/* Separator between announcements (not after last) */}
                {i < items.length - 1 && (
                  <span className="mx-10 text-sky-600/60 text-sm">✦</span>
                )}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
