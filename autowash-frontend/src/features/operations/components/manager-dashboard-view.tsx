"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Droplets, Users, Eye, User, Car, Clock, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getEligibleSessionBookings, getOperationsQueue, getActiveStaffOptions } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, EligibleSessionBooking } from "@/entities/operations";
import { useWebSocket } from "@/shared/hooks/use-web-socket";

export function ManagerDashboardView() {
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  // Real-time updates via WebSocket
  useWebSocket();
  const [selectedBooking, setSelectedBooking] = useState<EligibleSessionBooking | null>(null);
  const [selectedSession, setSelectedSession] = useState<OperationsQueueSession | null>(null);
  const queueQuery = useQuery({
    queryKey: ["manager-operations", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });
  const eligibleQuery = useQuery({
    queryKey: ["manager-operations", "eligible"],
    queryFn: getEligibleSessionBookings,
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
        <MetricCard icon={ClipboardList} label="Pending check-in" value={eligibleQuery.data?.length ?? 0} tone="amber" />
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
            ) : delayedSessions.length === 0 && (eligibleQuery.data?.length ?? 0) === 0 ? (
              <div className="p-8"><WorkspaceEmptyState title="Operations are stable" description="No bookings or sessions need immediate intervention." /></div>
            ) : (
              <>
                {(eligibleQuery.data ?? []).slice(0, 3).map((booking) => (
                  <div key={booking.bookingId} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{booking.vehiclePlate}</p>
                      <p className="truncate text-xs text-slate-500">{booking.customerName} · {booking.bookingTime}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Pending check-in</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                        className="h-7 rounded-lg border-amber-200 bg-white px-2 text-xs font-bold text-amber-700 hover:bg-amber-50"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {delayedSessions.slice(0, 3).map((session) => (
                  <DelayedRow
                    key={session.sessionId}
                    session={session}
                    onView={() => setSelectedSession(session)}
                  />
                ))}
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

      {selectedBooking && (
        <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl bg-white text-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                <ClipboardList className="h-5 w-5 text-amber-500" />
                Action Required: Pending Check-in
              </DialogTitle>
              <DialogDescription>
                This booking is scheduled for wash but the vehicle has not checked in.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Customer</span>
                  <span className="font-bold text-slate-900 block">{selectedBooking.customerName}</span>
                  <span className="text-slate-500 block">{selectedBooking.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Vehicle Plate</span>
                  <span className="inline-block font-mono font-black text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                    {selectedBooking.vehiclePlate}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Schedule & Duration</span>
                  <span className="font-medium text-slate-800 block">
                    {selectedBooking.bookingDate} @ {selectedBooking.bookingTime} ({selectedBooking.estimatedDurationMinutes} mins)
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Assigned Staff</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedBooking.assignedStaffName || "Unassigned"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs flex gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Required action</p>
                  <p className="mt-0.5 leading-relaxed text-amber-700">Please check the vehicle in when they arrive at the counter to start their wash session.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border-slate-200"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setSelectedBooking(null);
                  router.push("/manager/operations");
                }}
                className="rounded-xl bg-[#003cff] hover:bg-[#002fcc] text-white font-bold"
              >
                Go to Operations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedSession && (
        <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl bg-white text-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 text-base font-black">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Action Required: Session Running Late
              </DialogTitle>
              <DialogDescription>
                This wash session has exceeded its estimated completion time limit.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Customer</span>
                  <span className="font-bold text-slate-900 block">{selectedSession.customerName}</span>
                  <span className="text-slate-500 block">{selectedSession.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Vehicle Plate</span>
                  <span className="inline-block font-mono font-black text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                    {selectedSession.vehiclePlate}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Service & Time</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedSession.servicePackage || "Wash package"} (Est: {selectedSession.estimatedDurationMinutes || 0} mins)
                  </span>
                  <span className="text-slate-500 block">
                    Started at: {selectedSession.startedAt ? new Date(selectedSession.startedAt).toLocaleTimeString() : "--"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Assigned Staff</span>
                  <span className="font-semibold text-slate-800 block">
                    {formatSessionStaff(selectedSession)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs flex gap-2 text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Required action</p>
                  <p className="mt-0.5 leading-relaxed text-rose-700">Check on the wash bay or reallocate staff if the bay is overloaded or experiencing issues.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl border-slate-200"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setSelectedSession(null);
                  router.push("/manager/operations");
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Manage Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </WorkspacePage>
  );
}

function DelayedRow({ session, onView }: { session: OperationsQueueSession; onView: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-rose-50/60 px-5 py-4">
      <div className="min-w-0">
        <p className="font-bold text-slate-900">{session.vehiclePlate}</p>
        <p className="truncate text-xs text-slate-500">{session.servicePackage ?? "Wash package"} · {formatSessionStaff(session)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">At risk</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="h-7 rounded-lg border-rose-200 bg-white px-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
        >
          <Eye className="mr-1 h-3 w-3" />
          View
        </Button>
      </div>
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
