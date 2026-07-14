"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Car,
  Clock3,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  PartyPopper,
  ChevronRight,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useCustomerBookings, useActiveCustomerCombos } from "@/features/bookings/hooks/use-bookings";
import { cn } from "@/shared/lib/utils";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import type { BookingListItem } from "@/entities/bookings";

// ── Status timeline config ─────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: "PENDING",     labelVi: "Chờ xác nhận",  labelEn: "Pending",      icon: Clock3 },
  { key: "CONFIRMED",   labelVi: "Đã xác nhận",   labelEn: "Confirmed",    icon: ClipboardCheck },
  { key: "CHECKED_IN",  labelVi: "Đã nhận xe",    labelEn: "Checked In",   icon: Car },
  { key: "IN_PROGRESS", labelVi: "Đang rửa",      labelEn: "In Progress",  icon: Droplets },
  { key: "COMPLETED",   labelVi: "Hoàn thành",    labelEn: "Completed",    icon: PartyPopper },
] as const;

const STATUS_ORDER = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"]);
const DONE_STATUSES   = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

function getStepIndex(status: string) {
  return STATUS_ORDER.indexOf(status.toUpperCase());
}

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(bookingDate: string, bookingTime: string) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(`${bookingDate}T${bookingTime}:00`).getTime();
    const tick = () => setDiff(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bookingDate, bookingTime]);
  return diff;
}

function CountdownBadge({ bookingDate, bookingTime, language }: { bookingDate: string; bookingTime: string; language: "vi" | "en" }) {
  const diff = useCountdown(bookingDate, bookingTime);
  if (diff === null) return null;
  if (diff <= 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {translate(language, "Đã đến giờ", "Now")}
    </span>
  );
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0
    ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
    : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">
      <Clock3 className="h-3 w-3" />
      {translate(language, "Còn", "In")} {label}
    </span>
  );
}

// ── Booking Timeline strip ─────────────────────────────────────────────────────
function BookingTimelineStrip({ status, washStatus, language }: { status: string; washStatus: string | null; language: "vi" | "en" }) {
  const effectiveStatus = washStatus ?? status;
  const currentIdx = getStepIndex(effectiveStatus);
  return (
    <div className="flex items-center justify-between gap-1 pt-3 mt-3 border-t border-slate-100">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone   = idx < currentIdx;
        const isActive = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
              isDone   ? "border-emerald-500 bg-emerald-500 text-white" :
              isActive ? "border-sky-500 bg-sky-500 text-white animate-pulse" :
                         "border-slate-200 bg-white text-slate-300"
            )}>
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <span className={cn(
              "text-[9px] font-bold leading-tight",
              isDone ? "text-emerald-600" : isActive ? "text-sky-700" : "text-slate-300"
            )}>
              {language === "vi" ? step.labelVi : step.labelEn}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  PENDING:     "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED:   "bg-sky-50 text-sky-700 border-sky-200",
  CHECKED_IN:  "bg-violet-50 text-violet-700 border-violet-200",
  IN_PROGRESS: "bg-orange-50 text-orange-700 border-orange-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:   "bg-slate-100 text-slate-500 border-slate-200",
  NO_SHOW:     "bg-rose-50 text-rose-600 border-rose-200",
};

const STATUS_LABEL: Record<string, { vi: string; en: string }> = {
  PENDING:     { vi: "Chờ xác nhận", en: "Pending" },
  CONFIRMED:   { vi: "Đã xác nhận",  en: "Confirmed" },
  CHECKED_IN:  { vi: "Đã nhận xe",   en: "Checked In" },
  IN_PROGRESS: { vi: "Đang rửa",     en: "In Progress" },
  COMPLETED:   { vi: "Hoàn thành",   en: "Completed" },
  CANCELLED:   { vi: "Đã huỷ",       en: "Cancelled" },
  NO_SHOW:     { vi: "Vắng mặt",     en: "No Show" },
};

function StatusBadge({ status, language }: { status: string; language: "vi" | "en" }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED;
  const label = STATUS_LABEL[status]?.[language] ?? status;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold", style)}>
      {label}
    </span>
  );
}

// ── Active booking card ────────────────────────────────────────────────────────
function ActiveBookingCard({ booking, language }: { booking: BookingListItem; language: "vi" | "en" }) {
  const t = (vi: string, en: string) => translate(language, vi, en);
  return (
    <Link href={`/customer/bookings/${booking.bookingId}`}>
      <Card className="cursor-pointer border-sky-200/80 bg-gradient-to-br from-sky-50/60 to-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        <CardContent className="p-4 space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={booking.status} language={language} />
                <CountdownBadge
                  bookingDate={booking.bookingDate}
                  bookingTime={booking.bookingTime}
                  language={language}
                />
              </div>
              <p className="text-sm font-black text-slate-900 truncate mt-1">{booking.packageName ?? t("Combo", "Combo")}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" />{booking.vehiclePlate}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />{booking.bookingDate} · {booking.bookingTime}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-black text-slate-900">{formatBookingCurrency(booking.finalAmount)}</p>
              <ChevronRight className="h-4 w-4 text-slate-400 ml-auto mt-1" />
            </div>
          </div>
          <BookingTimelineStrip status={booking.status} washStatus={booking.washStatus ?? null} language={language} />
        </CardContent>
      </Card>
    </Link>
  );
}

// ── History booking row ────────────────────────────────────────────────────────
function HistoryBookingRow({ booking, language }: { booking: BookingListItem; language: "vi" | "en" }) {
  const t = (vi: string, en: string) => translate(language, vi, en);
  return (
    <Link href={`/customer/bookings/${booking.bookingId}`}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} language={language} />
            <span className="text-xs text-slate-500">{booking.bookingDate} · {booking.bookingTime}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{booking.packageName ?? t("Combo", "Combo")}</p>
          <p className="text-xs text-slate-400">{booking.vehiclePlate}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-900">{formatBookingCurrency(booking.finalAmount)}</p>
          <ChevronRight className="h-4 w-4 text-slate-300 ml-auto mt-0.5" />
        </div>
      </div>
    </Link>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function CustomerBookingListPage() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const bookingsQuery = useCustomerBookings({ limit: 50 });
  const combosQuery   = useActiveCustomerCombos();

  const { activeBookings, historyBookings } = useMemo(() => {
    const items = bookingsQuery.data?.items ?? [];
    return {
      activeBookings:  items.filter((b) => ACTIVE_STATUSES.has(b.status)),
      historyBookings: items.filter((b) => DONE_STATUSES.has(b.status)),
    };
  }, [bookingsQuery.data]);

  const ownedCombos = combosQuery.data ?? [];

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#f8fbff,#fff)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">

        {/* ── Active bookings ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">{t("Đang diễn ra", "Active bookings")}</h2>
              <p className="text-xs text-slate-500">{t("Theo dõi tiến trình rửa xe", "Track your wash progress")}</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs" onClick={() => bookingsQuery.refetch()}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />{t("Làm mới", "Refresh")}
            </Button>
          </div>

          {bookingsQuery.isPending ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
              {t("Không có lịch đặt đang diễn ra.", "No active bookings.")}
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map(b => <ActiveBookingCard key={b.bookingId} booking={b} language={language} />)}
            </div>
          )}
        </section>

        {/* ── Active combos ── */}
        {ownedCombos.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {t("Combo đang sở hữu", "Active combos")}
              </h2>
              <p className="text-xs text-slate-500">{t("Các gói combo bạn đã mua và còn hiệu lực", "Purchased combo packages still valid")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ownedCombos.map(combo => (
                <div key={combo.customerComboId} className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/60 to-white p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">{combo.comboName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t("Còn lại", "Remaining")}: <span className="font-bold text-violet-700">{combo.remainingUsages}</span>/{combo.totalUsages} {t("lượt", "uses")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700 bg-violet-50 rounded-full">
                      {t("Đang dùng", "Active")}
                    </Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                      style={{ width: `${(combo.remainingUsages / combo.totalUsages) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {t("Hết hạn", "Expires")}: {new Date(combo.expiresAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── History ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">{t("Lịch sử đặt lịch", "Booking history")}</h2>
              <p className="text-xs text-slate-500">{t("Các đơn đã hoàn thành, huỷ hoặc vắng mặt", "Completed, cancelled or no-show bookings")}</p>
            </div>
          </div>

          {bookingsQuery.isPending ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : bookingsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {getDisplayErrorMessage(bookingsQuery.error)}
            </div>
          ) : historyBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
              {t("Chưa có lịch sử đặt lịch.", "No booking history yet.")}
            </div>
          ) : (
            <div className="space-y-2">
              {historyBookings.map(b => <HistoryBookingRow key={b.bookingId} booking={b} language={language} />)}
            </div>
          )}
        </section>

        <div className="flex justify-center">
          <Button asChild className="rounded-full px-8">
            <Link href="/customer/bookings/new">{t("Đặt lịch mới", "New booking")}</Link>
          </Button>
        </div>

      </div>
    </div>
  );
}
