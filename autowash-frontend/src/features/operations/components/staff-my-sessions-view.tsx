"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Droplets,
  Loader2,
  MessageSquareText,
  Phone,
  Banknote,
  Star,
  Users,
  User,
  X,
} from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  completeStaffSession,
  getStaffTodaySessions,
  startStaffSession,
} from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { StaffTodaySessionItem } from "@/entities/operations";
import { cn } from "@/shared/lib/utils";

// ─── Status meta ─────────────────────────────────────────────────────────────

const sessionStatusMeta = {
  PENDING:    { label: "Pending",     dot: "bg-slate-400",   badge: "border-slate-200 bg-slate-50 text-slate-600" },
  QUEUED:     { label: "Queued",      dot: "bg-slate-500",   badge: "border-slate-200 bg-slate-100 text-slate-700" },
  CHECKED_IN: { label: "Checked In",  dot: "bg-orange-400",  badge: "border-orange-200 bg-orange-50 text-orange-700" },
  IN_PROGRESS:{ label: "In Progress", dot: "bg-cyan-500",    badge: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  COMPLETED:  { label: "Completed",   dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CANCELLED:  { label: "Cancelled",   dot: "bg-red-400",     badge: "border-red-200 bg-red-50 text-red-600" },
} as const;

type SessionStatus = keyof typeof sessionStatusMeta;

function getStatusMeta(
  sessionStatus: string | null | undefined,
  bookingStatus: string | null | undefined,
) {
  if (bookingStatus === "NO_SHOW") {
    return { label: "No-show", dot: "bg-rose-400", badge: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (sessionStatus && sessionStatus in sessionStatusMeta) {
    return sessionStatusMeta[sessionStatus as SessionStatus];
  }
  if (bookingStatus === "CONFIRMED") {
    return { label: "Awaiting", dot: "bg-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-500" };
  }
  if (bookingStatus === "PENDING") {
    return sessionStatusMeta.PENDING;
  }
  return { label: bookingStatus ?? "—", dot: "bg-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-500" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScheduleStatusTone(
  sessionStatus: string | null | undefined,
  bookingStatus: string | null | undefined,
) {
  if (sessionStatus === "COMPLETED") {
    return { label: "Completed", dot: "bg-emerald-600", badge: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  }
  if (sessionStatus === "CHECKED_IN") {
    return { label: "Checked In", dot: "bg-orange-500", badge: "border-orange-100 bg-orange-50 text-orange-700" };
  }
  if (sessionStatus === "IN_PROGRESS") {
    return { label: "In Progress", dot: "bg-cyan-600", badge: "border-cyan-100 bg-cyan-50 text-cyan-700" };
  }
  if (bookingStatus === "CONFIRMED" || sessionStatus === "QUEUED") {
    return { label: "Waiting", dot: "bg-slate-500", badge: "border-slate-200 bg-slate-100 text-slate-600" };
  }
  return getStatusMeta(sessionStatus, bookingStatus);
}

function formatTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Query key ────────────────────────────────────────────────────────────────

const STAFF_TODAY_KEY = ["staff-my-sessions", "today"] as const;


// ─── Main view ────────────────────────────────────────────────────────────────

export function StaffMySessionsView() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [completingSession, setCompletingSession] = useState<StaffTodaySessionItem | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [detailItem, setDetailItem] = useState<StaffTodaySessionItem | null>(null);

  const todayQuery = useQuery({
    queryKey: STAFF_TODAY_KEY,
    queryFn: () => getStaffTodaySessions(today()),
    refetchInterval: 15_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: STAFF_TODAY_KEY });
  };

  const startMutation = useMutation({
    mutationFn: (sessionId: string) => startStaffSession(sessionId),
    onSuccess: () => { invalidate(); notify.success("Wash session started."); },
    onError: (error: ApiErrorResponse) => notify.error(getErrorMessage(error)),
  });

  const completeMutation = useMutation({
    mutationFn: ({ sessionId, note }: { sessionId: string; note?: string }) =>
      completeStaffSession(sessionId, note),
    onSuccess: () => {
      invalidate();
      notify.success("Wash session completed.");
      setCompletingSession(null);
      setStaffNote("");
    },
    onError: (error: ApiErrorResponse) => notify.error(getErrorMessage(error)),
  });

  const data = todayQuery.data;
  const metrics = data?.metrics;
  const isPending = startMutation.isPending || completeMutation.isPending;

  return (
    <WorkspacePage className="space-y-5">
      {/* ── Header ── */}
      {/* ── Metric Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Checked In"
          value={metrics?.checkedInCount ?? 0}
          sub="Ready to start"
          tone="orange"
        />
        <MetricCard
          icon={Droplets}
          label="In Progress"
          value={metrics?.inProgressCount ?? 0}
          tone="cyan"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed Today"
          value={metrics?.completedTodayCount ?? 0}
          sub={
            metrics
              ? `${metrics.completedTodayCount}/${metrics.totalTodayCount} sessions done`
              : undefined
          }
          tone="emerald"
        />
        <MetricCard
          icon={CalendarDays}
          label="Total Today"
          value={metrics?.totalTodayCount ?? 0}
          tone="slate"
        />
      </div>

      {/* ── Loading skeleton ── */}
      {todayQuery.isPending && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
        </div>
      )}

      {/* ── Error ── */}
      {todayQuery.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {getErrorMessage(todayQuery.error as unknown as ApiErrorResponse)}
        </div>
      )}

      {data && (
        <>
          {/* ── Cần xử lý ngay + Đang thực hiện ── */}
          <div className="grid gap-5 xl:grid-cols-2">
            {/* Needs Action */}
            <Card className="space-y-4 rounded-xl border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">Needs Action</h2>
                {data.waitingToStart.length > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700">
                    {data.waitingToStart.length} waiting
                  </span>
                )}
              </div>

              {data.waitingToStart.length === 0 ? (
                <EmptySection icon={Car} message="No vehicles waiting to start." />
              ) : (
                data.waitingToStart.map((item) => (
                  <WaitingCard
                    key={item.sessionId ?? item.bookingId}
                    item={item}
                    onStart={() => item.sessionId && startMutation.mutate(item.sessionId)}
                    isPending={isPending}
                  />
                ))
              )}
            </Card>

            {/* In Progress */}
            <Card className="space-y-4 rounded-xl border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">In Progress</h2>

              {data.inProgress.length === 0 ? (
                <EmptySection icon={Droplets} message="No vehicles currently being washed." />
              ) : (
                data.inProgress.map((item) => (
                  <InProgressCard
                    key={item.sessionId ?? item.bookingId}
                    item={item}
                    onComplete={() => setCompletingSession(item)}
                    onViewDetails={setDetailItem}
                    isPending={isPending}
                  />
                ))
              )}
            </Card>
          </div>

          {/* ── Today's Schedule ── */}
          <Card className="space-y-3 rounded-xl border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-950">Today's Schedule</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">All sessions assigned to you today</p>
            </div>

            {data.todaySchedule.length === 0 ? (
              <EmptySection icon={ClipboardList} message="No sessions scheduled for today." />
            ) : (
              <TodayScheduleTable items={data.todaySchedule} onViewDetails={setDetailItem} />
            )}
          </Card>
        </>
      )}

      {/* ── Session Detail Dialog ── */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg rounded-xl p-0 overflow-hidden">
          {detailItem && <SessionDetailPopup item={detailItem} onClose={() => setDetailItem(null)} />}
        </DialogContent>
      </Dialog>

      {/* ── Complete Confirm Dialog ── */}
      <Dialog
        open={Boolean(completingSession)}
        onOpenChange={(open) => { if (!open) { setCompletingSession(null); setStaffNote(""); } }}
      >
        <DialogContent className="rounded-xl border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950">Confirm Completion</DialogTitle>
            <DialogDescription>
              {completingSession?.vehiclePlate} — {completingSession?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="block text-sm font-bold text-slate-700">
              Staff note (optional)
            </label>
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              placeholder="Add a note before completing (optional)..."
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => { setCompletingSession(null); setStaffNote(""); }}
              disabled={completeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-slate-950 font-black text-white hover:bg-slate-800"
              disabled={completeMutation.isPending}
              onClick={() => {
                if (!completingSession?.sessionId) return;
                completeMutation.mutate({
                  sessionId: completingSession.sessionId,
                  note: staffNote || undefined,
                });
              }}
            >
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

const metricTones = {
  orange:  { icon: "bg-orange-100 text-orange-600", value: "text-slate-950" },
  cyan:    { icon: "bg-cyan-100 text-cyan-600",     value: "text-slate-950" },
  emerald: { icon: "bg-emerald-100 text-emerald-600", value: "text-slate-950" },
  slate:   { icon: "bg-slate-100 text-slate-600",   value: "text-slate-950" },
} as const;

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  tone: keyof typeof metricTones;
}) {
  const t = metricTones[tone];
  return (
    <Card className="rounded-xl border-slate-200/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={cn("text-2xl font-black", t.value)}>{value}</p>
          {sub && <p className="text-xs font-semibold text-slate-500">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// ─── Waiting Card (CHECKED_IN) ───────────────────────────────────────────────

function WaitingCard({
  item,
  onStart,
  isPending,
}: {
  item: StaffTodaySessionItem;
  onStart: () => void;
  isPending: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Car className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black leading-6 tracking-tight text-slate-950">{item.vehiclePlate}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-600">
                {item.customerName}
                {item.customerPhone ? ` · ${item.customerPhone}` : ""}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{item.serviceName ?? "Wash service"}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 divide-x divide-slate-200 text-center">
            <span className="px-3"><span className="block text-xs font-semibold text-slate-500">Booking</span><span className="mt-1 block text-lg font-black leading-none text-slate-950">{item.bookingTime}</span></span>
            <span className="px-3"><span className="block text-xs font-semibold text-slate-500">Check-in</span><span className="mt-1 block text-lg font-black leading-none text-slate-950">{formatTime(item.checkedInAt)}</span></span>
            {item.bayCode && (
              <span className="px-3"><span className="block text-xs font-semibold text-slate-500">Bay</span><span className="mt-1 block text-lg font-black leading-none text-slate-950">{item.bayCode}</span></span>
            )}
          </div>
        </div>

        {/* Service */}
        {item.serviceName && (
          <p className="hidden">{item.serviceName}</p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="min-h-[58px] rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2">
            <p className="text-xs font-black text-orange-600">Customer note</p>
            <p className={cn("mt-1 line-clamp-2 text-sm font-semibold leading-6", item.customerNote ? "text-slate-800" : "text-slate-400")}>
              {item.customerNote || "No customer note."}
            </p>
          </div>
          <div className="min-h-[58px] rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2">
            <p className="text-xs font-black text-rose-600">Manager note</p>
            <p className={cn("mt-1 line-clamp-2 text-sm font-semibold leading-6", item.managerNote ? "text-slate-800" : "text-slate-400")}>
              {item.managerNote || "No manager note."}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="mt-3">
          <Button
            className="h-10 w-full rounded-md bg-slate-950 text-sm font-bold text-white hover:bg-slate-800"
            disabled={isPending || !item.sessionId}
            onClick={onStart}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Wash
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── In-Progress Card (IN_PROGRESS) ──────────────────────────────────────────

function InProgressCard({
  item,
  onComplete,
  onViewDetails,
  isPending,
}: {
  item: StaffTodaySessionItem;
  onComplete: () => void;
  onViewDetails: (item: StaffTodaySessionItem) => void;
  isPending: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Car className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black leading-6 tracking-tight text-slate-950">{item.vehiclePlate}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-600">{item.customerName}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{item.serviceName ?? "Wash service"}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 divide-x divide-slate-200 text-center">
            <span className="px-3">
              <span className="inline-flex rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
              In Progress
              </span>
            </span>
            {item.elapsedMinutes != null && (
              <span className="px-3">
                <span className="block text-xs font-semibold text-slate-500">Elapsed</span>
                <span className="mt-1 block text-lg font-black leading-none text-slate-950">{item.elapsedMinutes} min</span>
              </span>
            )}
            {item.bayCode && (
              <span className="px-3">
                <span className="block text-xs font-semibold text-slate-500">Bay</span>
                <span className="mt-1 block text-lg font-black leading-none text-slate-950">{item.bayCode}</span>
              </span>
            )}
          </div>
        </div>

        {/* Service */}
        {item.serviceName && (
          <p className="hidden">{item.serviceName}</p>
        )}

        <div className="mt-3 min-h-[58px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-black text-slate-700">Manager note</p>
          <p className={cn("mt-1 line-clamp-2 text-sm font-semibold leading-6", item.managerNote ? "text-slate-800" : "text-slate-400")}>
            {item.managerNote || "No manager note."}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {item.sessionId && (
            <Button
              variant="outline"
              className="h-10 rounded-md border-cyan-600 text-sm font-bold text-cyan-700"
              onClick={() => onViewDetails(item)}
            >
              Details
            </Button>
          )}
          <Button
            className="h-10 rounded-md bg-cyan-700 text-sm font-bold text-white hover:bg-cyan-800"
            disabled={isPending || !item.sessionId}
            onClick={onComplete}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Today Schedule Table ─────────────────────────────────────────────────────

function TodayScheduleTable({ items, onViewDetails }: { items: StaffTodaySessionItem[]; onViewDetails: (item: StaffTodaySessionItem) => void }) {
  const sorted = [...items].sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Vehicle / Customer</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Service</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((item) => {
              const meta = getScheduleStatusTone(item.sessionStatus, item.bookingStatus);
              return (
                <tr key={item.sessionId ?? item.bookingId} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-black text-slate-900">{item.bookingTime}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-black tracking-wide text-slate-950">
                        {item.vehiclePlate}
                      </span>
                      <span className="font-semibold text-slate-600">{item.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.serviceName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                        meta.badge,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.sessionId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-cyan-300 bg-cyan-50 px-4 text-xs font-black text-cyan-700 hover:border-cyan-400 hover:bg-cyan-100"
                        onClick={() => onViewDetails(item)}
                      >
                        Details
                      </Button>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Session Detail Popup ─────────────────────────────────────────────────────

const SESSION_STATUS_MAP: Record<string, { label: string; dotBg: string; dotColor: string }> = {
  COMPLETED:   { label: "Completed",   dotBg: "bg-emerald-500", dotColor: "text-emerald-600" },
  CANCELLED:   { label: "Cancelled",   dotBg: "bg-rose-500",    dotColor: "text-rose-600" },
  IN_PROGRESS: { label: "In Progress", dotBg: "bg-cyan-500",    dotColor: "text-cyan-600" },
  CHECKED_IN:  { label: "Checked In",  dotBg: "bg-amber-400",   dotColor: "text-amber-600" },
  QUEUED:      { label: "Queued",      dotBg: "bg-purple-500",  dotColor: "text-purple-600" },
  PENDING:     { label: "Pending",     dotBg: "bg-slate-400",   dotColor: "text-slate-500" },
};

function SessionDetailPopup({
  item,
  onClose,
}: {
  item: StaffTodaySessionItem;
  onClose: () => void;
}) {
  const rawStatus = item.sessionStatus ?? item.bookingStatus ?? "PENDING";
  const statusCfg = SESSION_STATUS_MAP[rawStatus] ?? SESSION_STATUS_MAP.PENDING;

  const steps: { label: string; time?: string | null }[] = [
    { label: "Check-in", time: item.checkedInAt },
    { label: "Start",    time: item.startedAt },
    { label: "Done",     time: item.completedAt },
  ];

  return (
    <div className="flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-6 pt-6 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{item.vehiclePlate}</h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusCfg.dotBg)} />
              <span className={cn("text-base font-bold", statusCfg.dotColor)}>{statusCfg.label}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">{item.bookingTime}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {/* ── Customer & Service (2-col) ── */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.customerName}</span>
              </div>
              {item.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-slate-400" />
                  <span className="text-base font-semibold text-slate-800">{item.customerPhone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Service</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.serviceName ?? "Wash service"}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.customerName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline stepper ── */}
        <div className="px-6 py-5">
          <p className="mb-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</p>
          <div className="relative flex items-start justify-between">
            {/* connecting line */}
            <div className="absolute left-[20px] right-[20px] top-[20px] h-0.5 bg-emerald-200" />
            {steps.map((step, i) => {
              const done = Boolean(step.time);
              return (
                <div key={i} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full shadow-sm",
                    done
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-slate-200 bg-white text-slate-300",
                  )}>
                    {done ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{step.label}</span>
                  <span className="text-xs font-semibold text-slate-700">{formatTimePopup(step.time)}</span>
                </div>
              );
            })}
          </div>
          {item.elapsedMinutes != null && (
            <p className="mt-4 text-right text-sm font-bold text-emerald-600">{item.elapsedMinutes} min</p>
          )}
        </div>

        {/* ── Payment & Rating (2-col) ── */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-bold text-slate-900">See checkout</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-700">Cash</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</p>
            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
              Not rated
            </span>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="px-6 py-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
          {item.customerNote || item.managerNote ? (
            <div className="space-y-1">
              {item.managerNote && (
                <div className="flex items-start gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Manager: {item.managerNote}</p>
                </div>
              )}
              {item.customerNote && (
                <div className="flex items-start gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Customer: {item.customerNote}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-base text-slate-400">No notes recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimePopup(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Empty section ────────────────────────────────────────────────────────────

function EmptySection({ icon: Icon, message }: { icon: typeof Car; message: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
      <Icon className="mb-2 h-6 w-6 text-slate-300" />
      <p className="text-base font-semibold text-slate-400">{message}</p>
    </div>
  );
}
