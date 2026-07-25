"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Droplets, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getEligibleSessionBookings, getOperationsQueue, getActiveStaffOptions } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

export function ManagerDashboardView() {
  const getErrorMessage = useErrorMessage();
  const queueQuery = useQuery({
    queryKey: ["manager-operations", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });
  const eligibleQuery = useQuery({
    queryKey: ["manager-operations", "eligible"],
    queryFn: () => getEligibleSessionBookings(),
    refetchInterval: 15_000,
  });
  const staffQuery = useQuery({
    queryKey: ["manager-operations", "staff"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const activeSessions = sessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS"].includes(session.status));
  const delayedSessions = activeSessions.filter(isDelayed);
  const pendingCheckInBookings = (eligibleQuery.data ?? []).filter((booking) => booking.status === "CONFIRMED");

  return (
    <WorkspacePage className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Today at the wash bay</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Operations in one view</h1>
          <p className="mt-1 text-sm text-slate-500">Prioritize vehicles that need check-in and sessions at risk of delays.</p>
        </div>
        <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
          <Link href="/manager/operations">Open operations queue <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Pending check-in" value={pendingCheckInBookings.length} tone="amber" />
        <MetricCard icon={Droplets} label="In service" value={activeSessions.length} tone="cyan" />
        <MetricCard icon={CheckCircle2} label="Completed" value={queueQuery.data?.summary.completed ?? 0} tone="emerald" />
        <MetricCard icon={Users} label="Staff active" value={staffQuery.data?.length ?? 0} tone="slate" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-black text-slate-900">Needs manager action</h2>
            <p className="mt-1 text-sm text-slate-500">Bookings that have not been checked in or sessions running late.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {eligibleQuery.isError || queueQuery.isError ? (
              <div className="p-5"><WorkspaceEmptyState title="Unable to load queue" description={getErrorMessage((eligibleQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse)} /></div>
            ) : eligibleQuery.isPending || queueQuery.isPending ? (
              <div className="m-5 h-36 animate-pulse rounded-2xl bg-slate-100" />
            ) : delayedSessions.length === 0 && pendingCheckInBookings.length === 0 ? (
              <div className="p-8"><WorkspaceEmptyState title="Operations are stable" description="No bookings or sessions need immediate intervention." /></div>
            ) : (
              <>
                {pendingCheckInBookings.slice(0, 3).map((booking) => (
                  <div key={booking.bookingId} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{booking.vehiclePlate}</p>
                      <p className="truncate text-xs text-slate-500">{booking.customerName} · {booking.bookingTime}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Pending check-in</span>
                  </div>
                ))}
                {delayedSessions.slice(0, 3).map((session) => <DelayedRow key={session.sessionId} session={session} />)}
              </>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <h2 className="font-black">Manager role</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Check vehicles in, keep sessions assigned, and prevent wash bay bottlenecks.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-6 w-full rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/manager/staff">View staff workload <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>
    </WorkspacePage>
  );
}

function DelayedRow({ session }: { session: OperationsQueueSession }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-rose-50/60 px-5 py-4">
      <div className="min-w-0">
        <p className="font-bold text-slate-900">{session.vehiclePlate}</p>
        <p className="truncate text-xs text-slate-500">{session.servicePackage ?? "Wash package"} · {formatSessionStaff(session)}</p>
      </div>
      <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">At risk</span>
    </div>
  );
}

function formatSessionStaff(session: OperationsQueueSession) {
  const names = (session.assignedStaff ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((staff) => staff.staffName)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : (session.assignedStaffName ?? "Unassigned");
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "amber" | "cyan" | "emerald" | "slate" }) {
  const styles = { amber: "bg-amber-50 text-amber-700", cyan: "bg-cyan-50 text-cyan-700", emerald: "bg-emerald-50 text-emerald-700", slate: "bg-slate-100 text-slate-700" };
  return <Card className="rounded-2xl border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-black text-slate-950">{value}</p></div></div></Card>;
}

function flattenSessions(queue?: { columns: { sessions: OperationsQueueSession[] }[] }) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function isDelayed(session: OperationsQueueSession) {
  if (session.status === "COMPLETED" || session.status === "CANCELLED") return false;
  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : null;
  if (!startedAt || !session.estimatedDurationMinutes) return false;
  return Date.now() > startedAt + session.estimatedDurationMinutes * 60_000;
}
