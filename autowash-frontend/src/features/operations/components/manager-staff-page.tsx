"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Car, CheckCircle2, Loader2, RefreshCcw, Repeat2, Star, Timer, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getActiveStaffOptions, getOperationsQueue, transferWashSession } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, StaffOption, WashSessionStatus } from "@/entities/operations";

type StaffWorkload = {
  staffId: string;
  staffName: string;
  activeSessions: OperationsQueueSession[];
  completedSessions: OperationsQueueSession[];
  queuedSessions: OperationsQueueSession[];
  totalSessions: OperationsQueueSession[];
  rating: number;
  capacity: number;
};

const ACTIVE_STATUSES: WashSessionStatus[] = ["QUEUED", "CHECKED_IN", "IN_PROGRESS"];

export function ManagerStaffPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const staffQuery = useQuery({
    queryKey: ["manager-staff", "active-staff"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });

  const queueQuery = useQuery({
    queryKey: ["manager-staff", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });

  const sessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const sessionsForDate = useMemo(() => sessions.filter((session) => isSameDate(session.bookingDate, selectedDate)), [selectedDate, sessions]);
  const staffOptions = staffQuery.data ?? [];
  const staffWorkloads = useMemo(() => buildStaffWorkloads(staffOptions, sessionsForDate), [sessionsForDate, staffOptions]);
  const selectedStaff = staffWorkloads.find((staff) => staff.staffId === selectedStaffId) ?? staffWorkloads[0] ?? null;
  const unassignedSessions = sessionsForDate.filter((session) => !session.assignedStaffId && ACTIVE_STATUSES.includes(session.status));
  const activeStaffCount = staffWorkloads.length;
  const activeSessionCount = sessionsForDate.filter((session) => ACTIVE_STATUSES.includes(session.status)).length;
  const completedCount = sessionsForDate.filter((session) => session.status === "COMPLETED").length;
  const overloadedCount = staffWorkloads.filter((staff) => staff.activeSessions.length >= staff.capacity).length;
  const isFetching = staffQuery.isFetching || queueQuery.isFetching;
  const hasError = staffQuery.isError || queueQuery.isError;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manager-staff"] });
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
  };

  const transferMutation = useMutation({
    mutationFn: ({ sessionId, staffId }: { sessionId: string; staffId: string }) => transferWashSession(sessionId, staffId, "Manager staff workload adjustment"),
    onSuccess: () => {
      refresh();
      toast.success("Đã chuyển session cho staff mới.");
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Team workload</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Staff management</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi nhân viên active, session đang phụ trách và điều phối lại workload cho luồng MVP.</p>
        </div>
        <div className="relative z-50 flex flex-wrap items-center gap-2">
          <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="Chọn ngày xem staff" buttonClassName="h-9" align="right" />
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={() => setSelectedDate(getTodayInputValue())}>
            Hôm nay
          </Button>
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={refresh} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Staff active" value={activeStaffCount} icon={Users} />
        <Metric label="Session active" value={activeSessionCount} icon={Car} />
        <Metric label="Hoàn thành" value={completedCount} icon={CheckCircle2} />
        <Metric label="Quá tải" value={overloadedCount} icon={Timer} />
      </section>

      {hasError ? (
        <WorkspaceEmptyState title="Không thể tải dữ liệu staff" description={getErrorMessage((staffQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse)} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-3 lg:grid-cols-2">
            {staffWorkloads.map((staff) => (
              <StaffCard
                key={staff.staffId}
                staff={staff}
                selected={selectedStaff?.staffId === staff.staffId}
                onSelect={() => setSelectedStaffId(staff.staffId)}
              />
            ))}
            {!staffQuery.isPending && staffWorkloads.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400 lg:col-span-2">
                Chưa có staff active để hiển thị.
              </Card>
            ) : null}
          </div>

          <Card className="h-fit rounded-2xl border-cyan-100 bg-white p-4 shadow-sm">
            {selectedStaff ? (
              <StaffDetailPanel
                staff={selectedStaff}
                staffOptions={staffOptions}
                unassignedSessions={unassignedSessions}
                transferringSessionId={transferMutation.variables?.sessionId}
                transferring={transferMutation.isPending}
                onTransfer={(sessionId, staffId) => transferMutation.mutate({ sessionId, staffId })}
              />
            ) : (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">Chọn một staff để xem chi tiết.</div>
            )}
          </Card>
        </section>
      )}
    </WorkspacePage>
  );
}

function StaffCard({ staff, selected, onSelect }: { staff: StaffWorkload; selected: boolean; onSelect: () => void }) {
  const activeCount = staff.activeSessions.length;
  const progress = Math.min(100, Math.round((activeCount / staff.capacity) * 100));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 ${
        selected ? "border-cyan-300 ring-2 ring-cyan-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950">{staff.staffName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {staff.rating}/5 · {staff.completedSessions.length} completed
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${activeCount >= staff.capacity ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
          {activeCount}/{staff.capacity}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${activeCount >= staff.capacity ? "bg-amber-400" : "bg-cyan-500"}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Queued" value={staff.queuedSessions.length} />
        <MiniStat label="Active" value={staff.activeSessions.length} />
        <MiniStat label="Done" value={staff.completedSessions.length} />
      </div>
    </button>
  );
}

function StaffDetailPanel({
  staff,
  staffOptions,
  unassignedSessions,
  transferring,
  transferringSessionId,
  onTransfer,
}: {
  staff: StaffWorkload;
  staffOptions: StaffOption[];
  unassignedSessions: OperationsQueueSession[];
  transferring: boolean;
  transferringSessionId?: string;
  onTransfer: (sessionId: string, staffId: string) => void;
}) {
  const activeSessions = [...staff.activeSessions, ...unassignedSessions];

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-black text-slate-950">{staff.staffName}</p>
          <p className="text-xs font-semibold text-slate-500">Session đang xử lý và phân công nhanh.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoPill icon={CalendarClock} label="Capacity" value={`${staff.capacity} xe`} />
        <InfoPill icon={CheckCircle2} label="Done" value={`${staff.completedSessions.length} xe`} />
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Active sessions</p>
        {activeSessions.map((session) => (
          <div key={session.sessionId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{session.vehiclePlate}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {session.servicePackage ?? "Gói rửa xe"} · {session.bookingTime} · {getStatusLabel(session.status)}
                </p>
              </div>
              {!session.assignedStaffId ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">Unassigned</span> : null}
            </div>
            <select
              className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-60"
              defaultValue=""
              disabled={transferring && transferringSessionId === session.sessionId}
              onChange={(event) => {
                if (!event.target.value) return;
                onTransfer(session.sessionId, event.target.value);
                event.target.value = "";
              }}
            >
              <option value="">{transferring && transferringSessionId === session.sessionId ? "Đang chuyển..." : "Chuyển sang staff khác"}</option>
              {staffOptions
                .filter((option) => option.staffId !== session.assignedStaffId)
                .map((option) => (
                  <option key={option.staffId} value={option.staffId}>
                    {option.staffName}
                  </option>
                ))}
            </select>
          </div>
        ))}
        {activeSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs font-semibold text-slate-400">Staff này chưa có session active.</div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <p className="text-sm font-black text-slate-950">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function buildStaffWorkloads(staffOptions: StaffOption[], sessions: OperationsQueueSession[]): StaffWorkload[] {
  return staffOptions
    .map((staff, index) => {
      const totalSessions = sessions.filter((session) => session.assignedStaffId === staff.staffId);
      const activeSessions = totalSessions.filter((session) => session.status === "CHECKED_IN" || session.status === "IN_PROGRESS");
      const queuedSessions = totalSessions.filter((session) => session.status === "QUEUED");
      const completedSessions = totalSessions.filter((session) => session.status === "COMPLETED");
      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        activeSessions,
        completedSessions,
        queuedSessions,
        totalSessions,
        rating: 4.9 - (index % 3) * 0.1,
        capacity: 4,
      };
    })
    .sort((left, right) => right.activeSessions.length - left.activeSessions.length || left.staffName.localeCompare(right.staffName));
}

function getStatusLabel(status: WashSessionStatus) {
  const labels: Record<WashSessionStatus, string> = {
    PENDING: "Đang chờ",
    QUEUED: "Chờ check-in",
    CHECKED_IN: "Đã check-in",
    IN_PROGRESS: "Đang rửa",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return labels[status];
}

function isSameDate(value: string, selectedDate: string) {
  return value.slice(0, 10) === selectedDate;
}
