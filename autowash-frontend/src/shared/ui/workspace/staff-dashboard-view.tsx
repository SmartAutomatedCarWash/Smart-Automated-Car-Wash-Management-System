"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, Car, CheckCircle2, Clock, RefreshCcw, Target, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { getEligibleSessionBookings, getOperationsQueue, getStaffDashboardSummary } from "@/features/operations/lib/operations-service";
import { cn } from "@/shared/lib/utils";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueue, OperationsQueueSession, WashSessionStatus } from "@/entities/operations";

const statusLabel: Record<WashSessionStatus, string> = {
  PENDING: "Chờ duyệt",
  QUEUED: "Chờ check-in",
  CHECKED_IN: "Đã check-in",
  IN_PROGRESS: "Đang rửa",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

const dashboardStatusTone: Record<WashSessionStatus, { row: string; badge: string; rail: string }> = {
  PENDING: {
    row: "border-amber-200/80 from-amber-50/95 via-white to-white shadow-[0_12px_28px_rgba(245,158,11,0.10)]",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    rail: "bg-amber-400",
  },
  QUEUED: {
    row: "border-cyan-200/80 from-cyan-50/95 via-white to-white shadow-[0_12px_28px_rgba(6,182,212,0.10)]",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
    rail: "bg-cyan-400",
  },
  CHECKED_IN: {
    row: "border-slate-200/80 from-slate-50/95 via-white to-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
    badge: "border-slate-200 bg-slate-50 text-slate-800",
    rail: "bg-slate-400",
  },
  IN_PROGRESS: {
    row: "border-orange-200/80 from-orange-50/95 via-white to-white shadow-[0_12px_28px_rgba(249,115,22,0.10)]",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    rail: "bg-orange-400",
  },
  COMPLETED: {
    row: "border-emerald-200/80 from-emerald-50/95 via-white to-white shadow-[0_12px_28px_rgba(16,185,129,0.10)]",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rail: "bg-emerald-400",
  },
  CANCELLED: {
    row: "border-border/50 from-muted/50 via-card to-card shadow-sm",
    badge: "border-border bg-muted text-muted-foreground",
    rail: "bg-slate-400",
  },
};

export function StaffDashboardView() {
  const queueQuery = useQuery({
    queryKey: ["staff-dashboard", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 30_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["staff-dashboard", "summary"],
    queryFn: getStaffDashboardSummary,
    refetchInterval: 30_000,
  });

  const eligibleQuery = useQuery({
    queryKey: ["staff-dashboard", "eligible-bookings"],
    queryFn: getEligibleSessionBookings,
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const todaySessions = useMemo(() => sessions.filter(isTodaySession), [sessions]);
  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.status === "PENDING" || session.status === "QUEUED"),
    [sessions],
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "CHECKED_IN" || session.status === "IN_PROGRESS"),
    [sessions],
  );
  const nextArrivals = useMemo(
    () =>
      [...sessions]
        .filter((session) => session.status !== "COMPLETED" && session.status !== "CANCELLED")
        .sort((a, b) => `${a.bookingDate} ${a.bookingTime}`.localeCompare(`${b.bookingDate} ${b.bookingTime}`))
        .slice(0, 5),
    [sessions],
  );

  const staffSummary = summaryQuery.data;

  return (
    <WorkspacePage className="space-y-8 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_32%),linear-gradient(180deg,rgba(248,253,255,0.96),rgba(236,254,255,0.58))]">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Phiên hôm nay"
          value={todaySessions.length}
          detail="Các lịch có ngày hẹn trong hôm nay"
          icon={CalendarClock}
          tone="bg-cyan-50 text-cyan-800"
        />
        <DashboardMetric
          label="Cần duyệt"
          value={staffSummary?.pendingBookings ?? pendingSessions.length + (eligibleQuery.data?.length ?? 0)}
          detail="Booking được giao và phiên chưa check-in"
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-700"
        />
        <DashboardMetric
          label="Đang xử lý"
          value={staffSummary?.activeSessions ?? activeSessions.length}
          detail="Đã check-in hoặc đang rửa"
          icon={Wrench}
          tone="bg-slate-100 text-slate-800"
        />
        <DashboardMetric
          label="Doanh số cá nhân"
          value={formatMoney(staffSummary?.completedRevenue ?? 0)}
          detail={`KPI ${staffSummary?.kpiProgressPercent ?? 0}% / ${formatMoney(staffSummary?.kpiTargetRevenue ?? 0)}`}
          icon={Target}
          tone="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <Card className="overflow-hidden rounded-3xl border-cyan-100/80 bg-card/95 shadow-[0_18px_42px_rgba(6,182,212,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-6 py-4">
            <div>
              <h2 className="text-base font-black">Việc cần xử lý</h2>
              <p className="text-sm text-muted-foreground">Tập trung vào booking được giao, phiên chờ check-in và xe đang rửa.</p>
            </div>
            <Button variant="outline" onClick={() => queueQuery.refetch()}>
              <RefreshCcw className={cn("h-4 w-4", queueQuery.isFetching && "animate-spin")} />
              Làm mới
            </Button>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <FocusCard
              title="Booking chờ duyệt"
              value={eligibleQuery.data?.length ?? 0}
              description="Booking đã được phân công, cần nhân viên kiểm tra."
              href="/staff/check-in"
              tone="amber"
            />
            <FocusCard
              title="Phiên chờ check-in"
              value={pendingSessions.length}
              description="Cần kiểm biển số và duyệt vào quy trình."
              href="/staff/check-in"
              tone="rose"
            />
            <FocusCard
              title="Đang vận hành"
              value={activeSessions.length}
              description="Theo dõi và chuyển trạng thái rửa."
              href="/staff/operations"
              tone="cyan"
            />
          </div>
        </Card>

        <Card className="rounded-3xl border-cyan-100/80 bg-gradient-to-br from-cyan-50/80 via-white to-white p-6 shadow-[0_18px_42px_rgba(6,182,212,0.08)] backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-base font-black">
            <Car className="h-5 w-5 text-cyan-800" />
            Lối tắt nhân viên
          </div>
          <div className="space-y-3">
            <Button className="w-full justify-between rounded-2xl" asChild>
              <Link href="/staff/check-in">
                Mở trang check-in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between rounded-2xl" variant="outline" asChild>
              <Link href="/staff/operations">
                Mở bảng vận hành
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between rounded-2xl" variant="outline" asChild>
              <Link href="/staff/sessions/history">
                Xem lịch sử phiên rửa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden rounded-3xl border-cyan-100/80 bg-gradient-to-br from-cyan-50/80 via-white to-slate-50/50 shadow-[0_18px_42px_rgba(6,182,212,0.12)] backdrop-blur">
          <div className="border-b border-cyan-100/80 bg-card/70 px-6 py-4">
            <h2 className="text-base font-black">Lịch sắp đến</h2>
            <p className="text-sm text-muted-foreground">5 phiên gần nhất cần theo dõi trong ca làm.</p>
          </div>
          <div className="space-y-3 p-6">
            {queueQuery.isError ? (
              <WorkspaceEmptyState
                title="Không thể tải dữ liệu vận hành"
                description={getDisplayErrorMessage(queueQuery.error as unknown as ApiErrorResponse)}
              />
            ) : queueQuery.isPending ? (
              <div className="h-48 animate-pulse rounded-3xl bg-muted" />
            ) : nextArrivals.length === 0 ? (
              <WorkspaceEmptyState title="Chưa có lịch sắp đến" description="Hiện không có phiên nào cần theo dõi." />
            ) : (
              nextArrivals.map((session) => <ArrivalRow key={session.sessionId} session={session} />)
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-6 shadow-[0_18px_40px_rgba(245,158,11,0.10)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-950">Nhắc nhở ca làm</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Ưu tiên xử lý các phiên chờ duyệt trước. Khi check-in, hãy kiểm tra đúng biển số xe
                của khách rồi mới chuyển vào vận hành.
              </p>
              {summaryQuery.isError ? (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  Chưa tải được KPI cá nhân: {getDisplayErrorMessage(summaryQuery.error as unknown as ApiErrorResponse)}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </WorkspacePage>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Car;
  tone: string;
}) {
  return (
    <Card className="rounded-3xl border-border/50 bg-gradient-to-br from-card via-card to-cyan-50/30 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(6,182,212,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_0_24px_rgba(6,182,212,0.14)]", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function FocusCard({
  title,
  value,
  description,
  href,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  tone: "amber" | "rose" | "cyan";
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-800",
    rose: "border-rose-200 bg-rose-50/70 text-rose-800",
    cyan: "border-cyan-200 bg-cyan-50/70 text-cyan-900",
  }[tone];

  return (
    <Link href={href} className={cn("rounded-3xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl", toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{title}</p>
        <span className="text-3xl font-black">{value}</span>
      </div>
      <p className="mt-3 text-sm leading-6 opacity-90">{description}</p>
    </Link>
  );
}

function ArrivalRow({ session }: { session: OperationsQueueSession }) {
  const tone = dashboardStatusTone[session.status] ?? dashboardStatusTone.PENDING;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-r px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl", tone.row)}>
      <span className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", tone.rail)} />
      <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{session.bookingId}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {session.customerName} - {session.vehiclePlate} - {session.bookingDate} {session.bookingTime}
          </div>
        </div>
        <Badge variant="outline" className={cn("rounded-full px-3 font-bold", tone.badge)}>
          {statusLabel[session.status]}
        </Badge>
      </div>
    </div>
  );
}

function flattenSessions(queue?: OperationsQueue) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function isTodaySession(session: OperationsQueueSession) {
  return session.bookingDate === toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;
}
