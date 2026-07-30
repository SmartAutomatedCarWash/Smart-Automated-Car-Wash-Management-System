"use client";

import { createElement, useEffect, useMemo, useRef } from "react";
import type { ComponentType } from "react";
import {
  ChevronRight,
  Crown,
  Gem,
  Gift,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  X,
  Coins,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";

type TierCode = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | string;
type SparkleSpec = {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
};

export function MembershipTierUpgradePopup({
  open,
  onClose,
  oldTier,
  newTier,
  onViewTier,
}: {
  open: boolean;
  onClose: () => void;
  oldTier?: TierCode | null;
  newTier: TierCode;
  onViewTier?: () => void;
}) {
  const nextTheme = getTierCelebrationTheme(newTier);
  const previousTheme = getTierCelebrationTheme(oldTier ?? "BRONZE");
  const TierIcon = nextTheme.icon;
  const OldTierIcon = previousTheme.icon;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playedCelebrationRef = useRef(false);

  const bonusPoints = useMemo(() => getTierUpgradeBonus(newTier), [newTier]);
  const benefitCards = useMemo(
    () => [
      {
        icon: Star,
        title: "New Tier Benefits",
        description: "Unlock premium privileges.",
      },
      {
        icon: Trophy,
        title: "Bonus Points",
        description: `+${bonusPoints.toLocaleString("en-US")} pts`,
      },
      {
        icon: Gift,
        title: "Exclusive Rewards",
        description: "New rewards are waiting for you.",
      },
    ],
    [bonusPoints],
  );
  const sparkleSpecs = useMemo<SparkleSpec[]>(
    () => [
      { left: "6%", top: "9%", size: 14, delay: "0s", duration: "2.4s" },
      { left: "14%", top: "18%", size: 10, delay: "0.4s", duration: "2.9s" },
      { left: "82%", top: "10%", size: 16, delay: "0.2s", duration: "2.6s" },
      { left: "90%", top: "22%", size: 11, delay: "0.7s", duration: "3.1s" },
      { left: "12%", top: "70%", size: 12, delay: "1s", duration: "2.8s" },
      { left: "88%", top: "74%", size: 15, delay: "0.9s", duration: "2.5s" },
      { left: "50%", top: "12%", size: 13, delay: "0.3s", duration: "2.2s" },
      { left: "60%", top: "76%", size: 9, delay: "1.1s", duration: "3.2s" },
      { left: "32%", top: "24%", size: 8, delay: "1.4s", duration: "2.7s" },
      { left: "70%", top: "34%", size: 12, delay: "0.55s", duration: "2.35s" },
    ],
    [],
  );

  useEffect(() => {
    if (!open) {
      playedCelebrationRef.current = false;
      return;
    }

    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion && !playedCelebrationRef.current) {
      playedCelebrationRef.current = true;
      playCelebrationSound();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let cancelled = false;
    const particles: FireworkParticle[] = [];
    const palette = [nextTheme.fireworkA, nextTheme.fireworkB, nextTheme.fireworkC, "#ffffff", "#ffd76a"];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * dpr));
      canvas.height = Math.max(1, Math.floor(bounds.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnBurst = (x: number, y: number, power = 1) => {
      const count = 54;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        const speed = (3.2 + Math.random() * 5.2) * power;
        particles.push({
          x,
          y,
          dx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.1,
          dy: Math.sin(angle) * speed + (Math.random() - 0.5) * 1.1,
          life: 1,
          radius: 2.6 + Math.random() * 3.8,
          trail: 10 + Math.random() * 18,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
    };

    const scheduleBursts = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      window.setTimeout(() => !cancelled && spawnBurst(width * 0.14, height * 0.16, 1.35), 120);
      window.setTimeout(() => !cancelled && spawnBurst(width * 0.86, height * 0.15, 1.4), 260);
      window.setTimeout(() => !cancelled && spawnBurst(width * 0.24, height * 0.3, 1.1), 520);
      window.setTimeout(() => !cancelled && spawnBurst(width * 0.76, height * 0.28, 1.15), 660);
      window.setTimeout(() => !cancelled && spawnBurst(width * 0.5, height * 0.12, 0.95), 900);
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dy += 0.024;
        particle.dx *= 0.994;
        particle.life -= 0.012;

        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.globalAlpha = Math.max(0, particle.life);
        context.shadowBlur = 18;
        context.shadowColor = particle.color;
        context.strokeStyle = particle.color;
        context.lineWidth = Math.max(1, particle.radius * 0.34);
        context.beginPath();
        context.moveTo(particle.x - particle.dx * particle.trail * 0.24, particle.y - particle.dy * particle.trail * 0.24);
        context.lineTo(particle.x, particle.y);
        context.stroke();
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      animationFrame = requestAnimationFrame(render);
    };

    resize();
    scheduleBursts();
    render();
    window.addEventListener("resize", resize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [nextTheme.fireworkA, nextTheme.fireworkB, nextTheme.fireworkC, open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="tier-upgrade-overlay fixed inset-0 z-[120] bg-[rgba(7,5,18,0.84)] backdrop-blur-[18px]" />
        <DialogPrimitive.Content
          className="tier-upgrade-dialog fixed left-1/2 top-1/2 z-[121] w-[min(calc(100vw-1.5rem),26rem)] max-w-[26rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[20px] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-[min(calc(100vw-3rem),30rem)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[30rem] sm:rounded-[22px] lg:w-[min(calc(100vw-6rem),34rem)] lg:max-h-[min(calc(100dvh-4rem),42rem)] lg:max-w-[34rem] 2xl:max-h-[44rem]"
        >
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full rounded-[20px] mix-blend-screen opacity-95 sm:rounded-[22px]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden rounded-[20px] sm:rounded-[22px]">
            <div className="tier-upgrade-top-glow absolute inset-x-[10%] top-[7%] h-[2px]" />
            <div className="tier-upgrade-side-glow absolute left-[8%] top-[14%] h-[62%] w-[1px]" />
            <div className="tier-upgrade-side-glow absolute right-[8%] top-[14%] h-[62%] w-[1px]" />
            <div className="tier-upgrade-bloom tier-upgrade-bloom-left absolute left-[2%] top-[2%] h-40 w-40 rounded-full" />
            <div className="tier-upgrade-bloom tier-upgrade-bloom-right absolute right-[1%] top-[1%] h-44 w-44 rounded-full" />
            <div className="tier-upgrade-bloom tier-upgrade-bloom-lower absolute right-[4%] top-[30%] h-32 w-32 rounded-full" />
            <div className="tier-upgrade-firework-left absolute left-[-2%] top-[-2%] h-52 w-52 rounded-full opacity-90" />
            <div className="tier-upgrade-firework-right absolute right-[-2%] top-[-4%] h-56 w-56 rounded-full opacity-95" />
            <div className="tier-upgrade-firework-bottom absolute bottom-[12%] right-[3%] h-40 w-40 rounded-full opacity-80" />
            <div className="tier-upgrade-flash tier-upgrade-flash-left absolute left-[4%] top-[10%] h-28 w-28 rounded-full" />
            <div className="tier-upgrade-flash tier-upgrade-flash-right absolute right-[6%] top-[12%] h-32 w-32 rounded-full" />
            <div className="tier-upgrade-flash tier-upgrade-flash-bottom absolute bottom-[16%] left-[18%] h-24 w-24 rounded-full" />
            {sparkleSpecs.map((sparkle, index) => (
              <span
                key={`twinkle-${index}`}
                className="tier-upgrade-twinkle absolute block"
                style={{
                  left: sparkle.left,
                  top: sparkle.top,
                  width: `${sparkle.size}px`,
                  height: `${sparkle.size}px`,
                  animationDelay: sparkle.delay,
                  animationDuration: sparkle.duration,
                }}
              />
            ))}
            {Array.from({ length: 24 }).map((_, index) => (
              <span
                key={`confetti-${index}`}
                className="tier-upgrade-confetti absolute top-[-10%] block h-3 w-2 rounded-full"
                style={{
                  left: `${4 + (index * 4) % 92}%`,
                  animationDelay: `${0.45 + index * 0.04}s`,
                  background: confettiPalette[index % confettiPalette.length],
                  transform: `rotate(${index * 18}deg)`,
                }}
              />
            ))}
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={`spark-${index}`}
                className="tier-upgrade-spark absolute block rounded-full"
                style={{
                  left: `${6 + (index * 5) % 88}%`,
                  top: `${10 + (index * 7) % 70}%`,
                  width: `${4 + (index % 3)}px`,
                  height: `${4 + (index % 3)}px`,
                  animationDelay: `${index * 0.18}s`,
                }}
              />
            ))}
          </div>

          <div
            className="relative z-[4] overflow-hidden rounded-[20px] border border-white/15 bg-[radial-gradient(circle_at_top,rgba(152,88,255,0.2),transparent_30%),linear-gradient(180deg,rgba(42,11,88,0.9),rgba(18,8,49,0.92))] px-3.5 pb-3.5 pt-7 shadow-[0_34px_80px_-45px_rgba(0,0,0,0.68)] sm:rounded-[22px] sm:px-4.5 sm:pb-4 sm:pt-8 lg:px-5"
          >
            <div className="tier-upgrade-border-glow absolute inset-0 rounded-[20px] sm:rounded-[22px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,240,190,0.85),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,212,120,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(69,212,255,0.16),transparent_22%)]" />

            <DialogPrimitive.Close className="absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            <div className="relative z-10">
              <div className="mx-auto mb-2 flex w-fit justify-center">
                <div className="tier-upgrade-badge-wrap relative flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-20 sm:w-20">
                  <div className="tier-upgrade-badge-rays absolute inset-[8%] rounded-full" style={{ background: nextTheme.rays }} />
                  <div className="tier-upgrade-badge-halo absolute inset-[14%] rounded-full blur-2xl" style={{ background: nextTheme.glow }} />
                  <div className="tier-upgrade-badge-orbit absolute inset-[10%] rounded-full border border-white/20" />
                  <div
                    className="relative z-[5] flex h-12 w-12 items-center justify-center rounded-[16px] border sm:h-14 sm:w-14 sm:rounded-[18px]"
                    style={{
                      background: nextTheme.badgeSurface,
                      borderColor: nextTheme.border,
                      boxShadow: `0 0 40px ${nextTheme.shadow}, 0 0 90px rgba(255,216,129,0.22)`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.38),transparent_35%,rgba(0,0,0,0.1))] sm:rounded-[18px]" />
                    {createElement(TierIcon, { className: "relative z-10 h-6 w-6 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.45)] sm:h-7 sm:w-7" })}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="tier-upgrade-space-label flex items-center justify-center gap-2 text-[11px] font-black text-[#f8d78c]">
                  <Sparkles className="h-4 w-4" />
                  <span>Tier Upgraded</span>
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="tier-upgrade-gold-text mt-1 text-[1.5rem] font-black tracking-tight drop-shadow-[0_0_20px_rgba(255,215,136,0.48)] sm:text-[1.9rem]">
                  Congratulations!
                </h2>
                <p className="mt-0.5 text-xs font-medium text-white/85 sm:text-sm">
                  You&apos;ve reached a new membership tier
                </p>
              </div>

              <div className="tier-upgrade-aurelian-card mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 rounded-[18px] p-1.5 sm:grid-cols-[1fr_auto_1.15fr] sm:gap-2 sm:rounded-[18px] sm:p-2">
                <TierStatusPanel
                  label="From"
                  tier={oldTier ?? "BRONZE"}
                  icon={OldTierIcon}
                  theme={previousTheme}
                  dimmed
                />

                <div className="tier-upgrade-arrow-wrap relative mx-auto flex w-fit items-center justify-center px-0 py-1 sm:gap-1 sm:px-1 sm:py-2">
                  <ChevronRight className="tier-upgrade-arrow h-4 w-4 text-[#c987ff] sm:h-5 sm:w-5" />
                  <ChevronRight className="tier-upgrade-arrow hidden h-5 w-5 text-[#d9a6ff] sm:block" style={{ animationDelay: "0.12s" }} />
                  <ChevronRight className="tier-upgrade-arrow hidden h-5 w-5 text-[#ffe08c] sm:block" style={{ animationDelay: "0.24s" }} />
                </div>

                <TierStatusPanel
                  label="To"
                  tier={newTier}
                  icon={TierIcon}
                  theme={nextTheme}
                  highlight
                />
              </div>

              <div className="mt-3 hidden gap-2 2xl:grid 2xl:grid-cols-3">
                {benefitCards.map((card, index) => (
                  <div
                    key={card.title}
                    className="tier-upgrade-aurelian-card tier-upgrade-benefit-card rounded-[16px] px-3 py-2 text-left"
                    style={{ animationDelay: `${0.52 + index * 0.14}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#ffd87d]">
                        {createElement(card.icon, { className: "h-4 w-4" })}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white sm:text-sm">{card.title}</div>
                        <div
                          className={cn("mt-0.5 text-xs sm:text-sm", card.title === "Bonus Points" ? "font-black" : "font-medium")}
                          style={{
                            color: card.title === "Bonus Points" ? "#ffd87d" : "rgba(255,255,255,0.96)",
                          }}
                        >
                          {card.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 hidden text-center 2xl:block">
                <div className="text-[1.45rem] italic tracking-tight text-[#ffd996] drop-shadow-[0_0_18px_rgba(255,217,150,0.35)]">
                  Keep shining!
                </div>
                <p className="mt-0.5 text-sm font-medium text-white/80">
                  Thank you for being an amazing member.
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-center">
                <Button
                  type="button"
                  onClick={onViewTier}
                  className="tier-upgrade-primary-btn relative h-9 w-full overflow-hidden rounded-xl border border-white/20 bg-transparent px-3 text-xs font-bold text-white shadow-[0_18px_40px_-24px_rgba(144,88,255,0.85)] sm:w-auto sm:px-5 sm:text-sm"
                >
                  <span className="absolute inset-0 opacity-90" style={{ background: nextTheme.button }} />
                  <span className="tier-upgrade-btn-shimmer absolute inset-y-0 left-[-32%] w-[30%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />
                  <span className="relative z-10">View My Tier</span>
                </Button>

                <Button
                  type="button"
                  onClick={onClose}
                  className="tier-upgrade-secondary-btn relative h-9 w-full overflow-hidden rounded-xl border border-[#ffd67a]/30 bg-[linear-gradient(180deg,#ffd978,#ffb938)] px-3 text-xs font-black text-[#4e2b00] shadow-[0_18px_40px_-24px_rgba(255,188,61,0.8)] hover:brightness-105 sm:w-auto sm:px-5 sm:text-sm"
                >
                  <span className="tier-upgrade-btn-shimmer absolute inset-y-0 left-[-32%] w-[30%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />
                  <span className="relative z-10">Awesome!</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function TierStatusPanel({
  label,
  tier,
  icon,
  theme,
  dimmed = false,
  highlight = false,
}: {
  label: string;
  tier: string;
  icon: ComponentType<{ className?: string }>;
  theme: ReturnType<typeof getTierCelebrationTheme>;
  dimmed?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "tier-upgrade-aurelian-card relative rounded-[14px] px-1.5 py-1.5 text-center sm:rounded-[16px] sm:px-2.5 sm:py-2",
        dimmed ? "opacity-70" : "",
        highlight ? "tier-upgrade-tier-highlight scale-[1.02] shadow-[0_0_40px_rgba(84,218,255,0.25)]" : "",
      )}
    >
      <div className="tier-upgrade-space-label text-[9px] font-black text-white/45 sm:text-[10px]">{label}</div>
      <div className="mt-1 flex justify-center">
        <div
          className={cn("flex h-9 w-9 items-center justify-center rounded-[12px] border sm:h-10 sm:w-10 sm:rounded-[14px]", highlight ? "tier-upgrade-tier-badge" : "")}
          style={{
            background: theme.badgeSurface,
            borderColor: theme.border,
          }}
        >
          {createElement(icon, { className: "h-[18px] w-[18px] text-white sm:h-5 sm:w-5" })}
        </div>
      </div>
      <div className={cn("tier-upgrade-space-label mt-1 text-[9px] font-semibold sm:text-[10px]", dimmed ? "text-white/45" : "text-white/65")}>Tier</div>
      <div className={cn("mt-0.5 truncate text-xs font-black uppercase tracking-tight sm:text-base", highlight ? "text-[#63d6ff]" : "text-white")}>{formatTierName(tier)}</div>
    </div>
  );
}

function getTierCelebrationTheme(tier?: TierCode | null) {
  switch ((tier ?? "BRONZE").toUpperCase()) {
    case "SILVER":
      return {
        icon: ShieldCheck,
        button: "linear-gradient(135deg,#8da2c5,#d9e5ff,#8ea3c6)",
        badgeSurface: "linear-gradient(180deg,#bfcbe1,#7a89a8)",
        glow: "radial-gradient(circle, rgba(219,231,255,0.58), transparent 65%)",
        rays: "conic-gradient(from 0deg, transparent 0deg, rgba(235,242,255,0.42) 42deg, transparent 86deg, rgba(194,216,255,0.32) 140deg, transparent 200deg, rgba(255,255,255,0.32) 260deg, transparent 320deg)",
        border: "rgba(221,232,255,0.52)",
        shadow: "rgba(184,208,255,0.55)",
        fireworkA: "#dceaff",
        fireworkB: "#a6bbff",
        fireworkC: "#f8fdff",
      };
    case "GOLD":
      return {
        icon: Coins,
        button: "linear-gradient(135deg,#9f4d0f,#f4ca5e,#e99c28)",
        badgeSurface: "linear-gradient(180deg,#f7ca4b,#be7d12)",
        glow: "radial-gradient(circle, rgba(255,215,104,0.58), transparent 65%)",
        rays: "conic-gradient(from 0deg, transparent 0deg, rgba(255,218,123,0.5) 42deg, transparent 86deg, rgba(255,188,61,0.32) 140deg, transparent 200deg, rgba(255,240,190,0.35) 260deg, transparent 320deg)",
        border: "rgba(255,226,146,0.55)",
        shadow: "rgba(255,191,67,0.58)",
        fireworkA: "#ffd76a",
        fireworkB: "#ffb83d",
        fireworkC: "#fff0c7",
      };
    case "PLATINUM":
      return {
        icon: Crown,
        button: "linear-gradient(135deg,#67d9ff,#8b7cff,#c6b6ff)",
        badgeSurface: "linear-gradient(180deg,#86ecff,#8e70ff,#7452d9)",
        glow: "radial-gradient(circle, rgba(125,236,255,0.58), transparent 65%)",
        rays: "conic-gradient(from 0deg, transparent 0deg, rgba(123,237,255,0.48) 42deg, transparent 86deg, rgba(174,146,255,0.34) 140deg, transparent 200deg, rgba(244,236,255,0.33) 260deg, transparent 320deg)",
        border: "rgba(197,235,255,0.52)",
        shadow: "rgba(120,203,255,0.62)",
        fireworkA: "#7de7ff",
        fireworkB: "#a996ff",
        fireworkC: "#f4eeff",
      };
    case "DIAMOND":
      return {
        icon: Gem,
        button: "linear-gradient(135deg,#2f78ff,#54d6ff,#7e59ff)",
        badgeSurface: "linear-gradient(180deg,#75e2ff,#2b84ff,#593bff)",
        glow: "radial-gradient(circle, rgba(90,224,255,0.62), transparent 65%)",
        rays: "conic-gradient(from 0deg, transparent 0deg, rgba(94,226,255,0.56) 42deg, transparent 86deg, rgba(82,122,255,0.38) 140deg, transparent 200deg, rgba(255,216,129,0.24) 260deg, transparent 320deg)",
        border: "rgba(156,235,255,0.58)",
        shadow: "rgba(74,206,255,0.68)",
        fireworkA: "#5ee2ff",
        fireworkB: "#5a7aff",
        fireworkC: "#ffd881",
      };
    case "BRONZE":
    default:
      return {
        icon: Medal,
        button: "linear-gradient(135deg,#8d4f1f,#c9853f,#f3c98b)",
        badgeSurface: "linear-gradient(180deg,#d69959,#976031)",
        glow: "radial-gradient(circle, rgba(255,193,116,0.48), transparent 65%)",
        rays: "conic-gradient(from 0deg, transparent 0deg, rgba(255,210,151,0.48) 42deg, transparent 86deg, rgba(203,129,63,0.34) 140deg, transparent 200deg, rgba(255,244,223,0.3) 260deg, transparent 320deg)",
        border: "rgba(244,208,160,0.48)",
        shadow: "rgba(205,133,63,0.58)",
        fireworkA: "#f3c98b",
        fireworkB: "#c9853f",
        fireworkC: "#fff2db",
      };
  }
}

type FireworkParticle = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  radius: number;
  trail: number;
  color: string;
};

function playCelebrationSound() {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const audioContext = new AudioContextCtor();
    const startAt = audioContext.currentTime + 0.02;

    for (let clapIndex = 0; clapIndex < 5; clapIndex += 1) {
      const clapTime = startAt + clapIndex * 0.12;
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.08, audioContext.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) {
        channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
      }

      const source = audioContext.createBufferSource();
      source.buffer = noiseBuffer;

      const bandpass = audioContext.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1400 + clapIndex * 120;
      bandpass.Q.value = 0.8;

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, clapTime);
      gain.gain.exponentialRampToValueAtTime(0.22, clapTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, clapTime + 0.09);

      source.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(audioContext.destination);
      source.start(clapTime);
      source.stop(clapTime + 0.1);
    }

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, noteIndex) => {
      const noteTime = startAt + 0.08 + noteIndex * 0.11;
      const oscillator = audioContext.createOscillator();
      oscillator.type = noteIndex < 2 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, noteTime);

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.07, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(noteTime);
      oscillator.stop(noteTime + 0.3);
    });

    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 1800);
  } catch {
    // noop
  }
}

function getTierUpgradeBonus(tier?: TierCode | null) {
  switch ((tier ?? "").toUpperCase()) {
    case "SILVER":
      return 500;
    case "GOLD":
      return 1500;
    case "PLATINUM":
      return 3000;
    case "DIAMOND":
      return 5000;
    default:
      return 250;
  }
}

function formatTierName(tier?: string | null) {
  return (tier ?? "Member").replaceAll("_", " ");
}

const confettiPalette = [
  "#ffb946",
  "#8a6dff",
  "#54d6ff",
  "#ffd97a",
  "#ff8dd8",
  "#6be6b8",
];
