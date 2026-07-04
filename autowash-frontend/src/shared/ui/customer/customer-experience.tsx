"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarCheck, Car, Clock3, Gift, Gauge, Sparkles, Star, Trophy, WandSparkles, Zap } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";
import { translate } from "@/shared/store/language.store";

type Language = "vi" | "en";
type Tier = "BRONZE" | "MEMBER" | "SILVER" | "GOLD" | "DIAMOND" | "PLATINUM";
type LiveSessionStatus = "PENDING" | "SCHEDULED" | "QUEUED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED";
type LiveSessionStep = Exclude<LiveSessionStatus, "QUEUED">;

type TierProgress = {
  currentTier: Tier;
  nextTier: Tier;
  currentPoints: number;
  requiredPoints: number;
};

const tierStyles: Record<Tier, { label: string; ring: string; gradient: string; glow: string; accent: string }> = {
  BRONZE: {
    label: "Bronze",
    ring: "ring-amber-700",
    gradient: "from-amber-700 via-orange-600 to-amber-600",
    glow: "shadow-orange-700/40",
    accent: "text-amber-800",
  },
  MEMBER: {
    label: "Bronze",
    ring: "ring-amber-700",
    gradient: "from-amber-700 via-orange-600 to-amber-600",
    glow: "shadow-orange-700/40",
    accent: "text-amber-800",
  },
  SILVER: {
    label: "Silver",
    ring: "ring-slate-300",
    gradient: "from-slate-500 via-slate-300 to-white",
    glow: "shadow-slate-300/40",
    accent: "text-slate-600",
  },
  GOLD: {
    label: "Gold",
    ring: "ring-yellow-300",
    gradient: "from-yellow-500 via-amber-300 to-yellow-100",
    glow: "shadow-yellow-300/50",
    accent: "text-amber-600",
  },
  DIAMOND: {
    label: "Diamond",
    ring: "ring-cyan-300",
    gradient: "from-cyan-400 via-blue-500 to-fuchsia-400",
    glow: "shadow-cyan-300/50",
    accent: "text-cyan-600",
  },
  PLATINUM: {
    label: "Platinum",
    ring: "ring-zinc-300",
    gradient: "from-zinc-400 via-gray-300 to-zinc-200",
    glow: "shadow-zinc-300/50",
    accent: "text-zinc-600",
  },
};

type TierMetalStyle = {
  label: string;
  surface: string;
  progress: string;
  text: string;
  softText: string;
  border: string;
  ring: string;
  glow: string;
  glowVar: string;
};

const tierMetalStyles: Record<Tier, TierMetalStyle> = {
  BRONZE: {
    label: "Bronze",
    surface: "bg-[linear-gradient(135deg,#f7eadb_0%,#d5aa7b_42%,#a9784c_76%,#fff2df_100%)]",
    progress: "bg-[linear-gradient(90deg,#8f6139_0%,#c3905b_42%,#e4bf8d_62%,#9b6b42_100%)]",
    text: "text-[#432817]",
    softText: "text-[#704927]",
    border: "border-[#c28a56]/70",
    ring: "ring-[#e8bb86]/65",
    glow: "shadow-[0_18px_48px_rgba(163,107,66,0.32)]",
    glowVar: "rgba(194,138,86,0.72)",
  },
  MEMBER: {
    label: "Bronze",
    surface: "bg-[linear-gradient(135deg,#f7eadb_0%,#d5aa7b_42%,#a9784c_76%,#fff2df_100%)]",
    progress: "bg-[linear-gradient(90deg,#8f6139_0%,#c3905b_42%,#e4bf8d_62%,#9b6b42_100%)]",
    text: "text-[#432817]",
    softText: "text-[#704927]",
    border: "border-[#c28a56]/70",
    ring: "ring-[#e8bb86]/65",
    glow: "shadow-[0_18px_48px_rgba(163,107,66,0.32)]",
    glowVar: "rgba(194,138,86,0.72)",
  },
  SILVER: {
    label: "Silver",
    surface: "bg-[linear-gradient(135deg,#f8fbff_0%,#dfe8f2_38%,#b5c1cf_68%,#ffffff_100%)]",
    progress: "bg-[linear-gradient(90deg,#6f7d8d_0%,#dce5ee_40%,#ffffff_58%,#8997a7_100%)]",
    text: "text-[#273445]",
    softText: "text-[#607086]",
    border: "border-[#c7d4e3]/80",
    ring: "ring-[#dbe6f2]/80",
    glow: "shadow-[0_18px_48px_rgba(113,128,150,0.24)]",
    glowVar: "rgba(148,163,184,0.7)",
  },
  GOLD: {
    label: "Gold",
    surface: "bg-[linear-gradient(135deg,#fff9df_0%,#f3d47a_38%,#c99718_68%,#fff2b8_100%)]",
    progress: "bg-[linear-gradient(90deg,#9a6507_0%,#dca91a_40%,#fff0a8_60%,#b77a05_100%)]",
    text: "text-[#3f2a04]",
    softText: "text-[#7c5608]",
    border: "border-[#e5bf45]/70",
    ring: "ring-[#f7d96d]/65",
    glow: "shadow-[0_18px_52px_rgba(216,164,20,0.28)]",
    glowVar: "rgba(216,164,20,0.68)",
  },
  DIAMOND: {
    label: "Diamond",
    surface: "bg-[linear-gradient(135deg,#eefcff_0%,#a9f3ff_36%,#7db9ff_68%,#ffffff_100%)]",
    progress: "bg-[linear-gradient(90deg,#0891b2_0%,#67e8f9_38%,#ffffff_58%,#60a5fa_100%)]",
    text: "text-[#07314a]",
    softText: "text-[#0e7490]",
    border: "border-[#8eeaff]/70",
    ring: "ring-[#a5f3fc]/70",
    glow: "shadow-[0_18px_52px_rgba(34,211,238,0.24)]",
    glowVar: "rgba(34,211,238,0.65)",
  },
  PLATINUM: {
    label: "Platinum",
    surface: "bg-[linear-gradient(135deg,#fbfbff_0%,#e6ebf3_36%,#d9c7f6_68%,#ffffff_100%)]",
    progress: "bg-[linear-gradient(90deg,#737373_0%,#e9eef5_38%,#fff7fb_58%,#d8b4fe_100%)]",
    text: "text-[#31283d]",
    softText: "text-[#6d5d80]",
    border: "border-[#d8b4fe]/70",
    ring: "ring-[#ede9fe]/80",
    glow: "shadow-[0_18px_52px_rgba(168,85,247,0.20)]",
    glowVar: "rgba(168,85,247,0.48)",
  },
};

const liveSessionSteps: LiveSessionStep[] = ["PENDING", "SCHEDULED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

const liveSessionOffsets: Record<LiveSessionStep, number> = {
  PENDING: -10,
  SCHEDULED: 0,
  CHECKED_IN: 5,
  IN_PROGRESS: 10,
  COMPLETED: 45,
};

const liveSessionLabels: Record<Language, Record<LiveSessionStatus, string>> = {
  vi: {
    PENDING: "Chờ xác nhận",
    SCHEDULED: "Đã đặt lịch",
    QUEUED: "Đang xếp hàng",
    CHECKED_IN: "Đã check-in",
    IN_PROGRESS: "Đang rửa",
    COMPLETED: "Hoàn thành",
  },
  en: {
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
    QUEUED: "Queued",
    CHECKED_IN: "Checked in",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
  },
};

function parseDateTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function normalizeLiveStatus(status: LiveSessionStatus): LiveSessionStep {
  return status === "QUEUED" ? "SCHEDULED" : status;
}

function formatLiveTime(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(milliseconds: number, language: Language) {
  if (milliseconds <= 0) {
    return translate(language, "Đang cập nhật", "Updating");
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getCustomerTierStyle(tier?: string | null) {
  const normalized = (tier ?? "MEMBER").toUpperCase() as Tier;
  return tierStyles[normalized] ?? tierStyles.MEMBER;
}

export function TierBadge({ tier }: { tier?: string | null }) {
  const style = getCustomerTierStyle(tier);
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-white shadow-md",
      `bg-gradient-to-r ${style.gradient}`,
      style.glow
    )}>
      {style.label}
    </span>
  );
}

export function getCustomerTierMetalStyle(tier?: string | null) {
  const normalized = (tier ?? "MEMBER").toUpperCase() as Tier;
  return tierMetalStyles[normalized] ?? tierMetalStyles.MEMBER;
}

export function CustomerAvatarBadge({
  name,
  tier,
  compact = false,
}: {
  name?: string | null;
  tier?: string | null;
  compact?: boolean;
}) {
  const style = getCustomerTierStyle(tier);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="flex items-center gap-2">
      <div className={cn("grid h-10 w-10 place-items-center rounded-full bg-white font-black text-[#102A43] shadow-sm ring-2", style.ring)}>
        {initial}
      </div>
      {!compact ? (
        <span className={cn("rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg", style.gradient, style.glow)}>
          {style.label}
        </span>
      ) : null}
    </div>
  );
}

export function TierProgressBar({
  progress,
  language,
}: {
  progress: TierProgress;
  language: Language;
}) {
  const style = getCustomerTierStyle(progress.currentTier);
  const requiredPoints = Math.max(progress.requiredPoints, 1);
  const percentage = Math.min(100, Math.round((progress.currentPoints / requiredPoints) * 100));
  const remainingPoints = Math.max(requiredPoints - progress.currentPoints, 0);
  const milestones = [0, 25, 50, 75, 100];

  return (
    <div className="rounded-2xl border border-[#D9EAF7] bg-white p-4 shadow-[0_14px_34px_rgba(16,42,67,0.06)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#627D98]">
            {translate(language, "Tiến độ hạng thành viên", "Tier progress")}
          </p>
          <p className="mt-1 text-sm font-bold text-[#102A43] dark:text-slate-100">
            {translate(language, `Còn ${remainingPoints} điểm nữa để lên hạng ${progress.nextTier}`, `${remainingPoints} more points to reach ${progress.nextTier}`)}
          </p>
        </div>
        <div className={cn("rounded-full bg-gradient-to-r px-3 py-1 text-xs font-black text-white shadow-lg", style.gradient, style.glow)}>
          {percentage}%
        </div>
      </div>

      <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-[#EAF6FD] dark:bg-slate-800">
        <div
          className={cn("relative h-full rounded-full bg-gradient-to-r transition-all duration-700", style.gradient)}
          style={{ width: `${percentage}%` }}
        >
          <span className="absolute inset-0 animate-[customerShimmer_1.8s_linear_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)]" />
        </div>
        {milestones.map((dot) => (
          <span
            key={dot}
            className={cn("absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-white", dot <= percentage ? "bg-[#06D6A0]" : "bg-[#BFD7EA]")}
            style={{ left: `calc(${dot}% - 4px)` }}
          />
        ))}
      </div>

      <div className="mt-3 flex justify-between text-[11px] font-bold text-[#627D98]">
        <span>{progress.currentPoints.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} pts</span>
        <span>{requiredPoints.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} pts</span>
      </div>
    </div>
  );
}

export function MembershipFloatingCard({
  name,
  tier,
  currentPoints,
  requiredPoints,
  language,
}: {
  name?: string | null;
  tier?: string | null;
  currentPoints: number;
  requiredPoints: number;
  language: Language;
}) {
  const style = getCustomerTierStyle(tier);
  const currentTier = ((tier ?? "MEMBER").toUpperCase() as Tier) || "MEMBER";
  const nextTier: Tier = currentTier === "GOLD" || currentTier === "DIAMOND" || currentTier === "PLATINUM" ? "DIAMOND" : currentTier === "SILVER" ? "GOLD" : "SILVER";

  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-[1px] shadow-2xl", style.gradient, style.glow)}>
      <div className="rounded-3xl bg-white/92 p-5 backdrop-blur dark:bg-slate-950/90">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-[#627D98]">
              {translate(language, "Thẻ thành viên", "Membership card")}
            </p>
            <h3 className="mt-1 text-xl font-black text-[#102A43] dark:text-white">{name || "Aura Member"}</h3>
          </div>
          <CustomerAvatarBadge name={name} tier={tier} compact />
        </div>
        <div className="mt-4">
          <TierProgressBar
            language={language}
            progress={{
              currentTier,
              nextTier,
              currentPoints,
              requiredPoints,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function FeatureSection({ language }: { language: Language }) {
  const features = [
    { icon: CalendarCheck, vi: "Đặt lịch thông minh", en: "Smart Booking", color: "bg-[#00B8D9]/12 text-[#00B8D9]" },
    { icon: Gauge, vi: "Theo dõi rửa xe realtime", en: "Real-time Wash Progress", color: "bg-[#2F80ED]/12 text-[#2F80ED]" },
    { icon: Gift, vi: "Tích điểm thành viên", en: "Loyalty Rewards", color: "bg-[#FFD166]/35 text-[#9A6A00]" },
    { icon: WandSparkles, vi: "Detailing cao cấp", en: "Premium Detailing", color: "bg-[#FF8A3D]/15 text-[#C65616]" },
    { icon: Zap, vi: "Check-in nhanh", en: "Fast Check-in", color: "bg-[#06D6A0]/15 text-[#058B69]" },
    { icon: BellRing, vi: "Ưu đãi độc quyền", en: "Exclusive Promotions", color: "bg-rose-100 text-rose-600" },
  ];

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-[#00B8D9]">
          {translate(language, "Tính năng nổi bật", "Featured tools")}
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#102A43] dark:text-white">
          {translate(language, "Mọi thứ cho một lần rửa xe nhẹ nhàng hơn", "Everything for a smoother wash day")}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.en}
              className="group rounded-2xl border border-[#D9EAF7] bg-white p-5 shadow-[0_12px_28px_rgba(16,42,67,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(0,184,217,0.16)] dark:border-slate-700 dark:bg-slate-900"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={cn("grid h-11 w-11 place-items-center rounded-2xl transition group-hover:scale-110", feature.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-black text-[#102A43] dark:text-white">{translate(language, feature.vi, feature.en)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BookingLiveSessionCard({
  language,
  bookingCode,
  serviceName,
  status = "SCHEDULED",
  imageUrl = "/images/gallery1.jpg",
  scheduledAt,
  estimatedDurationMinutes = 45,
  timestamps,
}: {
  language: Language;
  bookingCode?: string;
  serviceName?: string | null;
  status?: LiveSessionStatus;
  imageUrl?: string;
  scheduledAt?: string | null;
  estimatedDurationMinutes?: number;
  timestamps?: Partial<Record<LiveSessionStep, string | null>>;
}) {
  const [now, setNow] = useState(() => new Date());
  const visualStatus = normalizeLiveStatus(status);
  const activeIndex = Math.max(0, liveSessionSteps.indexOf(visualStatus));
  const percent = Math.round(((activeIndex + 1) / liveSessionSteps.length) * 100);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const milestones = useMemo(() => {
    const scheduledDate =
      parseDateTime(scheduledAt) ??
      parseDateTime(timestamps?.SCHEDULED) ??
      parseDateTime(timestamps?.CHECKED_IN) ??
      parseDateTime(timestamps?.IN_PROGRESS) ??
      parseDateTime(timestamps?.COMPLETED) ??
      new Date();

    return liveSessionSteps.map((step) => {
      const actualDate = parseDateTime(timestamps?.[step]);
      const offset = step === "COMPLETED" ? estimatedDurationMinutes : liveSessionOffsets[step];

      return {
        step,
        date: actualDate ?? addMinutes(scheduledDate, offset),
        isActual: Boolean(actualDate),
      };
    });
  }, [estimatedDurationMinutes, scheduledAt, timestamps]);

  const nextMilestone =
    milestones.find((milestone, index) => index > activeIndex && milestone.date.getTime() >= now.getTime()) ??
    milestones[Math.min(activeIndex + 1, milestones.length - 1)] ??
    milestones[milestones.length - 1];
  const countdownMs = status === "COMPLETED" ? 0 : Math.max((nextMilestone?.date.getTime() ?? now.getTime()) - now.getTime(), 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#BDEEFF] bg-white shadow-[0_18px_45px_rgba(47,128,237,0.12)] dark:border-slate-700 dark:bg-slate-900">
      <div className="grid gap-4 p-4 sm:grid-cols-[9rem_1fr]">
        <img src={imageUrl} alt={serviceName ?? "Booking"} className="h-32 w-full rounded-2xl object-cover sm:h-full" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-[#2F80ED]">
                {translate(language, "Phiên đang hoạt động", "Live session")}
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-[#102A43] dark:text-white">{serviceName || translate(language, "Lịch rửa xe của bạn", "Your wash booking")}</h3>
              <p className="text-xs font-bold text-[#627D98]">{bookingCode || "AURA-LIVE"}</p>
            </div>
            <span className="rounded-full bg-[#06D6A0]/15 px-3 py-1 text-xs font-black text-[#058B69]">
              {liveSessionLabels[language][status]}
            </span>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-[#D9EAF7] bg-[#F5FBFF] p-3 sm:grid-cols-[1fr_auto] dark:border-slate-700 dark:bg-slate-800/70">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#627D98]">
                {translate(language, "Mốc kế tiếp", "Next milestone")}
              </p>
              <p className="mt-1 text-sm font-black text-[#102A43] dark:text-white">
                {status === "COMPLETED"
                  ? translate(language, "Phiên rửa đã hoàn thành", "Wash session completed")
                  : `${liveSessionLabels[language][nextMilestone?.step ?? "COMPLETED"]} · ${formatLiveTime(nextMilestone?.date ?? now, language)}`}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-2 text-right shadow-sm dark:bg-slate-900">
              <p className="flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-wide text-[#627D98]">
                <Clock3 className="h-3 w-3" />
                {translate(language, "Đếm ngược", "Countdown")}
              </p>
              <p className="mt-1 font-mono text-xl font-black text-[#2F80ED]">
                {status === "COMPLETED" ? "00:00" : formatCountdown(countdownMs, language)}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EAF6FD] dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-[#00B8D9] via-[#2F80ED] to-[#06D6A0] transition-all duration-700" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
            {milestones.map(({ step, date, isActual }, index) => (
              <div key={step} className={cn("rounded-2xl border px-3 py-2 text-xs font-bold", index <= activeIndex ? "border-[#06D6A0]/40 bg-[#06D6A0]/10 text-[#047857]" : "border-[#D9EAF7] text-[#627D98] dark:border-slate-700")}>
                <span className={cn("mr-1 inline-block h-2 w-2 rounded-full", index === activeIndex ? "animate-pulse bg-[#2F80ED]" : index < activeIndex ? "bg-[#06D6A0]" : "bg-[#BFD7EA]")} />
                {liveSessionLabels[language][step]}
                <span className="mt-1 block text-[10px] font-black opacity-70">
                  {isActual ? translate(language, "Thực tế", "Actual") : translate(language, "Ước tính", "Est.")} {formatLiveTime(date, language)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FloatingBookingButton({ language }: { language: Language }) {
  return (
    <Button asChild className="fixed bottom-6 right-6 z-40 h-12 rounded-full bg-[#00B8D9] px-5 font-black text-white shadow-[0_18px_38px_rgba(0,184,217,0.35)] hover:bg-[#009FBA]">
      <Link href="/customer/booking">
        <Car className="mr-2 h-4 w-4" />
        {translate(language, "Đặt lịch", "Book Now")}
      </Link>
    </Button>
  );
}

export function CustomerExperienceStyles() {
  return (
    <style jsx global>{`
      @keyframes customerShimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  );
}
