"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Loader2,
  RotateCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Checkbox } from "@/shared/ui/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import {
  checkInWashSession,
  completeWashSession,
  createWashSession,
  getActiveStaffOptions,
  getEligibleSessionBookings,
  getOperationsQueue,
  queueWashSession,
  startWashSession,
  transferWashSession,
} from "@/features/operations/lib/operations-service";
import { toast } from "sonner";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { cn } from "@/shared/lib/utils";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  EligibleSessionBooking,
  OperationsQueue,
  OperationsQueueSession,
  StaffOption,
  WashSessionStatus,
} from "@/entities/operations";

type StaffOperationsFlowProps = {
  mode: "board" | "check-in" | "session";
  sessionId?: string;
};

type ActionType = "queue" | "check-in" | "approve-check-in" | "start" | "complete";
type BoardStatus = "PENDING" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED";
type TimeBucket = "ALL" | "morning" | "afternoon" | "evening";

type LifecycleActionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  projectedLoyaltyPoints?: number;
  awardedLoyaltyPoints?: number;
};

type Filters = {
  statuses: BoardStatus[];
  timeBucket: TimeBucket;
  startHour: string;
  endHour: string;
  staff: string;
  search: string;
};

const QUEUE_QUERY_KEY = ["staff-operations", "queue"] as const;
const STAFF_ALL_VALUE = "__all_staff__";
const UNASSIGNED_STAFF_VALUE = "__unassigned__";

const BOARD_COLUMNS: Array<{ status: BoardStatus; label: string }> = [
  { status: "PENDING", label: "Chờ duyệt" },
  { status: "CHECKED_IN", label: "Đã check-in" },
  { status: "IN_PROGRESS", label: "Đang rửa" },
  { status: "COMPLETED", label: "Đã hoàn thành" },
];

const OPERATION_COLUMNS = BOARD_COLUMNS.filter((column) => column.status !== "PENDING");

const DEFAULT_FILTERS: Filters = {
  statuses: BOARD_COLUMNS.map((column) => column.status),
  timeBucket: "ALL",
  startHour: "",
  endHour: "",
  staff: STAFF_ALL_VALUE,
  search: "",
};

const statusMeta: Record<WashSessionStatus, { label: string; className: string; glow: string }> = {
  PENDING: {
    label: "Chờ duyệt",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    glow: "shadow-amber-200/70",
  },
  QUEUED: {
    label: "Chờ check-in",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    glow: "shadow-blue-200/70",
  },
  CHECKED_IN: {
    label: "Đã check-in",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    glow: "shadow-violet-200/70",
  },
  IN_PROGRESS: {
    label: "Đang rửa",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    glow: "shadow-orange-200/70",
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    glow: "shadow-emerald-200/70",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    glow: "shadow-slate-200/70",
  },
};

const columnTone: Record<BoardStatus, { panel: string; header: string; accent: string }> = {
  PENDING: {
    panel: "border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-[0_18px_42px_rgba(245,158,11,0.10)]",
    header: "border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white",
    accent: "bg-amber-500 shadow-amber-300",
  },
  CHECKED_IN: {
    panel: "border-violet-200/80 bg-gradient-to-b from-violet-50/90 via-white to-white shadow-[0_18px_42px_rgba(124,58,237,0.10)]",
    header: "border-violet-100 bg-gradient-to-r from-violet-50 via-white to-white",
    accent: "bg-violet-500 shadow-violet-300",
  },
  IN_PROGRESS: {
    panel: "border-orange-200/80 bg-gradient-to-b from-orange-50/90 via-white to-white shadow-[0_18px_42px_rgba(249,115,22,0.12)]",
    header: "border-orange-100 bg-gradient-to-r from-orange-50 via-white to-white",
    accent: "bg-orange-500 shadow-orange-300",
  },
  COMPLETED: {
    panel: "border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 via-white to-white shadow-[0_18px_42px_rgba(16,185,129,0.10)]",
    header: "border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white",
    accent: "bg-emerald-500 shadow-emerald-300",
  },
};

const sessionTone: Record<WashSessionStatus, { card: string; border: string; selected: string; action: string; actionGlow: string }> = {
  PENDING: {
    card: "from-amber-50/95 via-white to-white",
    border: "border-amber-200/80",
    selected: "ring-2 ring-amber-200 border-amber-400",
    action: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
    actionGlow: "shadow-[0_0_26px_rgba(245,158,11,0.38)]",
  },
  QUEUED: {
    card: "from-sky-50/95 via-white to-white",
    border: "border-sky-200/80",
    selected: "ring-2 ring-sky-200 border-sky-400",
    action: "from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700",
    actionGlow: "shadow-[0_0_26px_rgba(14,165,233,0.34)]",
  },
  CHECKED_IN: {
    card: "from-violet-50/95 via-white to-white",
    border: "border-violet-200/80",
    selected: "ring-2 ring-violet-200 border-violet-400",
    action: "from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600",
    actionGlow: "shadow-[0_0_26px_rgba(37,99,235,0.36)]",
  },
  IN_PROGRESS: {
    card: "from-orange-50/95 via-white to-white",
    border: "border-orange-200/80",
    selected: "ring-2 ring-orange-200 border-orange-400",
    action: "from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600",
    actionGlow: "shadow-[0_0_26px_rgba(16,185,129,0.38)]",
  },
  COMPLETED: {
    card: "from-emerald-50/95 via-white to-white",
    border: "border-emerald-200/80",
    selected: "ring-2 ring-emerald-200 border-emerald-400",
    action: "from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600",
    actionGlow: "shadow-[0_0_26px_rgba(16,185,129,0.30)]",
  },
  CANCELLED: {
    card: "from-slate-50 via-white to-white",
    border: "border-slate-200",
    selected: "ring-2 ring-slate-200 border-slate-400",
    action: "from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600",
    actionGlow: "shadow-[0_0_20px_rgba(100,116,139,0.20)]",
  },
};

export function StaffOperationsFlow({ mode, sessionId }: StaffOperationsFlowProps) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId ?? "");
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockedActionMessage, setBlockedActionMessage] = useState<string | null>(null);
  const [plateConfirmed, setPlateConfirmed] = useState(false);

  const queueQuery = useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: getOperationsQueue,
    refetchInterval: 30_000,
  });

  const eligibleBookingsQuery = useQuery({
    queryKey: ["staff-operations", "eligible-bookings"],
    queryFn: getEligibleSessionBookings,
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const filteredSessions = useMemo(() => applyFilters(sessions, filters), [sessions, filters]);
  const checkInSessions = useMemo(
    () => sessions.filter((session) => session.status === "PENDING" || session.status === "QUEUED"),
    [sessions],
  );
  const operationSessions = useMemo(
    () =>
      filteredSessions.filter((session) =>
        ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(toBoardStatus(session.status) ?? ""),
      ),
    [filteredSessions],
  );
  const operationColumns = useMemo(() => buildColumns(operationSessions), [operationSessions]);
  const staffOptions = useMemo(() => buildStaffOptions(sessions), [sessions]);
  const activeSessionId = mode === "session" ? sessionId : selectedSessionId;
  const activeSession = sessions.find((session) => session.sessionId === activeSessionId);
  const detailSession = sessions.find((session) => session.sessionId === detailSessionId);

  const actionMutation = useMutation({
    mutationFn: ({ action, session }: { action: ActionType; session: OperationsQueueSession }) =>
      runAction(action, session),
    onMutate: () => {
      setNotice(null);
      setActionError(null);
      setBlockedActionMessage(null);
    },
    onSuccess: (response, variables) => {
      setNotice(formatActionNotice(variables.action, response));
      setPlateConfirmed(false);
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["staff-operations", "eligible-bookings"] });
    },
    onError: (error: ApiErrorResponse) => {
      setActionError(error.message || error.error?.message || "Không thể cập nhật phiên rửa.");
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (bookingId: string) => createWashSession(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["staff-operations", "eligible-bookings"] });
      toast.success("Tạo phiên chờ duyệt thành công.");
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.message || "Không thể tạo phiên rửa.");
    },
  });

  const handleAction = (action: ActionType, session: OperationsQueueSession) => {
    const blockedReason = getBlockedReason(action, session.status);
    if (blockedReason) {
      setBlockedActionMessage(blockedReason);
      return;
    }
    actionMutation.mutate({ action, session });
  };

  const handleApproveCheckIn = (session: OperationsQueueSession) => {
    if (!plateConfirmed) {
      setBlockedActionMessage("Vui lòng tick xác nhận đã kiểm tra đúng biển số của khách trước khi duyệt.");
      return;
    }
    handleAction(session.status === "PENDING" ? "approve-check-in" : "check-in", session);
  };

  const canAct = !actionMutation.isPending;

  return (
    <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(239,246,255,0.62))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => queueQuery.refetch()} disabled={queueQuery.isFetching}>
          {queueQuery.isFetching ? <Loader2 className="animate-spin" /> : <RotateCw />}
          Làm mới
        </Button>
      </div>

      {queueQuery.isLoading ? <LoadingState /> : null}
      {queueQuery.isError ? <ErrorState message={readError(queueQuery.error)} /> : null}
      {eligibleBookingsQuery.isError && mode === "check-in" ? (
        <ErrorState message={readError(eligibleBookingsQuery.error)} />
      ) : null}
      {notice ? <StateMessage tone="success" message={notice} /> : null}
      {actionError ? <StateMessage tone="error" message={actionError} /> : null}
      {blockedActionMessage ? <StateMessage tone="error" message={blockedActionMessage} /> : null}

      {queueQuery.data && mode === "board" ? (
        <>
          <QueueSummary queue={queueQuery.data} />
          <QueueFilters
            filters={filters}
            setFilters={setFilters}
            staffOptions={staffOptions}
            statusOptions={OPERATION_COLUMNS}
          />
          <div className="grid min-w-0 gap-5 xl:grid-cols-3">
            {OPERATION_COLUMNS.map((column) => (
              <QueueColumn
                key={column.status}
                label={column.label}
                sessions={operationColumns[column.status]}
                selectedSessionId={selectedSessionId}
                onSelect={setSelectedSessionId}
                onOpenDetails={setDetailSessionId}
                onAction={handleAction}
                canAct={canAct}
                compact
                status={column.status}
              />
            ))}
          </div>
          <SessionDetailDialog
            session={detailSession}
            open={Boolean(detailSessionId)}
            onOpenChange={(open: boolean) => !open && setDetailSessionId(null)}
            onAction={handleAction}
            canAct={canAct}
            onTransferred={() => setDetailSessionId(null)}
          />
        </>
      ) : null}

      {queueQuery.data && mode === "check-in" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="grid gap-5 lg:grid-cols-2">
            <EligibleBookingsPanel
              bookings={eligibleBookingsQuery.data ?? []}
              isLoading={eligibleBookingsQuery.isLoading}
              onCreateSession={(id) => createSessionMutation.mutate(id)}
              isCreatingSession={createSessionMutation.isPending}
            />
            <QueueColumn
              label="Phiên chờ duyệt"
              sessions={checkInSessions}
              selectedSessionId={selectedSessionId}
              onSelect={(id) => {
                setSelectedSessionId(id);
                setPlateConfirmed(false);
              }}
              onOpenDetails={setDetailSessionId}
              onAction={handleAction}
              canAct={canAct}
              compact
              showDirectAction={false}
              status="PENDING"
            />
          </div>
          <CheckInApprovalPanel
            session={activeSession}
            plateConfirmed={plateConfirmed}
            setPlateConfirmed={setPlateConfirmed}
            onApprove={handleApproveCheckIn}
            canAct={canAct}
          />
          <SessionDetailDialog
            session={detailSession}
            open={Boolean(detailSessionId)}
            onOpenChange={(open: boolean) => !open && setDetailSessionId(null)}
            onAction={handleAction}
            canAct={canAct}
            onTransferred={() => setDetailSessionId(null)}
          />
        </div>
      ) : null}

      {queueQuery.data && mode === "session" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SessionLifecyclePanel
            session={activeSession}
            requestedSessionId={sessionId ?? ""}
            onAction={handleAction}
            canAct={canAct}
          />
          <DetailPanel
            session={activeSession}
            onAction={handleAction}
            canAct={canAct}
            emptyMessage={`Không tìm thấy phiên ${sessionId ?? ""} trong hàng đợi hiện tại.`}
          />
        </div>
      ) : null}
    </section>
  );
}

function QueueSummary({ queue }: { queue: OperationsQueue }) {
  const metrics = [
    { label: "Tổng số", value: queue.summary.total, className: "from-slate-50 to-white text-slate-950" },
    { label: "Chờ duyệt", value: queue.summary.pending, className: "from-amber-50 to-white text-amber-700" },
    { label: "Đã check-in", value: queue.summary.checkedIn, className: "from-violet-50 to-white text-violet-700" },
    { label: "Đang rửa", value: queue.summary.inProgress, className: "from-orange-50 to-white text-orange-700" },
    { label: "Đã hoàn thành", value: queue.summary.completed, className: "from-emerald-50 to-white text-emerald-700" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={cn(
            "overflow-hidden rounded-2xl border-slate-200/70 bg-gradient-to-br shadow-[0_16px_35px_rgba(15,23,42,0.06)]",
            metric.className,
          )}
        >
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-black">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QueueFilters({
  filters,
  setFilters,
  staffOptions,
  statusOptions,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  staffOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ status: BoardStatus; label: string }>;
}) {
  const toggleStatus = (status: BoardStatus, checked: boolean) => {
    const nextStatuses = checked
      ? Array.from(new Set([...filters.statuses, status]))
      : filters.statuses.filter((item) => item !== status);
    setFilters({ ...filters, statuses: nextStatuses });
  };

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-blue-100/80 bg-gradient-to-br from-white via-blue-50/45 to-violet-50/35 shadow-[0_18px_42px_rgba(37,99,235,0.08)] backdrop-blur">
      <CardContent className="space-y-4 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">Bộ lọc vận hành</p>
            <p className="text-xs text-slate-500">Chọn trạng thái, ca làm và tìm nhanh phiên cần xử lý.</p>
          </div>
          <Button
            variant="ghost"
            className="h-8 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Xóa bộ lọc
          </Button>
        </div>

        <div className="grid items-end gap-3 xl:grid-cols-[minmax(360px,0.95fr)_minmax(300px,0.8fr)_minmax(220px,0.55fr)]">
          <div className="flex flex-wrap gap-2 rounded-3xl border border-white/80 bg-white/65 p-2 shadow-inner">
            {statusOptions.map((column) => (
              <label
                key={column.status}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-2xl border px-3.5 text-sm font-black transition hover:-translate-y-0.5",
                  filters.statuses.includes(column.status)
                    ? "border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)]"
                    : "border-white/80 bg-white text-slate-500 shadow-sm hover:text-slate-900",
                )}
              >
                <Checkbox
                  checked={filters.statuses.includes(column.status)}
                  onCheckedChange={(checked) => toggleStatus(column.status, checked === true)}
                />
                {column.label}
              </label>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="h-11 rounded-2xl border-white/80 bg-white/85 pl-10 text-sm font-semibold shadow-sm focus:border-blue-200 focus:bg-white"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Tìm mã đặt lịch, tên khách, biển số..."
            />
          </div>
          <FilterSelect
            label="Nhân viên"
            value={filters.staff}
            onChange={(value) => setFilters({ ...filters, staff: value })}
            options={[[STAFF_ALL_VALUE, "Tất cả"], ...staffOptions.map((staff) => [staff.value, staff.label] as const)]}
          />
        </div>

        <div className="grid items-end gap-3 rounded-3xl border border-white/80 bg-white/60 p-3 shadow-inner lg:grid-cols-[minmax(170px,0.6fr)_112px_112px_minmax(0,1fr)]">
          <FilterSelect
            label="Ca làm"
            value={filters.timeBucket}
            onChange={(value) => setFilters({ ...filters, timeBucket: value as TimeBucket })}
            options={[
              ["ALL", "Cả ngày"],
              ["morning", "Buổi sáng"],
              ["afternoon", "Buổi chiều"],
              ["evening", "Buổi tối"],
            ]}
          />

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Khung giờ</Label>
            <Input
              type="time"
              value={filters.startHour}
              onChange={(event) => setFilters({ ...filters, startHour: event.target.value })}
              aria-label="Giờ bắt đầu"
              className="h-10 min-w-0 rounded-2xl border-white/80 bg-white text-sm shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Đến</Label>
            <Input
              type="time"
              value={filters.endHour}
              onChange={(event) => setFilters({ ...filters, endHour: event.target.value })}
              aria-label="Giờ kết thúc"
              className="h-10 min-w-0 rounded-2xl border-white/80 bg-white text-sm shadow-sm"
            />
          </div>

          <p className="hidden text-xs font-semibold leading-5 text-slate-500 lg:block">
            Bộ lọc chỉ đổi danh sách hiển thị, không thay đổi trạng thái phiên.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</Label>
      <select
        className="h-10 w-full rounded-2xl border border-white/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function QueueColumn({
  label,
  sessions,
  selectedSessionId,
  onSelect,
  onOpenDetails,
  onAction,
  canAct,
  compact,
  showDirectAction = true,
  status,
}: {
  label: string;
  sessions: OperationsQueueSession[];
  selectedSessionId: string;
  onSelect: (sessionId: string) => void;
  onOpenDetails: (sessionId: string) => void;
  onAction: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
  compact?: boolean;
  showDirectAction?: boolean;
  status?: BoardStatus;
}) {
  const visibleSessions = label === "Đã hoàn thành" ? sessions.slice(0, 3) : sessions;
  const tone = columnTone[status ?? toBoardStatus(visibleSessions[0]?.status) ?? "PENDING"];

  return (
    <Card className={cn("min-h-[430px] overflow-hidden rounded-3xl border backdrop-blur-sm transition duration-300 hover:-translate-y-0.5", tone.panel)}>
      <CardHeader className={cn("border-b p-4", tone.header)}>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex min-w-0 items-center gap-2 truncate font-black text-slate-950">
            <span className={cn("h-2.5 w-2.5 rounded-full shadow-lg ring-4 ring-white/80", tone.accent)} />
            <span className="truncate">{label}</span>
          </span>
          <Badge variant="outline" className="rounded-full bg-white px-3">
            {label === "Đã hoàn thành" ? visibleSessions.length : sessions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[680px] flex-col gap-3 overflow-y-auto p-4">
        {visibleSessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/80 bg-white/55 p-5 text-sm font-medium text-slate-500 shadow-inner">
            Chưa có phiên rửa.
          </p>
        ) : (
          visibleSessions.map((session) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              selected={selectedSessionId === session.sessionId}
              onSelect={onSelect}
              onOpenDetails={onOpenDetails}
              onAction={onAction}
              canAct={canAct}
              compact={compact}
              showDirectAction={showDirectAction}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EligibleBookingsPanel({
  bookings,
  isLoading,
  onCreateSession,
  isCreatingSession,
}: {
  bookings: EligibleSessionBooking[];
  isLoading: boolean;
  onCreateSession: (bookingId: string) => void;
  isCreatingSession: boolean;
}) {
  return (
    <Card className="min-h-[430px] overflow-hidden rounded-3xl border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white p-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="font-black text-slate-950">Booking khách vừa tạo</span>
          <Badge variant="outline" className="rounded-full bg-white px-3">
            {bookings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[680px] flex-col gap-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ) : bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">
            Chưa có booking mới cần kiểm tra.
          </p>
        ) : (
          bookings.map((booking) => (
            <div key={booking.bookingId} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{booking.bookingId}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                    {booking.customerName} · {booking.vehiclePlate}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={isCreatingSession}
                  onClick={() => onCreateSession(booking.bookingId)}
                  className="h-8 rounded-full bg-amber-500 font-bold hover:bg-amber-600 shadow-md text-white border-none"
                >
                  {isCreatingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Tạo phiên duyệt
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniInfo label="Gói rửa" value={booking.packageId ?? booking.comboId ?? "Chưa có"} />
                <MiniInfo label="Giờ hẹn" value={`${booking.bookingDate} ${booking.bookingTime}`} />
                <MiniInfo label="Thời lượng" value={`${booking.estimatedDurationMinutes} phút`} />
                <MiniInfo label="Chi phí" value={formatMoney(booking.finalAmount, "VND")} />
              </div>
              <p className="mt-3 text-xs font-semibold text-amber-800">
                Booking này cần có phiên chờ duyệt từ hệ thống trước khi staff check-in.
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CheckInApprovalPanel({
  session,
  plateConfirmed,
  setPlateConfirmed,
  onApprove,
  canAct,
}: {
  session?: OperationsQueueSession;
  plateConfirmed: boolean;
  setPlateConfirmed: (value: boolean) => void;
  onApprove: (session: OperationsQueueSession) => void;
  canAct: boolean;
}) {
  if (!session || (session.status !== "PENDING" && session.status !== "QUEUED")) {
    return (
      <Card className="rounded-3xl border-dashed border-slate-200 bg-white/90 p-6 text-sm text-slate-500">
        Chọn một phiên chờ duyệt để kiểm biển số và duyệt check-in.
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-amber-200/80 bg-white/95 shadow-[0_18px_40px_rgba(245,158,11,0.10)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-black">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          Duyệt check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Biển số cần kiểm tra</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{session.vehiclePlate}</p>
          <p className="mt-2 text-sm text-slate-600">
            {session.customerName} · {session.bookingId}
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-semibold text-amber-900">
          <Checkbox checked={plateConfirmed} onCheckedChange={(checked) => setPlateConfirmed(checked === true)} />
          <span>
            Tôi đã kiểm tra biển số đúng với xe của khách. Vui lòng check biển số đúng với biển số của
            khách rồi mới được duyệt session.
          </span>
        </label>

        <Button
          className="h-12 w-full rounded-2xl bg-emerald-600 font-black shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:bg-emerald-700"
          disabled={!canAct || !plateConfirmed}
          onClick={() => onApprove(session)}
        >
          {canAct ? <Check className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          Duyệt và check-in
        </Button>
      </CardContent>
    </Card>
  );
}

function DetailPanel({
  session,
  onAction,
  canAct,
  emptyMessage,
}: {
  session?: OperationsQueueSession;
  onAction: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
  emptyMessage: string;
}) {
  if (!session) return <EmptyState message={emptyMessage} />;

  return (
    <Card className="rounded-3xl border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-black">Chi tiết phiên rửa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SessionCard session={session} onAction={onAction} canAct={canAct} showDirectAction />
        <Timeline session={session} />
      </CardContent>
    </Card>
  );
}

function SessionDetailDialog({
  session,
  open,
  onOpenChange,
  onAction,
  canAct,
  onTransferred,
}: {
  session?: OperationsQueueSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
  onTransferred: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-2xl">
        {session ? (
          <div className="p-6">
            <DialogHeader className="border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                    <Wrench className="h-6 w-6 text-blue-600" />
                    Chi tiết phiên rửa
                  </DialogTitle>
                  <DialogDescription>
                    {session.bookingId} · {session.customerName} · {session.vehiclePlate}
                  </DialogDescription>
                </div>
                <StatusBadge status={session.status} />
              </div>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <DialogInfoGrid session={session} />
              <DialogTimeline session={session} />
              <TransferPanel session={session} onTransferred={onTransferred} />
              <DialogActions session={session} onAction={onAction} canAct={canAct} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Không còn thấy phiên rửa</DialogTitle>
              <DialogDescription>
                Phiên có thể vừa được chuyển cho nhân viên khác hoặc không còn nằm trong hàng đợi của bạn.
              </DialogDescription>
            </DialogHeader>
            <Button type="button" className="w-full rounded-2xl" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferPanel({
  session,
  onTransferred,
}: {
  session: OperationsQueueSession;
  onTransferred: () => void;
}) {
  const queryClient = useQueryClient();
  const [toStaffId, setToStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ["staff-operations", "active-staff"],
    queryFn: getActiveStaffOptions,
  });

  const transferMutation = useMutation({
    mutationFn: () => transferWashSession(session.sessionId, toStaffId, reason),
    onSuccess: (response) => {
      setMessage(`Đã chuyển phiên cho ${response.toStaffName}.`);
      setToStaffId("");
      setReason("");
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-session-history"] });
      window.setTimeout(onTransferred, 450);
    },
    onError: (error) => {
      setMessage(getDisplayErrorMessage(error));
    },
  });

  const staffOptions = (staffQuery.data ?? []).filter((staff: StaffOption) => staff.staffId !== session.assignedStaffId);
  const canTransfer = Boolean(toStaffId) && !transferMutation.isPending;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
      <div className="mb-3">
        <p className="text-sm font-black text-blue-950">Chuyển phiên cho nhân viên khác</p>
        <p className="text-xs text-blue-800/80">Mỗi lần chuyển sẽ được ghi audit log để admin theo dõi.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <select
          value={toStaffId}
          onChange={(event) => setToStaffId(event.target.value)}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-300"
        >
          <option value="">{staffQuery.isLoading ? "Đang tải nhân viên..." : "Chọn nhân viên nhận"}</option>
          {staffOptions.map((staff) => (
            <option key={staff.staffId} value={staff.staffId}>
              {staff.staffName}
            </option>
          ))}
        </select>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Lý do chuyển giao"
          className="h-10 rounded-xl border-blue-100 bg-white"
        />
        <Button
          type="button"
          disabled={!canTransfer}
          onClick={() => transferMutation.mutate()}
          className="rounded-xl bg-blue-600 px-5 font-bold hover:bg-blue-700"
        >
          {transferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Chuyển
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs font-semibold text-blue-900">{message}</p> : null}
    </div>
  );
}

function SessionLifecyclePanel({
  session,
  requestedSessionId,
  onAction,
  canAct,
}: {
  session?: OperationsQueueSession;
  requestedSessionId: string;
  onAction: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
}) {
  if (!session) return <EmptyState message={`Không tìm thấy phiên ${requestedSessionId} trong hàng đợi hiện tại.`} />;
  return <SessionCard session={session} onAction={onAction} canAct={canAct} />;
}

function SessionCard({
  session,
  onSelect,
  onOpenDetails,
  onAction,
  canAct,
  compact = false,
  selected = false,
  showDirectAction = true,
}: {
  session: OperationsQueueSession;
  onSelect?: (sessionId: string) => void;
  onOpenDetails?: (sessionId: string) => void;
  onAction?: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
  compact?: boolean;
  selected?: boolean;
  showDirectAction?: boolean;
}) {
  const primaryAction = nextAction(session.status);
  const tone = sessionTone[session.status] ?? sessionTone.PENDING;

  return (
    <article
      className={cn(
        "rounded-3xl border bg-gradient-to-br shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        tone.card,
        selected ? tone.selected : tone.border,
        compact ? "space-y-3 p-4" : "space-y-4 p-4",
      )}
    >
      <button type="button" className="block w-full text-left" onClick={() => onSelect?.(session.sessionId)}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{session.bookingId}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {session.customerName} · {session.vehiclePlate}
            </p>
          </div>
          <StatusBadge status={session.status} />
        </div>
      </button>

      {compact ? (
        <div className="grid grid-cols-2 gap-2">
          <MiniInfo label="Biển số" value={session.vehiclePlate} />
          <MiniInfo label="Gói rửa" value={getServicePackage(session)} />
          <MiniInfo label="Giờ hẹn" value={formatSchedule(session)} />
          <MiniInfo label="Nhân viên" value={getAssignedStaff(session)} />
        </div>
      ) : (
        <InfoGrid session={session} />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl border-white/80 bg-white/75 font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          onClick={() => onOpenDetails?.(session.sessionId)}
        >
          Chi tiết
        </Button>
        {primaryAction && onAction && showDirectAction ? (
          <Button
            size="sm"
            disabled={!canAct || Boolean(getBlockedReason(primaryAction.type, session.status))}
            title={getBlockedReason(primaryAction.type, session.status) ?? primaryAction.label}
            onClick={() => onAction(primaryAction.type, session)}
            className={cn(
              "h-9 flex-1 rounded-xl bg-gradient-to-r font-black text-white transition hover:-translate-y-0.5",
              tone.action,
              tone.actionGlow,
            )}
          >
            <Check className="h-4 w-4" />
            {primaryAction.label}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function InfoGrid({ session }: { session: OperationsQueueSession }) {
  return (
    <div className="grid gap-2 text-sm text-slate-700">
      <Info label="Mã đặt lịch" value={session.bookingId} />
      <Info label="Khách hàng" value={session.customerName} />
      <Info label="Số điện thoại" value={session.customerPhone || "Chưa có"} />
      <Info label="Biển số" value={session.vehiclePlate} />
      <Info label="Gói rửa" value={getServicePackage(session)} />
      <Info label="Nhân viên" value={getAssignedStaff(session)} />
      <Info label="Giờ hẹn" value={formatSchedule(session)} />
      <Info label="Dự kiến xong" value={formatEstimatedFinish(session)} />
      <Info
        label="Phí dịch vụ"
        value={session.feeAmount != null ? formatMoney(session.feeAmount, session.feeCurrency) : "Hiển thị sau check-in"}
      />
      <Info
        label="Điểm dự kiến"
        value={session.projectedLoyaltyPoints != null ? `${session.projectedLoyaltyPoints}` : "Hiển thị sau check-in"}
      />
      {session.awardedLoyaltyPoints != null ? <Info label="Điểm đã cộng" value={`${session.awardedLoyaltyPoints}`} /> : null}
      {session.notes ? <Info label="Ghi chú" value={session.notes} /> : null}
    </div>
  );
}

function DialogInfoGrid({ session }: { session: OperationsQueueSession }) {
  const items = [
    ["Mã đặt lịch", session.bookingId],
    ["Khách hàng", session.customerName],
    ["Số điện thoại", session.customerPhone || "Chưa có"],
    ["Biển số", session.vehiclePlate],
    ["Gói rửa", getServicePackage(session)],
    ["Nhân viên", getAssignedStaff(session)],
    ["Giờ hẹn", formatSchedule(session)],
    ["Dự kiến xong", formatEstimatedFinish(session)],
    ["Phí dịch vụ", session.feeAmount != null ? formatMoney(session.feeAmount, session.feeCurrency) : "Hiển thị sau check-in"],
    ["Điểm dự kiến", session.projectedLoyaltyPoints != null ? `${session.projectedLoyaltyPoints}` : "Hiển thị sau check-in"],
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-2xl bg-slate-50/90 px-3 py-2.5 shadow-inner ring-1 ring-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-0.5 truncate text-sm font-black text-slate-950" title={value}>
            {value}
          </p>
        </div>
      ))}
      {session.notes ? (
        <div className="min-w-0 rounded-2xl bg-blue-50/80 px-3 py-2.5 shadow-inner ring-1 ring-blue-100 sm:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-400">Ghi chú</p>
          <p className="mt-0.5 text-sm font-semibold text-blue-950">{session.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function DialogTimeline({ session }: { session: OperationsQueueSession }) {
  const steps = [
    ["Hàng đợi", formatDateTime(session.queuedAt)],
    ["Check-in", formatDateTime(session.checkedInAt)],
    ["Bắt đầu", formatDateTime(session.startedAt)],
    ["Hoàn thành", formatDateTime(session.completedAt)],
  ];

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-4">
      {steps.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl bg-white/80 px-3 py-2 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-800" title={value}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function DialogActions({
  session,
  onAction,
  canAct,
}: {
  session: OperationsQueueSession;
  onAction: (action: ActionType, session: OperationsQueueSession) => void;
  canAct: boolean;
}) {
  const primaryAction = nextAction(session.status);
  if (!primaryAction) return null;
  const tone = sessionTone[session.status] ?? sessionTone.PENDING;

  return (
    <div className="flex justify-end border-t border-slate-100 pt-4">
      <Button
        disabled={!canAct || Boolean(getBlockedReason(primaryAction.type, session.status))}
        title={getBlockedReason(primaryAction.type, session.status) ?? primaryAction.label}
        onClick={() => onAction(primaryAction.type, session)}
        className={cn("h-10 rounded-2xl bg-gradient-to-r px-5 font-black text-white", tone.action, tone.actionGlow)}
      >
        <Check className="h-4 w-4" />
        {primaryAction.label}
      </Button>
    </div>
  );
}

function Timeline({ session }: { session: OperationsQueueSession }) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-700">
      <TimelineRow label="Đưa vào hàng đợi" value={formatDateTime(session.queuedAt)} />
      <TimelineRow label="Check-in" value={formatDateTime(session.checkedInAt)} />
      <TimelineRow label="Bắt đầu rửa" value={formatDateTime(session.startedAt)} />
      <TimelineRow label="Hoàn thành" value={formatDateTime(session.completedAt)} />
    </div>
  );
}

function StatusBadge({ status }: { status: WashSessionStatus }) {
  const meta = statusMeta[status] ?? statusMeta.PENDING;
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 rounded-full border text-[10px] font-bold shadow-lg", meta.className, meta.glow)}
    >
      {meta.label}
    </Badge>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/70 px-3 py-2 shadow-inner ring-1 ring-white/80">
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-black text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 rounded-2xl bg-white/70 px-3 py-2 shadow-inner ring-1 ring-white/80">
      <span className="min-w-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function StateMessage({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-2xl border p-3 text-sm",
        tone === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-white p-4 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      Đang tải hàng đợi vận hành...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <StateMessage tone="error" message={message} />;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">{message}</div>;
}

function flattenSessions(queue?: OperationsQueue) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function buildColumns(sessions: OperationsQueueSession[]) {
  return BOARD_COLUMNS.reduce<Record<BoardStatus, OperationsQueueSession[]>>(
    (columns, column) => {
      columns[column.status] = sessions.filter((session) => toBoardStatus(session.status) === column.status);
      return columns;
    },
    { PENDING: [], CHECKED_IN: [], IN_PROGRESS: [], COMPLETED: [] },
  );
}

function applyFilters(sessions: OperationsQueueSession[], filters: Filters) {
  const search = filters.search.trim().toLowerCase();
  return sessions.filter((session) => {
    const boardStatus = toBoardStatus(session.status);
    if (!boardStatus || !filters.statuses.includes(boardStatus)) return false;
    if (!matchesTimeBucket(session.bookingTime, filters.timeBucket)) return false;
    if (!matchesHourRange(session.bookingTime, filters.startHour, filters.endHour)) return false;
    if (!matchesStaff(session, filters.staff)) return false;
    if (!matchesSearch(session, search)) return false;
    return true;
  });
}

function toBoardStatus(status: WashSessionStatus): BoardStatus | null {
  if (status === "PENDING" || status === "QUEUED") return "PENDING";
  if (status === "CHECKED_IN") return "CHECKED_IN";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "COMPLETED") return "COMPLETED";
  return null;
}

function matchesTimeBucket(time: string, bucket: TimeBucket) {
  if (bucket === "ALL") return true;
  const hour = readHour(time);
  if (bucket === "morning") return hour >= 6 && hour < 12;
  if (bucket === "afternoon") return hour >= 12 && hour < 18;
  return hour >= 18 || hour < 6;
}

function matchesHourRange(time: string, startHour: string, endHour: string) {
  if (!startHour && !endHour) return true;
  const minutes = readMinutes(time);
  const start = startHour ? readMinutes(startHour) : 0;
  const end = endHour ? readMinutes(endHour) : 24 * 60 - 1;
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}

function matchesStaff(session: OperationsQueueSession, staff: string) {
  if (staff === STAFF_ALL_VALUE) return true;
  const staffValue = session.assignedStaffId ?? session.assignedStaffName ?? UNASSIGNED_STAFF_VALUE;
  return staffValue === staff;
}

function matchesSearch(session: OperationsQueueSession, search: string) {
  if (!search) return true;
  return [session.bookingId, session.customerName, session.vehiclePlate]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(search));
}

function buildStaffOptions(sessions: OperationsQueueSession[]) {
  const values = new Map<string, string>();
  for (const session of sessions) {
    const value = session.assignedStaffId ?? session.assignedStaffName;
    if (value) values.set(value, session.assignedStaffName ?? value);
  }
  if (values.size === 0) values.set(UNASSIGNED_STAFF_VALUE, "Chưa phân công");
  return Array.from(values, ([value, label]) => ({ value, label }));
}

function nextAction(status: WashSessionStatus): { type: ActionType; label: string } | null {
  if (status === "PENDING" || status === "QUEUED") return { type: "check-in", label: "Check-in" };
  if (status === "CHECKED_IN") return { type: "start", label: "Bắt đầu" };
  if (status === "IN_PROGRESS") return { type: "complete", label: "Hoàn thành" };
  return null;
}

function getBlockedReason(action: ActionType, status: WashSessionStatus) {
  if (action === "queue" && status !== "PENDING") return "Chỉ phiên chờ duyệt mới được duyệt";
  if (action === "check-in" && (status === "CHECKED_IN" || status === "IN_PROGRESS" || status === "COMPLETED")) {
    return "Phiên này đã check-in";
  }
  if (action === "approve-check-in" && status !== "PENDING") return "Chỉ phiên chờ duyệt mới cần duyệt nhanh";
  if (action === "start" && status !== "CHECKED_IN") return "Chỉ phiên đã check-in mới được bắt đầu";
  if (action === "complete" && status !== "IN_PROGRESS") return "Chỉ phiên đang rửa mới được hoàn thành";
  return null;
}

async function runAction(action: ActionType, session: OperationsQueueSession): Promise<LifecycleActionResponse> {
  if (action === "queue") return queueWashSession(session.sessionId);
  if (action === "approve-check-in") {
    await queueWashSession(session.sessionId);
    return checkInWashSession(session.sessionId);
  }
  if (action === "check-in") {
    // If still PENDING, auto-queue first then check-in
    if (session.status === "PENDING") {
      await queueWashSession(session.sessionId);
    }
    return checkInWashSession(session.sessionId);
  }
  if (action === "start") return startWashSession(session.sessionId);
  return completeWashSession(session.sessionId);
}

function formatActionNotice(action: ActionType, response: LifecycleActionResponse) {
  if (action === "check-in") {
    const projectedPoints = response.projectedLoyaltyPoints != null
      ? ` Điểm tích lũy dự kiến: ${response.projectedLoyaltyPoints}.`
      : "";
    return `Phiên ${response.sessionId} đã check-in thành công.${projectedPoints}`;
  }

  if (action === "start") {
    return `Phiên ${response.sessionId} đã bắt đầu rửa xe.`;
  }

  const awardedPoints = response.awardedLoyaltyPoints != null
    ? ` Điểm thưởng nhận được: ${response.awardedLoyaltyPoints}.`
    : "";
  return `Phiên ${response.sessionId} đã hoàn thành.${awardedPoints}`;
}

function readError(error: unknown) {
  const apiError = error as Partial<ApiErrorResponse>;
  return apiError.message || apiError.error?.message || "Không thể tải hàng đợi vận hành.";
}

function getServicePackage(session: OperationsQueueSession) {
  return session.servicePackage ?? session.packageId ?? "Chưa có gói rửa";
}

function getAssignedStaff(session: OperationsQueueSession) {
  return session.assignedStaffName ?? "Chưa phân công";
}

function formatSchedule(session: OperationsQueueSession) {
  return `${session.bookingDate} ${session.bookingTime}`;
}

function formatEstimatedFinish(session: OperationsQueueSession) {
  const duration = session.estimatedDurationMinutes ?? 0;
  const base = session.startedAt ? new Date(session.startedAt) : new Date(`${session.bookingDate}T${session.bookingTime}`);
  if (Number.isNaN(base.getTime()) || duration <= 0) return "Chưa có";
  base.setMinutes(base.getMinutes() + duration);
  return base.toLocaleString("vi-VN");
}

function formatMoney(amount: number, currency?: string | null) {
  return currency === "VND" || !currency
    ? `${new Intl.NumberFormat("vi-VN").format(amount)} đ`
    : `${amount.toLocaleString()} ${currency}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
}

function readHour(time: string) {
  return Number.parseInt(time.split(":")[0] ?? "0", 10);
}

function readMinutes(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
}
