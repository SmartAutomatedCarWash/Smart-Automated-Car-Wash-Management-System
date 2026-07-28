"use client";

import { useEffect, useMemo, useState, useRef, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Car,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Loader2,
  MoreVertical,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useWorkspaceHeader } from "@/shared/ui/workspace/workspace-header-context";
import { TierIcon } from "@/shared/ui/workspace/tier-icon";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  cancelWashSession,
  checkInWashSession,
  completeWashSession,
  assignStaffToSession,
  getActiveStaffOptions,
  getEligibleSessionBookings,
  getOperationsQueue,
  managerCheckInBooking,
  startWashSession,
} from "@/features/operations/lib/operations-service";
import { useManagerNotificationStore } from "@/features/operations/store/manager-notification.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { BookingStatus, EligibleSessionBooking, OperationStaffAssignment, OperationsQueueSession, StaffOption, WashSessionStatus } from "@/entities/operations";
import { useWebSocket } from "@/shared/hooks/use-web-socket";

type FocusFilter = "ALL" | "NEEDS_ACTION" | "DELAYED" | "UNASSIGNED";
type BoardStage = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED";

type OperationRow = {
  id: string;
  type: "booking" | "session";
  bookingId: string;
  sessionId?: string;
  customerName: string;
  customerPhone: string;
  customerTier: string | null;
  vehiclePlate: string;
  servicePackage: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatus | WashSessionStatus;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedStaff: OperationStaffAssignment[];
  amount: number | null;
  estimatedDurationMinutes: number | null;
  notes: string | null;
  queuedAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

type Intervention = {
  id: string;
  rowId: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  message: string;
  actionLabel: string;
};

type StaffWorkloadItem = {
  staffId: string;
  staffName: string;
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  delayedCount: number;
  openCount: number;
  status: "AVAILABLE" | "BUSY" | "OVERLOADED";
};

const STAFF_OVERLOAD_OPEN_THRESHOLD = 4;
const STAFF_OVERLOAD_WAITING_THRESHOLD = 3;
const STAFF_OVERLOAD_DELAYED_THRESHOLD = 2;
const CHECKED_IN_DELAY_MINUTES = 12;
const WAITING_CHECKIN_DELAY_MINUTES = 15;
const TOP_PANEL_PAGE_SIZE = 5;
const STAFF_WORKLOAD_PAGE_SIZE = 8;

const FOCUS_FILTERS: Array<{ value: FocusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_ACTION", label: "Needs action" },
  { value: "DELAYED", label: "Delayed" },
  { value: "UNASSIGNED", label: "Unassigned" },
];

const BOARD_COLUMNS: Array<{ stage: BoardStage; title: string; tint: string; rail: string }> = [
  { stage: "PENDING", title: "Pending", tint: "bg-blue-50/45", rail: "border-l-blue-500" },
  { stage: "CONFIRMED", title: "Confirmed", tint: "bg-emerald-50/45", rail: "border-l-emerald-500" },
  { stage: "CHECKED_IN", title: "Checked In", tint: "bg-amber-50/55", rail: "border-l-amber-500" },
  { stage: "IN_PROGRESS", title: "In Progress", tint: "bg-cyan-50/45", rail: "border-l-cyan-500" },
  { stage: "COMPLETED", title: "Completed", tint: "bg-orange-50/45", rail: "border-l-orange-400" },
];

const BOARD_STAGE_LABELS: Record<BoardStage, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const VIP_TIERS = new Set(["GOLD", "PLATINUM", "DIAMOND"]);

export function ManagerOperationsPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  // Real-time updates via WebSocket
  useWebSocket();
  const pushManagerNotification = useManagerNotificationStore((state) => state.push);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("ALL");
  const [selectedBoardStages, setSelectedBoardStages] = useState<BoardStage[]>(() => BOARD_COLUMNS.map((column) => column.stage));
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [optimisticSessionRows, setOptimisticSessionRows] = useState<Record<string, OperationRow>>({});

  const handleSelectRow = (id: string | null) => {
    setSelectedRowId(id);
    if (id !== null) {
      setIsSidebarOpen(true);
    }
  };
  const [checkInPage, setCheckInPage] = useState(1);
  const [interventionPage, setInterventionPage] = useState(1);
  const [staffWorkloadPage, setStaffWorkloadPage] = useState(1);

  const queueQuery = useQuery({
    queryKey: ["manager-operations", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });
  const eligibleQuery = useQuery({
    queryKey: ["manager-operations", "eligible", selectedDate],
    queryFn: () => getEligibleSessionBookings(selectedDate),
    refetchInterval: 15_000,
  });
  const staffQuery = useQuery({
    queryKey: ["manager-operations", "staff-options"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const eligibleBookings = eligibleQuery.data ?? [];
  const staffOptions = staffQuery.data ?? [];
  const rows = useMemo(() => buildRows(eligibleBookings, sessions), [eligibleBookings, sessions]);
  const rowsWithOptimisticUpdates = useMemo(() => applyOptimisticSessionRows(rows, optimisticSessionRows), [optimisticSessionRows, rows]);
  const rowsForSelectedDate = useMemo(() => rowsWithOptimisticUpdates.filter((row) => isSameDate(row.bookingDate, selectedDate)), [rowsWithOptimisticUpdates, selectedDate]);
  const filteredRows = useMemo(
    () => applyCommandFilters(rowsForSelectedDate, search, staffFilter, focusFilter),
    [focusFilter, rowsForSelectedDate, search, staffFilter],
  );
  const selectedRow = useMemo(() => {
    if (selectedRowId === null) return null;
    return filteredRows.find((row) => row.id === selectedRowId) ?? filteredRows.find((row) => row.sessionId) ?? filteredRows[0] ?? null;
  }, [filteredRows, selectedRowId]);
  const staffWorkload = useMemo(() => buildStaffWorkload(staffOptions, rowsForSelectedDate), [staffOptions, rowsForSelectedDate]);
  const interventions = useMemo(() => buildInterventions(rowsForSelectedDate, staffWorkload), [rowsForSelectedDate, staffWorkload]);
  const filteredInterventions = useMemo(
    () => interventions.filter((intervention) => filteredRows.some((row) => row.id === intervention.rowId)),
    [filteredRows, interventions],
  );
  const visibleBoardColumns = useMemo(
    () => BOARD_COLUMNS.filter((column) => selectedBoardStages.includes(column.stage)),
    [selectedBoardStages],
  );
  const checkInCandidates = useMemo(
    () => filteredRows.filter((row) => row.type === "booking" && row.status === "CONFIRMED"),
    [filteredRows],
  );
  const checkInPageCount = Math.max(1, Math.ceil(checkInCandidates.length / TOP_PANEL_PAGE_SIZE));
  const interventionPageCount = Math.max(1, Math.ceil(filteredInterventions.length / TOP_PANEL_PAGE_SIZE));
  const staffWorkloadPageCount = Math.max(1, Math.ceil(staffWorkload.length / STAFF_WORKLOAD_PAGE_SIZE));
  const safeCheckInPage = Math.min(checkInPage, checkInPageCount);
  const safeInterventionPage = Math.min(interventionPage, interventionPageCount);
  const safeStaffWorkloadPage = Math.min(staffWorkloadPage, staffWorkloadPageCount);
  const pagedCheckInCandidates = useMemo(
    () => paginateItems(checkInCandidates, safeCheckInPage, TOP_PANEL_PAGE_SIZE),
    [checkInCandidates, safeCheckInPage],
  );
  const pagedInterventions = useMemo(
    () => paginateItems(filteredInterventions, safeInterventionPage, TOP_PANEL_PAGE_SIZE),
    [filteredInterventions, safeInterventionPage],
  );
  const pagedStaffWorkload = useMemo(
    () => paginateItems(staffWorkload, safeStaffWorkloadPage, STAFF_WORKLOAD_PAGE_SIZE),
    [safeStaffWorkloadPage, staffWorkload],
  );

  useEffect(() => {
    setCheckInPage(1);
    setInterventionPage(1);
    setStaffWorkloadPage(1);
  }, [selectedDate, search, staffFilter, focusFilter]);

  useEffect(() => {
    setOptimisticSessionRows((current) => {
      const next = { ...current };
      let changed = false;
      for (const [bookingId, optimisticRow] of Object.entries(current)) {
        const synced = rows.some((row) => row.type === "session" && row.bookingId === bookingId && row.status === optimisticRow.status);
        if (synced) {
          delete next[bookingId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [rows]);

  const waitingCustomerCount = rowsForSelectedDate.filter((row) => row.type === "booking" && row.status === "PENDING").length;
  const waitingCheckIn = rowsForSelectedDate.filter((row) => row.type === "booking" && row.status === "CONFIRMED").length;
  const waitingStartCount = rowsForSelectedDate.filter((row) => row.type === "session" && row.status === "CHECKED_IN").length;
  const washingCount = rowsForSelectedDate.filter((row) => row.status === "IN_PROGRESS").length;
  const overdueCount = rowsForSelectedDate.filter(isDelayed).length;
  const alertCount = filteredInterventions.filter((item) => item.severity !== "INFO").length;
  const hasError = queueQuery.isError || eligibleQuery.isError;
  const error = (queueQuery.error ?? eligibleQuery.error) as unknown as ApiErrorResponse;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
  };

  const headerToolbar = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-600">
          <AlertTriangle className="h-4 w-4" />
          {alertCount} alerts need action
        </span>
      </div>
    ),
    [alertCount],
  );

  useWorkspaceHeader({ toolbar: headerToolbar });

  const handleActionSuccess = (message: string) => {
    refresh();
    toast.success(message);
  };

  const handleActionError = (title: string, actionError: ApiErrorResponse) => {
    const message = getErrorMessage(actionError);
    toast.error(message);
    pushManagerNotification({
      kind: "error",
      title,
      message,
      target: "Manager",
      href: "/manager/operations",
    });
  };

  const createMutation = useMutation({
    mutationFn: (bookingId: string) => managerCheckInBooking(bookingId),
    onMutate: (bookingId) => {
      const booking = eligibleBookings.find((item) => item.bookingId === bookingId);
      if (booking) {
        const now = new Date().toISOString();
        setOptimisticSessionRows((current) => ({
          ...current,
          [bookingId]: buildOptimisticSessionRowFromBooking(booking, `optimistic-${bookingId}`, "CHECKED_IN", {
            checkedInAt: now,
            notes: "Manager check-in",
          }),
        }));
      }
    },
    onSuccess: (_data, bookingId) => {
      setOptimisticSessionRows((current) => {
        const existing = current[bookingId];
        if (!existing) return current;
        return {
          ...current,
          [bookingId]: {
            ...existing,
            id: `session-${_data.sessionId}`,
            sessionId: _data.sessionId,
            status: _data.status as WashSessionStatus,
            assignedStaffId: _data.assignedStaffId,
            assignedStaffName: _data.assignedStaffName,
            checkedInAt: _data.checkedInAt ?? existing.checkedInAt,
          },
        };
      });
      handleActionSuccess("Vehicle checked in and moved to waiting start.");
      const booking = eligibleBookings.find((item) => item.bookingId === bookingId);
      pushManagerNotification({
        kind: "success",
        title: "Booking checked in",
        message: booking ? `${booking.vehiclePlate} moved to waiting start.` : "A booking was checked in successfully.",
        target: booking?.assignedStaffName ?? "Manager",
        plate: booking?.vehiclePlate,
        href: "/manager/operations",
      });
    },
    onError: (actionError: ApiErrorResponse, bookingId) => {
      setOptimisticSessionRows((current) => removeOptimisticSessionRow(current, bookingId));
      handleActionError("Unable to create session", actionError);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (sessionId: string) => checkInWashSession(sessionId),
    onMutate: (sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) {
        setOptimisticSessionRows((current) => ({
          ...current,
          [row.bookingId]: {
            ...row,
            status: "CHECKED_IN",
            checkedInAt: row.checkedInAt ?? new Date().toISOString(),
          },
        }));
      }
    },
    onSuccess: () => handleActionSuccess("Vehicle checked in. Staff can start washing."),
    onError: (actionError: ApiErrorResponse, sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) setOptimisticSessionRows((current) => removeOptimisticSessionRow(current, row.bookingId));
      handleActionError("Unable to check in session", actionError);
    },
  });

  const startMutation = useMutation({
    mutationFn: (sessionId: string) => startWashSession(sessionId),
    onMutate: (sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) {
        setOptimisticSessionRows((current) => ({
          ...current,
          [row.bookingId]: {
            ...row,
            status: "IN_PROGRESS",
            startedAt: row.startedAt ?? new Date().toISOString(),
          },
        }));
      }
    },
    onSuccess: () => handleActionSuccess("Session moved to washing."),
    onError: (actionError: ApiErrorResponse, sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) setOptimisticSessionRows((current) => removeOptimisticSessionRow(current, row.bookingId));
      handleActionError("Unable to start wash", actionError);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) => completeWashSession(sessionId),
    onMutate: (sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) {
        setOptimisticSessionRows((current) => ({
          ...current,
          [row.bookingId]: {
            ...row,
            status: "COMPLETED",
            completedAt: row.completedAt ?? new Date().toISOString(),
          },
        }));
      }
    },
    onSuccess: () => handleActionSuccess("Wash session completed."),
    onError: (actionError: ApiErrorResponse, sessionId) => {
      const row = rowsWithOptimisticUpdates.find((item) => item.sessionId === sessionId);
      if (row) setOptimisticSessionRows((current) => removeOptimisticSessionRow(current, row.bookingId));
      handleActionError("Unable to complete wash", actionError);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) => cancelWashSession(sessionId, reason, "CUSTOMER_FAULT"),
    onSuccess: () => handleActionSuccess("Wash session cancelled."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Unable to cancel wash", actionError),
  });

  const transferMutation = useMutation({
    mutationFn: ({ sessionId, toStaffId }: { sessionId: string; toStaffId: string }) => assignStaffToSession(sessionId, toStaffId, "Manager assigned staff"),
    onSuccess: () => handleActionSuccess("Assigned staff updated."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Unable to assign staff", actionError),
  });

  const runPrimaryAction = (row: OperationRow) => {
    if (row.type === "booking") {
      if (row.status !== "CONFIRMED") return;
      createMutation.mutate(row.bookingId);
      return;
    }
    if (!row.sessionId) return;
    if (row.status === "QUEUED" || row.status === "PENDING") checkInMutation.mutate(row.sessionId);
    if (row.status === "CHECKED_IN") startMutation.mutate(row.sessionId);
    if (row.status === "IN_PROGRESS") completeMutation.mutate(row.sessionId);
  };

  const transferSelectedRow = (toStaffId: string) => {
    if (!selectedRow?.sessionId || selectedRow.status === "COMPLETED" || selectedRow.status === "CANCELLED") {
      toast.info("Completed or cancelled bookings cannot be assigned.");
      return;
    }
    transferMutation.mutate({ sessionId: selectedRow.sessionId, toStaffId });
  };

  const toggleBoardStage = (stage: BoardStage) => {
    setSelectedBoardStages((current) => {
      if (current.includes(stage)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== stage);
      }
      return BOARD_COLUMNS.map((column) => column.stage).filter((item) => current.includes(item) || item === stage);
    });
  };

  return (
    <WorkspacePage compact className="max-w-none bg-[#fbfdff] px-4 pb-5 pt-4 lg:px-5">
      <div className={`grid gap-4 ${isSidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]" : "grid-cols-1"}`}>
        <main className="min-w-0 space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div className="grid items-start gap-2 lg:grid-cols-[minmax(250px,1fr)_132px_168px_168px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plate, phone, or booking ID..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <DatePickerButton
                value={selectedDate}
                onChange={setSelectedDate}
                label="Select date"
                buttonClassName="w-full justify-start"
              />
              <SelectBox value={staffFilter} onChange={setStaffFilter} options={["ALL", ...staffOptions.map((staff) => staff.staffId)]} labels={{ ALL: "All staff", ...Object.fromEntries(staffOptions.map((staff) => [staff.staffId, staff.staffName])) }} />
              <SelectBox
                value={focusFilter}
                onChange={(value) => setFocusFilter(value as FocusFilter)}
                options={FOCUS_FILTERS.map((item) => item.value)}
                labels={Object.fromEntries(FOCUS_FILTERS.map((item) => [item.value, item.label]))}
              />
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(350px,0.95fr)]">
            <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <h2 className="text-sm font-black text-slate-950">Arriving customer check-in</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[580px]">
                {pagedCheckInCandidates.map((row, index) => (
                  <CheckInCandidateRow
                    key={row.id}
                    row={row}
                    index={(safeCheckInPage - 1) * TOP_PANEL_PAGE_SIZE + index}
                    loading={isActionLoading(row, createMutation.variables, checkInMutation.variables, createMutation.isPending, checkInMutation.isPending)}
                    onSelect={() => handleSelectRow(row.id)}
                    onAction={() => runPrimaryAction(row)}
                  />
                ))}
                </div>
                {!eligibleQuery.isPending && checkInCandidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
                    No bookings need check-in for the current filters.
                  </div>
                ) : null}
              </div>
              <PanelPagination
                page={safeCheckInPage}
                pageCount={checkInPageCount}
                total={checkInCandidates.length}
                onPrevious={() => setCheckInPage((page) => Math.max(1, page - 1))}
                onNext={() => setCheckInPage((page) => Math.min(checkInPageCount, page + 1))}
              />
            </Card>

            <Card className="rounded-2xl border-rose-200 bg-rose-50/25 p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-950">Dispatch actions</h2>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{filteredInterventions.length}</span>
              </div>
              <div className="min-h-[15.5rem] space-y-2">
                {pagedInterventions.map((intervention) => (
                  <InterventionRow
                    key={`${safeInterventionPage}-${intervention.id}`}
                    intervention={intervention}
                    onSelect={() => handleSelectRow(intervention.rowId)}
                    onAction={() => {
                      if (intervention.actionLabel === "View details") {
                        handleSelectRow(intervention.rowId);
                        return;
                      }
                      const target = rowsForSelectedDate.find((row) => row.id === intervention.rowId);
                      if (target) runPrimaryAction(target);
                    }}
                  />
                ))}
                {filteredInterventions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-sm font-bold text-emerald-700">
                    No alerts for the current filters.
                  </div>
                ) : null}
              </div>
              <PanelPagination
                page={safeInterventionPage}
                pageCount={interventionPageCount}
                total={filteredInterventions.length}
                onPrevious={() => setInterventionPage((page) => Math.max(1, page - 1))}
                onNext={() => setInterventionPage((page) => Math.min(interventionPageCount, page + 1))}
              />
            </Card>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <MetricCard icon={Users} label="Pending" value={waitingCustomerCount} tone="blue" />
            <MetricCard icon={Clock3} label="Confirmed" value={waitingCheckIn} tone="cyan" />
            <MetricCard icon={Check} label="Checked In" value={waitingStartCount} tone="cyan" />
            <MetricCard icon={Car} label="In Progress" value={washingCount} tone="emerald" />
            <MetricCard icon={AlertTriangle} label="Overdue" value={overdueCount} tone="rose" />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-slate-950">Staff workload</h2>
              <span className="text-xs font-semibold text-slate-500">{staffWorkload.length} staff</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {pagedStaffWorkload.map((staff) => (
                <StaffWorkloadCard key={staff.staffId} staff={staff} selected={staffFilter === staff.staffId} onSelect={() => setStaffFilter(staffFilter === staff.staffId ? "ALL" : staff.staffId)} />
              ))}
            </div>
            <PanelPagination
              page={safeStaffWorkloadPage}
              pageCount={staffWorkloadPageCount}
              total={staffWorkload.length}
              onPrevious={() => setStaffWorkloadPage((page) => Math.max(1, page - 1))}
              onNext={() => setStaffWorkloadPage((page) => Math.min(staffWorkloadPageCount, page + 1))}
            />
          </section>

          {hasError ? <WorkspaceEmptyState title="Unable to load operations queue" description={getErrorMessage(error)} /> : null}

          <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 space-y-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">Operations board</h2>
                <p className="text-xs font-semibold text-slate-500">{filteredRows.length} sessions under current filters</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {BOARD_COLUMNS.map((column) => {
                  const stage = column.stage;
                  const selected = selectedBoardStages.includes(stage);
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => toggleBoardStage(stage)}
                      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                        selected
                          ? "border-[#00236f] bg-[#00236f] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          selected ? "border-white/70 bg-white/15 text-white" : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <CheckCheck className="h-3 w-3" />
                      </span>
                      {BOARD_STAGE_LABELS[stage]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div
                className={`grid gap-3 ${
                  visibleBoardColumns.length >= 5
                    ? "min-w-[980px] grid-cols-5"
                    : visibleBoardColumns.length === 4
                      ? "min-w-[820px] grid-cols-4"
                      : visibleBoardColumns.length === 3
                        ? "min-w-[620px] grid-cols-3"
                        : visibleBoardColumns.length === 2
                          ? "min-w-[420px] grid-cols-2"
                          : "min-w-[280px] grid-cols-1"
                }`}
              >
                {visibleBoardColumns.map((column) => {
                  const columnRows = sortRowsNewestFirst(filteredRows.filter((row) => getBoardStage(row) === column.stage));
                  return (
                    <div key={column.stage} className={`min-h-[380px] rounded-2xl border border-slate-200 ${column.tint} p-2.5`}>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <h3 className="text-[0.72rem] font-black text-slate-700">{column.title}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500 shadow-sm">{columnRows.length}</span>
                      </div>
                      <div className="max-h-[21rem] space-y-2 overflow-y-auto pb-2 pr-1">
                        {columnRows.map((row) => (
                          <BoardCard
                            key={row.id}
                            row={row}
                            selected={selectedRow?.id === row.id}
                            rail={column.rail}
                            loading={isMutatingRow(row, createMutation, checkInMutation, startMutation, completeMutation)}
                            onSelect={() => handleSelectRow(row.id)}
                            onAction={() => runPrimaryAction(row)}
                          />
                        ))}
                        {columnRows.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white/55 p-4 text-center text-xs font-bold text-slate-400">Empty</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </main>

        {isSidebarOpen ? (
          <SessionDetailPanel
            row={selectedRow}
            staffOptions={staffOptions}
            staffWorkload={staffWorkload}
            transferLoading={transferMutation.isPending}
            onClose={() => setIsSidebarOpen(false)}
            onPrimary={() => selectedRow && runPrimaryAction(selectedRow)}
            onTransfer={transferSelectedRow}
            onCancel={() => selectedRow && requestCancel(selectedRow, cancelMutation.mutate)}
          />
        ) : null}
      </div>
    </WorkspacePage>
  );
}

function CheckInCandidateRow({
  row,
  index,
  loading,
  onSelect,
  onAction,
}: {
  row: OperationRow;
  index: number;
  loading: boolean;
  onSelect: () => void;
  onAction: () => void;
}) {
  const display = getCheckInDisplay(row, index);
  const actionIsDetails = display.actionLabel === "View details";

  return (
    <div className="grid min-h-14 grid-cols-[48px_minmax(82px,0.85fr)_minmax(92px,1fr)_minmax(82px,0.75fr)_34px_minmax(78px,0.9fr)_94px] items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0">
      <button type="button" onClick={onSelect} className="text-left leading-tight">
        <p className="text-sm font-black text-slate-950">{formatBookingTime(row.bookingTime)}</p>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <p className="truncate font-mono text-sm font-black text-slate-950">{row.vehiclePlate}</p>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <p className="truncate text-xs font-black text-slate-700">{row.customerName}</p>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <p className="truncate text-[10px] font-bold text-slate-400">{row.servicePackage}</p>
      </button>
      <span className="justify-self-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-[#00236f]">{hasAssignedStaff(row) ? "Assigned" : "Open"}</span>
      <span className={`justify-self-start rounded-md px-2 py-1 text-[10px] font-black ${display.statusClass}`}>{display.statusLabel}</span>
      <Button
        size="sm"
        variant={actionIsDetails ? "outline" : "default"}
        className={`h-8 rounded-md px-3 text-[11px] font-black ${
          display.tone === "danger"
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : actionIsDetails
              ? "border-slate-200 bg-white text-[#00236f] hover:bg-blue-50"
              : "bg-[#00236f] text-white hover:bg-[#001b55]"
        }`}
        onClick={actionIsDetails ? onSelect : onAction}
        disabled={loading || !canRunPrimaryAction(row)}
      >
        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
        {display.actionLabel}
      </Button>
    </div>
  );
}

function getCheckInDisplay(row: OperationRow, index: number) {
  if (isDelayed(row)) {
    return {
      statusLabel: "Late check-in",
      actionLabel: "Check-in ngay",
      statusClass: "bg-rose-50 text-rose-600",
      tone: "danger" as const,
    };
  }
  if (row.type === "booking" && row.status === "CONFIRMED") {
    return {
      statusLabel: index === 0 ? "Ready now" : "Ready",
      actionLabel: "Check-in",
      statusClass: index === 0 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700",
      tone: "primary" as const,
    };
  }
  return {
    statusLabel: getStatusLabel(row.status),
    actionLabel: "View details",
    statusClass: "bg-slate-100 text-slate-600",
    tone: "neutral" as const,
  };
}

function InterventionRow({
  intervention,
  onSelect,
  onAction,
}: {
  intervention: Intervention;
  onSelect: () => void;
  onAction: () => void;
}) {
  const Icon = intervention.severity === "HIGH" ? ShieldAlert : intervention.severity === "MEDIUM" ? AlertTriangle : Info;
  const tone =
    intervention.severity === "HIGH"
      ? {
          row: "border-l-rose-500 bg-rose-50/50",
          icon: "bg-rose-600 text-white",
          button: "text-[#00236f]",
        }
      : intervention.severity === "MEDIUM"
        ? {
            row: "border-l-amber-500 bg-amber-50/50",
            icon: "bg-amber-500 text-white",
            button: "text-[#00236f]",
          }
        : {
            row: "border-l-blue-500 bg-blue-50/50",
            icon: "bg-blue-600 text-white",
            button: "text-[#00236f]",
          };

  return (
    <div className={`grid h-16 grid-cols-[32px_minmax(0,1fr)_104px_34px] items-center gap-3 overflow-hidden rounded-md border border-slate-100 border-l-4 px-3 py-2 ${tone.row}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${tone.icon}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <button type="button" onClick={onSelect} className="min-w-0 truncate text-left text-xs font-bold leading-5 text-slate-800">
        {intervention.message}
      </button>
      <Button
        variant="outline"
        size="sm"
        className={`h-8 rounded-md border-slate-200 bg-white px-3 text-[11px] font-black shadow-sm hover:bg-blue-50 ${tone.button}`}
        onClick={onAction}
      >
        {intervention.actionLabel}
      </Button>
      <button type="button" onClick={onSelect} className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-800">
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function PanelPagination({
  page,
  pageCount,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (total <= TOP_PANEL_PAGE_SIZE) return null;

  return (
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
      <span className="text-[11px] font-bold text-slate-400">
        Page {page}/{pageCount} · {total} items
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "blue" | "cyan" | "emerald" | "rose";
}) {
  const color = {
    blue: "bg-blue-50 text-blue-600",
    cyan: "bg-cyan-50 text-cyan-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  }[tone];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function StaffWorkloadCard({
  staff,
  selected,
  onSelect,
}: {
  staff: StaffWorkloadItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = staff.status === "OVERLOADED" ? "Overloaded" : staff.status === "BUSY" ? "Busy" : "Available";
  const labelClass = staff.status === "OVERLOADED"
    ? "bg-rose-50 text-rose-700"
    : staff.status === "BUSY"
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? "border-[#00236f] ring-2 ring-[#00236f]/10" : "border-slate-200"
      }`}
    >
      <Avatar name={staff.staffName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-black text-slate-950">{staff.staffName}</p>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${labelClass}`}>{label}</span>
        </div>
        <p className="truncate text-xs font-semibold text-slate-500">
          {staff.waitingCount} waiting · {staff.activeCount} washing · {staff.completedCount} completed
        </p>
      </div>
    </button>
  );
}

function BoardCard({
  row,
  selected,
  rail,
  loading,
  onSelect,
  onAction,
}: {
  row: OperationRow;
  selected: boolean;
  rail: string;
  loading: boolean;
  onSelect: () => void;
  onAction: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border border-l-4 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${rail} ${
        selected ? "border-[#00236f] ring-2 ring-[#00236f]/10" : "border-slate-200"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-black text-[#00236f]">#{row.vehiclePlate}</span>
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">{getStatusLabel(row.status)}</span>
      </div>
      <p className="font-mono text-sm font-black text-slate-950">{row.vehiclePlate}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-slate-600">{row.customerName}</p>
      <div className="mt-1 min-h-[24px]">
        <VipTierBadge tier={row.customerTier} />
      </div>
      <p className="truncate text-[11px] font-semibold text-slate-400">{row.servicePackage}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold">
        <span className={isDelayed(row) ? "text-rose-600" : "text-slate-400"}>{getWaitLabel(row)}</span>
        {hasAssignedStaff(row) ? <span className="truncate text-slate-400">{formatShortStaffNames(row)}</span> : <span className="text-amber-600">Unassigned</span>}
      </div>
      <Button
        size="sm"
        variant={row.status === "COMPLETED" ? "outline" : "default"}
        className="mt-2 h-7 w-full rounded-lg bg-[#00236f] text-[11px] font-black text-white hover:bg-[#001b55]"
        onClick={(event) => {
          event.stopPropagation();
          onAction();
        }}
        disabled={loading || row.status === "COMPLETED" || row.status === "CANCELLED"}
      >
        {loading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
        {getPrimaryAction(row)}
      </Button>
    </button>
  );
}

function VipTierBadge({ tier }: { tier: string | null }) {
  const normalizedTier = tier?.toUpperCase() ?? null;
  if (!normalizedTier || !VIP_TIERS.has(normalizedTier)) return null;

  const palette = {
    GOLD: {
      wrap: "border-amber-200 bg-amber-50 text-amber-800",
      icon: { background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "#ffffff" },
    },
    PLATINUM: {
      wrap: "border-slate-200 bg-slate-100 text-slate-700",
      icon: { background: "linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)", color: "#ffffff" },
    },
    DIAMOND: {
      wrap: "border-cyan-200 bg-cyan-50 text-cyan-800",
      icon: { background: "linear-gradient(135deg, #67e8f9 0%, #2563eb 100%)", color: "#ffffff" },
    },
  }[normalizedTier as "GOLD" | "PLATINUM" | "DIAMOND"];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${palette.wrap}`}>
      <TierIcon tier={normalizedTier} className="h-5 w-5 border-0 bg-transparent" iconClassName="h-3 w-3" style={palette.icon} />
      {normalizedTier}
    </span>
  );
}

function SessionDetailPanel({
  row,
  staffOptions,
  staffWorkload,
  transferLoading,
  onClose,
  onPrimary,
  onTransfer,
  onCancel,
}: {
  row: OperationRow | null;
  staffOptions: StaffOption[];
  staffWorkload: StaffWorkloadItem[];
  transferLoading: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onTransfer: (staffId: string) => void;
  onCancel: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const transferOptions = staffOptions.filter((staff) => !row || !rowHasStaff(row, staff.staffId));
  const canTransfer = Boolean(row?.sessionId) && row?.status !== "COMPLETED" && row?.status !== "CANCELLED";
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]')?.contains(event.target as Node)) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!row) {
    return (
      <Card className="sticky top-3 rounded-2xl border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-400 shadow-sm">
        Select a session to view details.
      </Card>
    );
  }

  return (
    <aside ref={panelRef} className="min-w-0">
      <Card className="sticky top-3 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-3.5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Session details</h2>
            <p className="mt-1 text-xs font-black text-[#00236f]">#{row.vehiclePlate}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-3.5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                <Car className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-black text-slate-950">{row.vehiclePlate}</p>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{getStatusLabel(row.status)}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.customerName} · Phone: {row.customerPhone || "—"}</p>
                <div className="mt-2">
                  <VipTierBadge tier={row.customerTier} />
                </div>
                <p className="text-xs font-semibold text-slate-500">Service package: <span className="font-black text-slate-700">{row.servicePackage}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniInfo label="Status" value={getStatusLabel(row.status)} />
            <MiniInfo label="ETA" value={row.estimatedDurationMinutes ? `${row.estimatedDurationMinutes} min` : "—"} />
            <MiniInfo label="Schedule" value={formatBookingTime(row.bookingTime)} />
            <MiniInfo label="Payment" value={row.amount ? formatCurrency(row.amount) : "Not calculated"} />
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Assigned staff</p>
            {hasAssignedStaff(row) ? (
              <div className="flex flex-wrap gap-1.5">
                {row.assignedStaff.map((staff) => (
                  <span key={staff.staffId} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                    {staff.staffName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-amber-600">Unassigned</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Timeline</p>
            <div className="space-y-3 border-l-2 border-slate-100 pl-4">
              {buildTimeline(row).map((step) => (
                <div key={step.label} className="relative">
                  <span
                    className={`absolute -left-[1.42rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      step.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : step.current
                          ? "border-blue-600 bg-white text-blue-600"
                          : "border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    {step.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  <p className={`text-xs font-black ${step.current ? "text-blue-600" : step.done ? "text-emerald-700" : "text-slate-400"}`}>{step.label}</p>
                  {step.note ? <p className="text-[11px] font-semibold text-slate-400">{step.note}</p> : null}
                </div>
              ))}
            </div>
          </div>

          {canTransfer ? (
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Staff assignment suggestions</p>
              <div className="space-y-2">
                {transferOptions.slice(0, 4).map((staff) => {
                  const workload = staffWorkload.find((item) => item.staffId === staff.staffId);
                  const recommended = workload?.status === "AVAILABLE";
                  const workloadSummary = workload
                    ? `${workload.waitingCount} waiting · ${workload.activeCount} washing${workload.delayedCount > 0 ? ` · ${workload.delayedCount} delayed` : ""}`
                    : "No workload data";
                  return (
                    <label
                      key={staff.staffId}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 transition ${
                        selectedStaffId === staff.staffId ? "border-[#00236f] bg-blue-50/40" : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="assign-staff"
                        checked={selectedStaffId === staff.staffId}
                        onChange={() => setSelectedStaffId(staff.staffId)}
                        className="h-4 w-4 accent-[#00236f]"
                      />
                      <Avatar name={staff.staffName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-950">{staff.staffName}</p>
                        <p className="truncate text-[11px] font-semibold text-slate-500">{workloadSummary}</p>
                      </div>
                      {recommended ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Best match</span>
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-bold leading-5 text-emerald-700">
              Completed bookings cannot be reassigned to another staff member.
            </div>
          )}

          <div className="grid gap-2">
            {canRunPrimaryAction(row) ? (
              <Button className="h-11 rounded-xl bg-[#00236f] text-sm font-black text-white hover:bg-[#001b55]" onClick={onPrimary}>
                {getPrimaryAction(row)}
              </Button>
            ) : null}
            {canTransfer && selectedStaffId ? (
              <Button
                className="h-11 rounded-xl bg-[#00236f] text-sm font-black text-white hover:bg-[#001b55]"
                onClick={() => onTransfer(selectedStaffId)}
                disabled={transferLoading}
              >
                {transferLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Assign staff
              </Button>
            ) : null}
            {row.sessionId && row.status !== "COMPLETED" && row.status !== "CANCELLED" ? (
              <Button variant="outline" className="h-10 rounded-xl border-rose-200 bg-rose-50 text-sm font-black text-rose-600" onClick={onCancel}>
                Cancel session
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </aside>
  );
}

function SelectBox({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels: Record<string, string>;
}) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-black text-slate-600 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 text-xs font-black text-[#00236f] ring-2 ring-white">
      {initials}
    </span>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function applyOptimisticSessionRows(rows: OperationRow[], optimisticSessionRows: Record<string, OperationRow>) {
  const optimisticEntries = Object.entries(optimisticSessionRows);
  if (optimisticEntries.length === 0) return rows;

  const optimisticBookingIds = new Set(optimisticEntries.map(([bookingId]) => bookingId));
  const mergedRows = rows
    .filter((row) => !(row.type === "booking" && optimisticBookingIds.has(row.bookingId)))
    .map((row) => {
      const optimisticRow = optimisticSessionRows[row.bookingId];
      return optimisticRow && row.type === "session" ? { ...row, ...optimisticRow } : row;
    });

  const existingSessionBookingIds = new Set(mergedRows.filter((row) => row.type === "session").map((row) => row.bookingId));
  const pendingOptimisticRows = optimisticEntries
    .filter(([bookingId]) => !existingSessionBookingIds.has(bookingId))
    .map(([, row]) => row);

  return [...mergedRows, ...pendingOptimisticRows];
}

function buildOptimisticSessionRowFromBooking(
  booking: EligibleSessionBooking,
  sessionId: string,
  status: WashSessionStatus,
  patch: Partial<Pick<OperationRow, "checkedInAt" | "startedAt" | "completedAt" | "notes">> = {},
): OperationRow {
  const assignedStaff = normalizeAssignedStaff(booking.assignedStaff, booking.assignedStaffId, booking.assignedStaffName);
  return {
    id: `session-${sessionId}`,
    type: "session",
    bookingId: booking.bookingId,
    sessionId,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerTier: booking.customerTier,
    vehiclePlate: booking.vehiclePlate,
    servicePackage: getServiceName(booking.packageId),
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    status,
    assignedStaffId: booking.assignedStaffId,
    assignedStaffName: booking.assignedStaffName,
    assignedStaff,
    amount: booking.finalAmount,
    estimatedDurationMinutes: booking.estimatedDurationMinutes,
    notes: patch.notes ?? null,
    queuedAt: null,
    checkedInAt: patch.checkedInAt ?? null,
    startedAt: patch.startedAt ?? null,
    completedAt: patch.completedAt ?? null,
  };
}

function removeOptimisticSessionRow(current: Record<string, OperationRow>, bookingId: string) {
  if (!(bookingId in current)) return current;
  const next = { ...current };
  delete next[bookingId];
  return next;
}

function buildRows(bookings: EligibleSessionBooking[], sessions: OperationsQueueSession[]): OperationRow[] {
  const sessionBookingIds = new Set(sessions.map((session) => session.bookingId));
  const bookingRows: OperationRow[] = bookings
    .filter((booking) => !sessionBookingIds.has(booking.bookingId))
    .map((booking) => {
      const assignedStaff = normalizeAssignedStaff(booking.assignedStaff, booking.assignedStaffId, booking.assignedStaffName);
      return {
        id: `booking-${booking.bookingId}`,
        type: "booking",
        bookingId: booking.bookingId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerTier: booking.customerTier,
        vehiclePlate: booking.vehiclePlate,
        servicePackage: getServiceName(booking.packageId),
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        status: normalizeBookingStatus(booking.status, assignedStaff),
        assignedStaffId: booking.assignedStaffId,
        assignedStaffName: booking.assignedStaffName,
        assignedStaff,
        amount: booking.finalAmount,
        estimatedDurationMinutes: booking.estimatedDurationMinutes,
        notes: null,
        queuedAt: null,
        checkedInAt: null,
        startedAt: null,
        completedAt: null,
      };
    });

  const sessionRows: OperationRow[] = sessions.map((session) => ({
    id: `session-${session.sessionId}`,
    type: "session",
    bookingId: session.bookingId,
    sessionId: session.sessionId,
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    customerTier: session.customerTier ?? null,
    vehiclePlate: session.vehiclePlate,
    servicePackage: session.servicePackage ?? "Car wash package",
    bookingDate: session.bookingDate,
    bookingTime: session.bookingTime,
    status: session.status,
    assignedStaffId: session.assignedStaffId ?? null,
    assignedStaffName: session.assignedStaffName ?? null,
    assignedStaff: normalizeAssignedStaff(session.assignedStaff, session.assignedStaffId, session.assignedStaffName),
    amount: session.feeAmount ?? null,
    estimatedDurationMinutes: session.estimatedDurationMinutes ?? null,
    notes: session.notes ?? null,
    queuedAt: session.queuedAt ?? null,
    checkedInAt: session.checkedInAt ?? null,
    startedAt: session.startedAt ?? null,
    completedAt: session.completedAt ?? null,
  }));

  return [...bookingRows, ...sessionRows].sort((left, right) => left.bookingTime.localeCompare(right.bookingTime));
}

function buildStaffWorkload(staffOptions: StaffOption[], rows: OperationRow[]): StaffWorkloadItem[] {
  return staffOptions
    .map((staff) => {
      const assignedRows = rows.filter((row) => rowHasStaff(row, staff.staffId));
      const waitingCount = assignedRows.filter((row) => row.status === "PENDING" || row.status === "CONFIRMED" || row.status === "QUEUED" || row.status === "CHECKED_IN").length;
      const activeCount = assignedRows.filter((row) => row.status === "IN_PROGRESS").length;
      const completedCount = assignedRows.filter((row) => row.status === "COMPLETED").length;
      const delayedCount = assignedRows.filter(isDelayed).length;
      const openCount = assignedRows.filter((row) => row.status !== "COMPLETED" && row.status !== "CANCELLED").length;
      const status: StaffWorkloadItem["status"] =
        openCount >= STAFF_OVERLOAD_OPEN_THRESHOLD || waitingCount >= STAFF_OVERLOAD_WAITING_THRESHOLD || delayedCount >= STAFF_OVERLOAD_DELAYED_THRESHOLD
          ? "OVERLOADED"
          : openCount > 0
            ? "BUSY"
            : "AVAILABLE";

      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        activeCount,
        waitingCount,
        completedCount,
        delayedCount,
        openCount,
        status,
      };
    })
    .sort((left, right) => {
      const statusScore = { OVERLOADED: 0, BUSY: 1, AVAILABLE: 2 };
      return statusScore[left.status] - statusScore[right.status] || right.openCount - left.openCount || left.staffName.localeCompare(right.staffName);
    });
}

function buildInterventions(rows: OperationRow[], staffWorkload: StaffWorkloadItem[]): Intervention[] {
  const items: Intervention[] = [];
  rows
    .filter((row) => isActionableDispatchNote(row.notes))
    .forEach((row) => {
      items.push({
        id: `note-${row.id}`,
        rowId: row.id,
        severity: "INFO",
        message: `Vehicle #${row.vehiclePlate} has note: ${row.notes?.trim()}`,
        actionLabel: "View details",
      });
    });

  staffWorkload
    .filter((staff) => staff.status === "OVERLOADED")
    .forEach((staff) => {
      const targetRow = rows.find((row) => rowHasStaff(row, staff.staffId) && row.status !== "COMPLETED" && row.status !== "CANCELLED");
      if (!targetRow) return;
      items.push({
        id: `overloaded-${staff.staffId}`,
        rowId: targetRow.id,
        severity: staff.delayedCount > 0 ? "HIGH" : "MEDIUM",
        message: `${staff.staffName} is overloaded: ${staff.openCount} open bookings, ${staff.waitingCount} waiting bookings${staff.delayedCount > 0 ? `, ${staff.delayedCount} delayed bookings` : ""}.`,
        actionLabel: "Reassign",
      });
    });

  rows
    .filter((row) => row.status === "CHECKED_IN" && isDelayed(row))
    .forEach((row) => {
      items.push({
        id: `late-start-${row.id}`,
        rowId: row.id,
        severity: "INFO",
        message: `Vehicle #${row.vehiclePlate} has been checked in for ${getElapsedMinutesLabel(row.checkedInAt)} but has not started.`,
        actionLabel: "Prioritize",
      });
    });

  return items;
}

function isActionableDispatchNote(note: string | null | undefined) {
  const normalized = note?.trim().toLowerCase();
  if (!normalized) return false;
  return !["manager check-in", "completed from admin booking status"].includes(normalized);
}

function applyCommandFilters(rows: OperationRow[], search: string, staffFilter: string, focusFilter: FocusFilter) {
  const normalizedSearch = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      [row.vehiclePlate, row.customerName, row.customerPhone, row.servicePackage, formatAssignedStaffNames(row), row.bookingId, row.sessionId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStaff = staffFilter === "ALL" || rowHasStaff(row, staffFilter);
    const matchesFocus =
      focusFilter === "ALL" ||
      (focusFilter === "NEEDS_ACTION" && hasWarning(row)) ||
      (focusFilter === "DELAYED" && isDelayed(row)) ||
      (focusFilter === "UNASSIGNED" && !hasAssignedStaff(row) && row.status !== "COMPLETED");

    return matchesSearch && matchesStaff && matchesFocus;
  });
}

function flattenSessions(queue?: { columns: { sessions: OperationsQueueSession[] }[] }) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function sortRowsNewestFirst(rows: OperationRow[]) {
  return [...rows].sort((left, right) => getRowLatestTimestamp(right) - getRowLatestTimestamp(left));
}

function getRowLatestTimestamp(row: OperationRow) {
  const latestIso = row.completedAt ?? row.startedAt ?? row.checkedInAt ?? row.queuedAt;
  if (latestIso) {
    const timestamp = new Date(latestIso).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  const scheduledTimestamp = new Date(`${row.bookingDate.slice(0, 10)}T${formatBookingTime(row.bookingTime)}:00`).getTime();
  return Number.isNaN(scheduledTimestamp) ? 0 : scheduledTimestamp;
}

function getBoardStage(row: OperationRow): BoardStage {
  if (row.type === "booking" && row.status === "PENDING") return "PENDING";
  if (row.type === "booking" && row.status === "CONFIRMED") return "CONFIRMED";
  if (row.type === "booking" && row.status === "CHECKED_IN") return "CHECKED_IN";
  if (row.type === "booking" && row.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (row.type === "booking" && row.status === "COMPLETED") return "COMPLETED";
  if (row.type === "session" && (row.status === "PENDING" || row.status === "QUEUED")) return "CONFIRMED";
  if (row.status === "CHECKED_IN") return "CHECKED_IN";
  if (row.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (row.status === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function buildTimeline(row: OperationRow) {
  const stage = getBoardStage(row);
  const bookingNote = `${formatBookingTime(row.bookingTime)} · ${formatDate(row.bookingDate)}`;
  const checkedInNote = row.checkedInAt ? `${formatClockTime(row.checkedInAt)} · ${formatDate(row.bookingDate)}` : undefined;
  const startedNote = row.startedAt ? `${formatClockTime(row.startedAt)} · ${formatDate(row.bookingDate)}` : undefined;
  const completedNote = row.completedAt ? `${formatClockTime(row.completedAt)} · ${formatDate(row.bookingDate)}` : undefined;
  return [
    { label: "Pending", done: true, current: stage === "PENDING", note: bookingNote },
    { label: "Confirmed", done: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(stage), current: stage === "CONFIRMED", note: stage === "CONFIRMED" ? "Ready for check-in" : undefined },
    { label: "Checked In", done: ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(stage), current: stage === "CHECKED_IN", note: checkedInNote },
    { label: "In Progress", done: ["IN_PROGRESS", "COMPLETED"].includes(stage), current: stage === "IN_PROGRESS", note: stage === "CHECKED_IN" ? getWaitLabel(row) : startedNote },
    { label: "Completed", done: stage === "COMPLETED", current: stage === "COMPLETED", note: completedNote },
  ];
}

function getStatusLabel(status: BookingStatus | WashSessionStatus) {
  const labels: Record<BookingStatus | WashSessionStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    QUEUED: "Queued",
    CHECKED_IN: "Checked In",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No show",
  };
  return labels[status];
}

function getPrimaryAction(row: OperationRow) {
  if (row.type === "booking") return row.status === "CONFIRMED" ? "Check-in" : "Await payment";
  if (row.status === "PENDING" || row.status === "QUEUED") return "Check-in";
  if (row.status === "CHECKED_IN") return "Start";
  if (row.status === "IN_PROGRESS") return "Complete";
  if (row.status === "COMPLETED") return "View details";
  return "Unavailable";
}

function canRunPrimaryAction(row: OperationRow) {
  if (row.type === "booking") {
    return row.status === "CONFIRMED";
  }
  return row.status === "PENDING" || row.status === "QUEUED" || row.status === "CHECKED_IN" || row.status === "IN_PROGRESS";
}

function normalizeBookingStatus(
  status: BookingStatus | null | undefined,
  assignedStaff: OperationStaffAssignment[],
): BookingStatus {
  if (status === "PENDING" || status === "CONFIRMED" || status === "CHECKED_IN" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW") {
    return status;
  }
  return assignedStaff.length > 0 ? "CONFIRMED" : "PENDING";
}

function getServiceName(packageId: string | null) {
  const names: Record<string, string> = {
    "premium-wash": "Premium Wash",
    "interior-care": "Interior Care",
    "quick-wash": "Quick Wash",
  };
  return packageId ? names[packageId] ?? "Selected package" : "Selected package";
}

function requestCancel(row: OperationRow, mutate: (variables: { sessionId: string; reason: string }) => void) {
  if (!row.sessionId) return;
  const reason = window.prompt(`Enter cancellation reason for vehicle ${row.vehiclePlate}:`, "Customer did not arrive or requested cancellation");
  if (!reason?.trim()) return;
  mutate({ sessionId: row.sessionId, reason: reason.trim() });
}

function isActionLoading(row: OperationRow, creatingId: string | undefined, checkInId: string | undefined, creating: boolean, checkingIn: boolean) {
  return (creating && creatingId === row.bookingId) || Boolean(checkingIn && row.sessionId && checkInId === row.sessionId);
}

function isMutatingRow(
  row: OperationRow,
  createMutation: { isPending: boolean; variables?: string },
  checkInMutation: { isPending: boolean; variables?: string },
  startMutation: { isPending: boolean; variables?: string },
  completeMutation: { isPending: boolean; variables?: string },
) {
  return (
    (createMutation.isPending && createMutation.variables === row.bookingId) ||
    Boolean(row.sessionId && checkInMutation.isPending && checkInMutation.variables === row.sessionId) ||
    Boolean(row.sessionId && startMutation.isPending && startMutation.variables === row.sessionId) ||
    Boolean(row.sessionId && completeMutation.isPending && completeMutation.variables === row.sessionId)
  );
}

function hasWarning(row: OperationRow) {
  return Boolean(row.notes || isDelayed(row) || (!hasAssignedStaff(row) && row.status !== "COMPLETED"));
}

function isDelayed(row: OperationRow) {
  if (row.status === "CHECKED_IN") {
    const checkedInMinutes = getElapsedMinutes(row.checkedInAt);
    return checkedInMinutes !== null && checkedInMinutes >= CHECKED_IN_DELAY_MINUTES;
  }
  if (row.status === "IN_PROGRESS") {
    const startedMinutes = getElapsedMinutes(row.startedAt);
    return startedMinutes !== null && row.estimatedDurationMinutes !== null && startedMinutes > row.estimatedDurationMinutes + 10;
  }
  if (row.status === "PENDING" || row.status === "QUEUED") {
    const bookingMinutes = getElapsedMinutesFromBooking(row.bookingDate, row.bookingTime);
    return bookingMinutes !== null && bookingMinutes >= WAITING_CHECKIN_DELAY_MINUTES;
  }
  return false;
}

function getWaitLabel(row: OperationRow) {
  if (row.status === "IN_PROGRESS") {
    const startedMinutes = getElapsedMinutes(row.startedAt);
    return startedMinutes !== null ? formatMinutesDuration(startedMinutes) : formatBookingTime(row.bookingTime);
  }
  if (row.status === "CHECKED_IN") {
    const checkedInMinutes = getElapsedMinutes(row.checkedInAt);
    return checkedInMinutes !== null ? `${checkedInMinutes} minutes waiting to start` : formatBookingTime(row.bookingTime);
  }
  if (row.status === "PENDING" || row.status === "QUEUED") {
    const bookingMinutes = getElapsedMinutesFromBooking(row.bookingDate, row.bookingTime);
    return bookingMinutes !== null && bookingMinutes > 0 ? `${bookingMinutes} minutes waiting for customer` : formatBookingTime(row.bookingTime);
  }
  if (row.status === "COMPLETED") return row.completedAt ? formatClockTime(row.completedAt) : formatBookingTime(row.bookingTime);
  return formatBookingTime(row.bookingTime);
}

function normalizeAssignedStaff(
  assignedStaff: OperationStaffAssignment[] | undefined,
  fallbackId?: string | null,
  fallbackName?: string | null,
) {
  const normalized = (assignedStaff ?? [])
    .filter((staff) => staff.staffId && staff.staffName)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  if (normalized.length > 0 || !fallbackId || !fallbackName) {
    return normalized;
  }
  return [{ staffId: fallbackId, staffName: fallbackName, sortOrder: 1 }];
}

function hasAssignedStaff(row: OperationRow) {
  return row.assignedStaff.length > 0;
}

function rowHasStaff(row: OperationRow, staffId: string) {
  return row.assignedStaff.some((staff) => staff.staffId === staffId);
}

function formatAssignedStaffNames(row: OperationRow) {
  return row.assignedStaff.map((staff) => staff.staffName).join(", ");
}

function formatShortStaffNames(row: OperationRow) {
  const names = row.assignedStaff.map((staff) => staff.staffName.split(" ").slice(-2).join(" "));
  return names.join(", ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isSameDate(value: string, selectedDate: string) {
  return value.slice(0, 10) === selectedDate;
}

function getElapsedMinutes(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  const diffMs = Date.now() - timestamp;
  return diffMs >= 0 ? Math.floor(diffMs / 60000) : null;
}

function getElapsedMinutesFromBooking(date: string, time: string) {
  const bookingTime = new Date(`${date.slice(0, 10)}T${formatBookingTime(time)}:00`);
  if (Number.isNaN(bookingTime.getTime())) return null;
  const diffMs = Date.now() - bookingTime.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / 60000) : null;
}

function formatBookingTime(value: string | null | undefined) {
  if (!value) return "—";
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatMinutesDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}m` : `${minutes} min`;
}

function getElapsedMinutesLabel(value: string | null) {
  const minutes = getElapsedMinutes(value);
  return minutes === null ? "a while" : `${minutes} min`;
}

function formatClockTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}



