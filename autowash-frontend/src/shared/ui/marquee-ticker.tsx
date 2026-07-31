"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Cpu, Megaphone } from "lucide-react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useActiveAnnouncements } from "@/features/public/components/hooks/use-announcements";
import type { Announcement } from "@/features/public/components/api/announcements-service";

const PAUSE_MS = 10_000;
const SPEED_PX_PER_MS = 0.07;

function isAnnouncementVisible(announcement: Pick<Announcement, "active" | "expiresAt">, now: number) {
  if (!announcement.active) return false;
  if (!announcement.expiresAt) return true;

  const expiresAtMs = new Date(announcement.expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > now;
}

function getAnnouncementTone(type: string) {
  if (type === "WARNING") {
    return {
      labelVi: "Canh bao",
      labelEn: "Warning",
      Icon: AlertTriangle,
      chipClassName: "border border-rose-400/40 bg-rose-500/18 text-rose-100",
      titleClassName: "text-rose-50",
      linkClassName: "border-rose-300/45 bg-rose-500/15 text-rose-100 hover:bg-rose-500/28",
      separatorClassName: "text-rose-300/60",
    };
  }

  return {
    labelVi: "He thong",
    labelEn: "System",
    Icon: Cpu,
    chipClassName: "border border-sky-400/35 bg-sky-500/16 text-sky-100",
    titleClassName: "text-slate-100",
    linkClassName: "border-sky-400/50 bg-sky-500/20 text-sky-200 hover:bg-sky-500/40",
    separatorClassName: "text-sky-600/60",
  };
}

export function MarqueeTicker() {
  const { language } = useLanguageStore();
  const { data: activeAnnouncements, refetch } = useActiveAnnouncements();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const items = useMemo(
    () => (activeAnnouncements ?? []).filter((item) => isAnnouncementVisible(item, currentTime)),
    [activeAnnouncements, currentTime],
  );
  const animationKey = useMemo(
    () => items.map((item) => `${item.id}:${item.type}:${item.title}:${item.expiresAt ?? ""}:${item.linkUrl ?? ""}`).join("|"),
    [items],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunning = useRef(false);

  const stopAnim = useCallback(() => {
    isRunning.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pauseRef.current !== null) {
      clearTimeout(pauseRef.current);
      pauseRef.current = null;
    }
  }, []);

  const startCycle = useCallback(() => {
    const el = trackRef.current;
    if (!el || items.length === 0) return;

    const trackWidth = el.scrollWidth;
    const containerWidth = el.parentElement?.offsetWidth ?? 0;
    const totalTravel = containerWidth + trackWidth;

    if (totalTravel <= 0) return;

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
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${trackWidth}px)`;
        }
        isRunning.current = false;
        pauseRef.current = setTimeout(() => {
          startCycle();
        }, PAUSE_MS);
        return;
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${currentX}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) {
      stopAnim();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      stopAnim();
      startCycle();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      stopAnim();
    };
  }, [animationKey, items.length, startCycle, stopAnim]);

  useEffect(() => {
    if (!activeAnnouncements?.some((item) => item.expiresAt)) return;

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [activeAnnouncements]);

  useEffect(() => {
    if (!activeAnnouncements?.length) return;

    const nearestExpiry = activeAnnouncements
      .map((item) => (item.expiresAt ? new Date(item.expiresAt).getTime() : Number.POSITIVE_INFINITY))
      .filter((value) => Number.isFinite(value) && value > Date.now())
      .sort((left, right) => left - right)[0];

    if (!nearestExpiry || !Number.isFinite(nearestExpiry)) return;

    const timeoutMs = Math.max(0, nearestExpiry - Date.now()) + 250;
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(Date.now());
      void refetch();
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeAnnouncements, refetch]);

  return (
    <div className="relative z-50 w-full overflow-hidden border-b border-sky-500/20 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white select-none">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-400">
          <Megaphone className="h-3 w-3" />
          <span>{translate(language, "Tin moi", "News")}</span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          {items.length > 0 ? (
            <div
              ref={trackRef}
              className="inline-flex items-center whitespace-nowrap will-change-transform"
              style={{ transform: "translateX(100vw)" }}
            >
              {items.map((item, index) => {
                const tone = getAnnouncementTone(item.type);
                const ToneIcon = tone.Icon;

                return (
                  <span key={item.id} className="inline-flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${tone.chipClassName}`}>
                      <ToneIcon className="h-3 w-3" />
                      <span>{translate(language, tone.labelVi, tone.labelEn)}</span>
                    </span>

                    <span className={`text-xs font-semibold tracking-wide ${tone.titleClassName}`}>
                      {item.title}
                    </span>

                    {item.linkUrl && (
                      <Link
                        href={item.linkUrl}
                        className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold transition-colors ${tone.linkClassName}`}
                      >
                        {item.linkLabel ?? translate(language, "Xem them", "Learn more")}
                      </Link>
                    )}

                    {index < items.length - 1 && (
                      <span className={`mx-10 text-sm ${tone.separatorClassName}`}>•</span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="h-5 w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
