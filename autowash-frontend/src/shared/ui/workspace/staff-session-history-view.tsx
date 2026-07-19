"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Filter, RefreshCcw, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { DatePickerButton } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { cn } from "@/shared/lib/utils";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueue, OperationsQueueSession, WashSessionStatus } from "@/entities/operations";

const ALL_PACKAGE_VALUE = "__all_packages__";
const ALL_STAFF_VALUE = "__all_staff__";

type PeriodFilterMode = "all" | "day" | "month" | "year";

export function StaffSessionHistoryView() {
  const getErrorMessage = useErrorMessage();
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState(ALL_PACKAGE_VALUE);
  const [staffFilter, setStaffFilter] = useState(ALL_STAFF_VALUE);
  const [periodMode, setPeriodMode] = useState<PeriodFilterMode>("all");
  const [dayFilter, setDayFilter] = useState(getTodayDateInputValue());
  const [monthFilter, setMonthFilter] = useState(getCurrentMonthInputValue());
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");

  const queueQuery = useQuery({
    queryKey: ["staff-session-history", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 60_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const completedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "COMPLETED")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [sessions],
  );
  const packageOptions = useMemo(() => buildPackageOptions(completedSessions), [completedSessions]);
  const staffOptions = useMemo(() => buildStaffOptions(completedSessions), [completedSessions]);
  const filteredSessions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return completedSessions.filter((session) => {
      const primaryItemName = session.servicePackage ?? session.packageId ?? "";
      const staffName = session.assignedStaffName ?? "Chưa phân công";
      const matchesPackage = packageFilter === ALL_PACKAGE_VALUE || primaryItemName === packageFilter;
      const matchesStaff = staffFilter === ALL_STAFF_VALUE || staffName === staffFilter;
      const matchesPeriod = matchesPeriodFilter(session, periodMode, {
        day: dayFilter,
        month: monthFilter,
        year: yearFilter,
      });
      const matchesHour = matchesCompletedHourRange(session, startHour, endHour);
      const matchesSearch =
        !needle ||
        session.bookingId.toLowerCase().includes(needle) ||
        session.customerName.toLowerCase().includes(needle) ||
        session.vehiclePlate.toLowerCase().includes(needle) ||
        session.customerPhone.toLowerCase().includes(needle) ||
        primaryItemName.toLowerCase().includes(needle);

      return matchesPackage && matchesStaff && matchesPeriod && matchesHour && matchesSearch;
    });
  }, [completedSessions, dayFilter, endHour, monthFilter, packageFilter, periodMode, search, staffFilter, startHour, yearFilter]);

  const totals = useMemo(() => buildHistoryTotals(filteredSessions), [filteredSessions]);
  const periodLabel = getPeriodLabel(periodMode, {
    day: dayFilter,
    month: monthFilter,
    year: yearFilter,
  });

  return (
    <WorkspacePage className="space-y-6 rounded-xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_34%),linear-gradient(180deg,rgba(248,253,255,0.96),rgba(236,254,255,0.58))]">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/staff/my-sessions">
            <ArrowLeft className="h-4 w-4" />
            Back to Today's Work
          </Link>
        </Button>
        <Button variant="outline" onClick={() => queueQuery.refetch()}>
          <RefreshCcw className={cn("h-4 w-4", queueQuery.isFetching && "animate-spin")} />
          Làm mới
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Phiên đã hoàn thành" value={filteredSessions.length} detail={periodLabel} />
        <SummaryCard
          label="Thời lượng trung bình"
          value={totals.averageDuration}
          detail="Tính từ lúc bắt đầu đến khi hoàn thành"
        />
        <SummaryCard label="Điểm đã cộng" value={totals.pointsAwarded} detail="Tổng điểm từ danh sách đang hiển thị" />
      </section>

      <Card className="overflow-hidden rounded-xl border-cyan-100/80 bg-gradient-to-br from-white via-cyan-50/45 to-slate-50/35 shadow-[0_18px_42px_rgba(6,182,212,0.09)] backdrop-blur">

        <div className="border-b border-cyan-100/70 bg-card/70 px-5 py-4 dark:border-cyan-900/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-foreground">Bộ lọc lịch sử</h2>
              <p className="text-sm text-muted-foreground">Tra cứu phiên hoàn thành theo thời gian, gói rửa, nhân viên hoặc thông tin xe.</p>
            </div>
            <Button
              variant="ghost"
              className="h-8 rounded-md px-3 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"

              onClick={() => {
                setSearch("");
                setPackageFilter(ALL_PACKAGE_VALUE);
                setStaffFilter(ALL_STAFF_VALUE);
                setPeriodMode("all");
                setStartHour("");
                setEndHour("");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Xóa bộ lọc
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-b border-cyan-100/70 p-4 lg:p-5">
          <div className="grid items-end gap-3 xl:grid-cols-[minmax(320px,1fr)_170px_190px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã đặt lịch, biển số, khách hàng, SĐT..."
                className="h-11 rounded-lg border-border/60 bg-background/85 pl-10 text-sm font-semibold shadow-sm focus:border-cyan-200 focus:bg-background"
              />
            </div>

            <HistorySelect
              value={periodMode}
              onChange={(value) => setPeriodMode(value as PeriodFilterMode)}
              options={[
                ["all", "Tất cả thời gian"],
                ["day", "Theo ngày"],
                ["month", "Theo tháng"],
                ["year", "Theo năm"],
              ]}
            />

            <HistorySelect
              value={packageFilter}
              onChange={setPackageFilter}
              options={[[ALL_PACKAGE_VALUE, "Tất cả gói rửa"], ...packageOptions.map((option) => [option, option] as const)]}
            />

            <HistorySelect
              value={staffFilter}
              onChange={setStaffFilter}
              options={[[ALL_STAFF_VALUE, "Tất cả nhân viên"], ...staffOptions.map((option) => [option, option] as const)]}
            />
          </div>

          <div className="grid items-end gap-3 rounded-lg border border-border/50 bg-muted/40 p-3 shadow-inner lg:grid-cols-[minmax(220px,1fr)_112px_112px_minmax(0,1fr)]">
            <div>
              {periodMode === "day" ? (
                <DatePickerButton value={dayFilter} onChange={setDayFilter} label="Chọn ngày" buttonClassName="h-10 w-full justify-start rounded-lg border-border/60 bg-background shadow-sm" />
              ) : null}
              {periodMode === "month" ? (
                <Input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 rounded-lg border-border/60 bg-background shadow-sm" />
              ) : null}
              {periodMode === "year" ? (
                <Input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  className="h-10 rounded-lg border-border/60 bg-background shadow-sm"
                />
              ) : null}
              {periodMode === "all" ? (
                <div className="flex h-10 items-center rounded-lg border border-border/50 bg-muted/50 px-3 text-sm font-semibold text-muted-foreground shadow-sm">
                  Không giới hạn ngày
                </div>
              ) : null}
            </div>

            <Input type="time" value={startHour} onChange={(event) => setStartHour(event.target.value)} className="h-10 rounded-lg border-border/60 bg-background text-sm shadow-sm" aria-label="Từ giờ" />
            <Input type="time" value={endHour} onChange={(event) => setEndHour(event.target.value)} className="h-10 rounded-lg border-border/60 bg-background text-sm shadow-sm" aria-label="Đến giờ" />
            <p className="hidden text-xs font-semibold leading-5 text-muted-foreground lg:block">
              Lọc theo thời điểm hoàn thành của phiên rửa.
            </p>
          </div>
        </div>

        <div className="p-4">
          {queueQuery.isError ? (
            <WorkspaceEmptyState
              title="Không thể tải lịch sử phiên rửa"
              description={getErrorMessage(queueQuery.error as unknown as ApiErrorResponse)}
            />
          ) : queueQuery.isPending ? (
            <div className="h-72 animate-pulse rounded-lg bg-muted" />
          ) : filteredSessions.length === 0 ? (
            <WorkspaceEmptyState title="Không tìm thấy phiên đã hoàn thành" description="Thử từ khóa hoặc bộ lọc khác." />
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <HistorySessionRow key={session.sessionId} session={session} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </WorkspacePage>
  );
}


function HistorySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <Card className="rounded-xl border-border/50 bg-gradient-to-br from-card via-card to-cyan-50/25 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(6,182,212,0.10)] dark:to-cyan-950/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 shadow-[0_0_24px_rgba(6,182,212,0.16)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const STATUS_CONFIG: Record<WashSessionStatus, { label: string; className: string }> = {
  COMPLETED:  { label: "Hoàn thành", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANCELLED:  { label: "Đã huỷ",     className: "border-rose-200 bg-rose-50 text-rose-600" },
  IN_PROGRESS:{ label: "Đang rửa",   className: "border-blue-200 bg-blue-50 text-blue-700" },
  CHECKED_IN: { label: "Đã check-in",className: "border-amber-200 bg-amber-50 text-amber-700" },
  QUEUED:     { label: "Chờ xử lý",  className: "border-purple-200 bg-purple-50 text-purple-700" },
  PENDING:    { label: "Chờ xác nhận",className: "border-slate-200 bg-slate-50 text-slate-600" },
};

function SessionStatusBadge({ status }: { status: WashSessionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function HistorySessionRow({ session }: { session: OperationsQueueSession }) {
  const duration = getDurationLabel(session);
  const primaryItemName = session.servicePackage ?? session.packageId ?? "Gói rửa";

  return (
    <div className="grid gap-3 rounded-lg border border-cyan-100/80 bg-gradient-to-r from-white via-white to-cyan-50/55 px-4 py-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg xl:grid-cols-[minmax(0,1.3fr)_1fr_1.25fr] xl:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-black">{session.vehiclePlate}</p>
          <SessionStatusBadge status={session.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {session.customerName} · {session.customerPhone}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
          {session.bookingDate} {session.bookingTime}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info label="Gói rửa" value={primaryItemName} />
        <Info label="Nhân viên" value={session.assignedStaffName ?? "Chưa phân công"} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info label="Hoàn thành" value={formatDateTime(session.completedAt)} />
        <Info label="Thời lượng" value={duration} />
        <Info label="Chi phí" value={formatMoney(session.feeAmount, session.feeCurrency)} />
        <Info label="Điểm" value={String(session.awardedLoyaltyPoints ?? 0)} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-3 py-2 shadow-inner ring-1 ring-border/50">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="truncate font-semibold text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function flattenSessions(queue?: OperationsQueue) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function buildPackageOptions(sessions: OperationsQueueSession[]) {
  return Array.from(
    new Set(sessions.map((session) => session.servicePackage ?? session.packageId).filter(Boolean) as string[]),
  ).sort();
}

function buildStaffOptions(sessions: OperationsQueueSession[]) {
  return Array.from(new Set(sessions.map((session) => session.assignedStaffName ?? "Chưa phân công"))).sort();
}

function buildHistoryTotals(sessions: OperationsQueueSession[]) {
  const durations = sessions
    .map((session) => getDurationMinutes(session))
    .filter((duration): duration is number => typeof duration === "number" && duration > 0);
  const averageDuration =
    durations.length > 0
      ? `${Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length)} phút`
      : "--";
  const pointsAwarded = sessions.reduce((total, session) => total + (session.awardedLoyaltyPoints ?? 0), 0);

  return { averageDuration, pointsAwarded };
}

function matchesPeriodFilter(
  session: OperationsQueueSession,
  mode: PeriodFilterMode,
  filter: { day: string; month: string; year: string },
) {
  if (mode === "all") return true;
  const completedAt = session.completedAt ? new Date(session.completedAt) : null;
  if (!completedAt || Number.isNaN(completedAt.getTime())) return false;

  const sessionDay = toDateInputValue(completedAt);
  const sessionMonth = sessionDay.slice(0, 7);
  const sessionYear = String(completedAt.getFullYear());

  if (mode === "day") return Boolean(filter.day) && sessionDay === filter.day;
  if (mode === "month") return Boolean(filter.month) && sessionMonth === filter.month;
  return Boolean(filter.year) && sessionYear === filter.year;
}

function matchesCompletedHourRange(session: OperationsQueueSession, startHour: string, endHour: string) {
  if (!startHour && !endHour) return true;
  if (!session.completedAt) return false;
  const completedAt = new Date(session.completedAt);
  if (Number.isNaN(completedAt.getTime())) return false;
  const minutes = completedAt.getHours() * 60 + completedAt.getMinutes();
  const start = startHour ? readMinutes(startHour) : 0;
  const end = endHour ? readMinutes(endHour) : 24 * 60 - 1;
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}

function getPeriodLabel(mode: PeriodFilterMode, filter: { day: string; month: string; year: string }) {
  if (mode === "day") return filter.day ? `Hoàn thành ngày ${filter.day}` : "Chọn ngày";
  if (mode === "month") return filter.month ? `Hoàn thành trong ${filter.month}` : "Chọn tháng";
  if (mode === "year") return filter.year ? `Hoàn thành trong ${filter.year}` : "Chọn năm";
  return "Tất cả thời gian";
}

function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

function getCurrentMonthInputValue() {
  return toDateInputValue(new Date()).slice(0, 7);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDurationMinutes(session: OperationsQueueSession) {
  if (!session.startedAt || !session.completedAt) return null;
  const duration = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return Math.round(duration / 60000);
}

function getDurationLabel(session: OperationsQueueSession) {
  const minutes = getDurationMinutes(session);
  return minutes ? `${minutes} phút` : "--";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (amount == null) return "Chưa có";
  if (!currency || currency === "VND") return `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;
  return `${amount.toLocaleString()} ${currency}`;
}

function readMinutes(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
}
