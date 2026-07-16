"use client";

import Link from "next/link";
import Image from "next/image";
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

import { useTierStyle } from "@/shared/lib/tier-styles";

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

export function TierBadge({ tier }: { tier?: string | null }) {
  const { gradient } = useTierStyle(tier);
  return (
    <span 
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-white shadow-md"
      style={gradient}
    >
      {tier || "MEMBER"}
    </span>
  );
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
  const { gradient, hex } = useTierStyle(tier);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="flex items-center gap-2">
      <div 
        className="grid h-10 w-10 place-items-center rounded-full bg-white font-black text-[#102A43] shadow-sm ring-2"
        style={{ "--tw-ring-color": hex } as React.CSSProperties}
      >
        {initial}
      </div>
      {!compact ? (
        <span 
          className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg"
          style={gradient}
        >
          {tier || "MEMBER"}
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
  const { gradient, hex } = useTierStyle(progress.currentTier);
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
        <div 
          className="rounded-full px-3 py-1 text-xs font-black text-white shadow-lg"
          style={gradient}
        >
          {percentage}%
        </div>
      </div>

      <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-[#EAF6FD] dark:bg-slate-800">
        <div
          className="relative h-full rounded-full transition-all duration-700"
          style={{ ...gradient, width: `${percentage}%` }}
        >
          <span className="absolute inset-0 animate-[customerShimmer_1.8s_linear_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)]" />
        </div>
        {milestones.map((dot) => (
          <span
            key={dot}
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-white"
            style={{ 
              left: `calc(${dot}% - 4px)`,
              backgroundColor: dot <= percentage ? hex : "#BFD7EA"
            }}
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
  const { gradient, hex } = useTierStyle(tier);
  const currentTier = ((tier ?? "MEMBER").toUpperCase() as Tier) || "MEMBER";
  const nextTier: Tier = currentTier === "GOLD" || currentTier === "DIAMOND" || currentTier === "PLATINUM" ? "DIAMOND" : currentTier === "SILVER" ? "GOLD" : "SILVER";

  return (
    <div 
      className="relative overflow-hidden rounded-3xl p-[1px] shadow-2xl"
      style={{ ...gradient, boxShadow: `0 25px 50px -12px ${hex}80` }}
    >
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

type BookingLiveSessionCardProps = {
  language: Language;
  bookingCode?: string;
  serviceName?: string | null;
  status?: LiveSessionStatus;
  imageUrl?: string;
  scheduledAt?: string | null;
  estimatedDurationMinutes?: number;
  timestamps?: Partial<Record<LiveSessionStep, string | null>>;
};

export function BookingLiveSessionCard({
  language,
  bookingCode,
  serviceName,
  status = "SCHEDULED",
  imageUrl = "/images/gallery1.jpg",
  scheduledAt,
  estimatedDurationMinutes = 45,
  timestamps,
}: BookingLiveSessionCardProps) {
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
        <div className="relative h-32 w-full sm:h-full min-h-[8rem] rounded-2xl overflow-hidden">
          <Image
            src={imageUrl}
            alt={serviceName ?? "Booking"}
            fill
            sizes="(max-width: 640px) 100vw, 144px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-[#2F80ED]">
                {translate(language, "Phiên đang hoạt động", "Live session")}
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-[#102A43] dark:text-white">{serviceName || translate(language, "Lịch rửa xe của bạn", "Your wash booking")}</h3>
              <p className="text-xs font-bold text-[#627D98]">{bookingCode ? `#${bookingCode.slice(0, 8).toUpperCase()}` : "AURA-LIVE"}</p>
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

export function FloatingWashSessionBubble(props: BookingLiveSessionCardProps) {
  const {
    language,
    bookingCode,
    serviceName,
    status = "SCHEDULED",
  } = props;
  const [open, setOpen] = useState(false);
  const visualStatus = normalizeLiveStatus(status);
  const activeIndex = Math.max(0, liveSessionSteps.indexOf(visualStatus));
  const percent = Math.round(((activeIndex + 1) / liveSessionSteps.length) * 100);
  const isLive = status === "IN_PROGRESS" || status === "QUEUED" || status === "CHECKED_IN";

  return (
    <div className="fixed bottom-24 right-5 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:right-6">
      {open ? (
        <div className="w-[min(42rem,calc(100vw-2rem))] origin-bottom-right animate-in fade-in slide-in-from-bottom-3 duration-300">
          <BookingLiveSessionCard {...props} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group flex items-center gap-3 rounded-full border border-[#BDEEFF] bg-white/95 px-3 py-2 text-left shadow-[0_18px_42px_rgba(47,128,237,0.20)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(47,128,237,0.26)] dark:border-slate-700 dark:bg-slate-900/95",
          isLive && "ring-4 ring-[#00B8D9]/12",
        )}
        aria-expanded={open}
        aria-label={translate(language, "Mở phiên rửa đang hoạt động", "Open active wash session")}
      >
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00B8D9] to-[#2F80ED] text-white shadow-[0_12px_28px_rgba(0,184,217,0.30)]">
          <Car className="h-5 w-5" />
          {isLive ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#06D6A0] shadow-[0_0_16px_rgba(6,214,160,0.7)]" /> : null}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-48 truncate text-sm font-black text-[#102A43] dark:text-white">
            {serviceName || translate(language, "Theo dõi lịch rửa", "Track wash session")}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs font-bold text-[#627D98]">
            <span>{liveSessionLabels[language][status]}</span>
            <span className="h-1 w-1 rounded-full bg-[#BFD7EA]" />
            <span>{percent}%</span>
            {bookingCode ? <span className="max-w-20 truncate">#{bookingCode.slice(0, 8).toUpperCase()}</span> : null}
          </span>
        </span>
      </button>
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
