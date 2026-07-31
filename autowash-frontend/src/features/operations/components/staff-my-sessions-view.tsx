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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/ui/sheet";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  completeStaffSession,
  getStaffTodaySessions,
  startStaffSession,
} from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { StaffTodayServiceItem, StaffTodaySessionItem } from "@/entities/operations";
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

      {/* ── Session Detail Sheet ── */}
      <Sheet open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent side="right" className="w-full max-w-3xl overflow-y-auto border-slate-200 bg-slate-50 p-0 sm:max-w-3xl">
          {detailItem ? <SessionDetailSheet item={detailItem} /> : null}
        </SheetContent>
      </Sheet>

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
    <div
      role="button"
      tabIndex={0}
      className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md"
      onClick={() => onViewDetails(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewDetails(item);
        }
      }}
    >
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
          <div className="flex h-10 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-sm font-bold text-cyan-700">
            View details
          </div>
          <Button
            className="h-10 rounded-md bg-cyan-700 text-sm font-bold text-white hover:bg-cyan-800"
            disabled={isPending || !item.sessionId}
            onClick={(event) => {
              event.stopPropagation();
              onComplete();
            }}
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

function SessionDetailSheet({ item }: { item: StaffTodaySessionItem }) {
  const rawStatus = item.sessionStatus ?? item.bookingStatus ?? "PENDING";
  const statusCfg = SESSION_STATUS_MAP[rawStatus] ?? SESSION_STATUS_MAP.PENDING;
  const primaryItems = (item.services ?? []).filter((service) => service.itemType === "PACKAGE" || service.itemType === "COMBO");
  const includedServices = (item.services ?? []).filter((service) => service.itemType === "ADDON");
  const totalDuration = item.estimatedDurationMinutes ?? includedServices.reduce((sum, service) => sum + (service.durationMinutes || 0), 0);

  const steps: { label: string; time?: string | null }[] = [
    { label: "Check-in", time: item.checkedInAt },
    { label: "Start",    time: item.startedAt },
    { label: "Done",     time: item.completedAt },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <SheetHeader className="border-b border-slate-200 bg-white px-6 py-5 text-left">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Car className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-2xl font-black tracking-tight text-slate-950">{item.vehiclePlate}</SheetTitle>
            <SheetDescription className="mt-1 text-sm font-semibold text-slate-500">
              {item.customerName} · Booking {item.bookingTime}
            </SheetDescription>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", statusCfg.dotColor === "text-cyan-600" ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-slate-100 text-slate-700")}>
                <span className={cn("h-2 w-2 rounded-full", statusCfg.dotBg)} />
                {statusCfg.label}
              </span>
              {item.elapsedMinutes != null ? (
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {item.elapsedMinutes} min elapsed
                </span>
              ) : null}
              {item.bayCode ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  Bay {item.bayCode}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-5 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Service Breakdown</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">What staff needs to do</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Show full package/combo contents instead of only the package name.
            </p>

            <div className="mt-5 space-y-4">
              {primaryItems.length > 0 ? primaryItems.map((service) => (
                <PrimaryServiceCard key={service.id} service={service} />
              )) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  {item.serviceName ?? "Wash service"}
                </div>
              )}

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Included Services</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      Staff should complete all services below for this booking.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    {includedServices.length} service{includedServices.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {includedServices.length > 0 ? includedServices.map((service, index) => (
                    <IncludedServiceRow key={service.id} service={service} index={index} />
                  )) : (
                    <p className="text-sm font-semibold text-slate-500">No detailed service items were returned for this booking.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Booking Snapshot</p>
              <div className="mt-4 grid gap-3">
                <DetailInfo icon={User} label="Customer" value={item.customerName} />
                <DetailInfo icon={Phone} label="Phone" value={item.customerPhone ?? "Not available"} />
                <DetailInfo icon={CheckCircle2} label="Primary package / combo" value={item.serviceName ?? "Wash service"} />
                <DetailInfo icon={Droplets} label="Estimated duration" value={totalDuration ? `${totalDuration} min` : "Not available"} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Timeline</p>
              <div className="mt-4 space-y-4">
                {steps.map((step) => {
                  const done = Boolean(step.time);
                  return (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-500 text-white" : "border border-slate-200 bg-slate-50 text-slate-300")}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{step.label}</p>
                        <p className="text-sm font-semibold text-slate-500">{formatTimePopup(step.time)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Notes</p>
              <div className="mt-4 space-y-3">
                <NoteBlock
                  tone="rose"
                  title="Manager note"
                  value={item.managerNote || "No manager note."}
                />
                <NoteBlock
                  tone="amber"
                  title="Customer note"
                  value={item.customerNote || "No customer note."}
                />
              </div>
            </div>
          </div>
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

function formatCurrency(value?: number | null) {
  return value != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
    : "--";
}

function PrimaryServiceCard({ service }: { service: StaffTodayServiceItem }) {
  const label = service.itemType === "COMBO" ? "Combo" : "Package";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-base font-black text-slate-950">{service.snapshotName}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">
          x{service.quantity}
        </span>
      </div>
    </div>
  );
}

function IncludedServiceRow({ service, index }: { service: StaffTodayServiceItem; index: number }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Step {index + 1}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{service.snapshotName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-slate-500">Qty</p>
          <p className="text-sm font-black text-slate-900">x{service.quantity}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {service.durationMinutes} min
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {formatCurrency(service.subtotal)}
        </span>
      </div>
    </div>
  );
}

function DetailInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function NoteBlock({
  tone,
  title,
  value,
}: {
  tone: "rose" | "amber";
  title: string;
  value: string;
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
    amber: "border-amber-200 bg-amber-50/70 text-amber-700",
  } as const;

  return (
    <div className={cn("rounded-xl border px-4 py-3", tones[tone])}>
      <div className="flex items-start gap-3">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
        </div>
      </div>
    </div>
  );
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
