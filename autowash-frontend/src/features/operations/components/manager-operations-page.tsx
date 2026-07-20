"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  RefreshCcw,
  Search,
  Timer,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  cancelWashSession,
  checkInWashSession,
  completeWashSession,
  createWashSession,
  getActiveStaffOptions,
  getEligibleSessionBookings,
  getOperationsQueue,
  startWashSession,
} from "@/features/operations/lib/operations-service";
import { useManagerNotificationStore } from "@/features/operations/store/manager-notification.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { EligibleSessionBooking, OperationsQueueSession, StaffOption, WashSessionStatus } from "@/entities/operations";

type QueueFilter = "ALL" | "PENDING" | "QUEUED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type OperationRow = {
  id: string;
  type: "booking" | "session";
  bookingId: string;
  sessionId?: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  servicePackage: string;
  bookingDate: string;
  bookingTime: string;
  status: WashSessionStatus;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  amount: number | null;
  estimatedDurationMinutes: number | null;
  notes: string | null;
};

const FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ tạo" },
  { value: "QUEUED", label: "Chờ check-in" },
  { value: "CHECKED_IN", label: "Đã check-in" },
  { value: "IN_PROGRESS", label: "Đang rửa" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function ManagerOperationsPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const pushManagerNotification = useManagerNotificationStore((state) => state.push);
  const [filter, setFilter] = useState<QueueFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());

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
    queryKey: ["manager-operations", "staff-options"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const eligibleBookings = eligibleQuery.data ?? [];
  const staffOptions = staffQuery.data ?? [];
  const rows = useMemo(() => buildRows(eligibleBookings, sessions), [eligibleBookings, sessions]);
  const rowsForSelectedDate = useMemo(() => rows.filter((row) => isSameDate(row.bookingDate, selectedDate)), [rows, selectedDate]);
  const filteredRows = useMemo(() => applyTableFilters(rowsForSelectedDate, filter, search), [filter, rowsForSelectedDate, search]);
  const eligibleBookingsForSelectedDate = eligibleBookings.filter((booking) => isSameDate(booking.bookingDate, selectedDate));
  const staffWorkload = useMemo(() => buildStaffWorkload(staffOptions, sessions), [staffOptions, sessions]);
  const waitingCount = rowsForSelectedDate.filter((row) => row.status === "PENDING" || row.status === "QUEUED").length;
  const checkedInCount = rowsForSelectedDate.filter((row) => row.status === "CHECKED_IN").length;
  const washingCount = rowsForSelectedDate.filter((row) => row.status === "IN_PROGRESS").length;
  const completedCount = rowsForSelectedDate.filter((row) => row.status === "COMPLETED").length;
  const isLoading = queueQuery.isPending || eligibleQuery.isPending;
  const hasError = queueQuery.isError || eligibleQuery.isError;
  const error = (queueQuery.error ?? eligibleQuery.error) as unknown as ApiErrorResponse;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
  };

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
    mutationFn: (bookingId: string) => createWashSession(bookingId),
    onSuccess: (_data, bookingId) => {
      handleActionSuccess("Đã tạo session và tự động phân staff.");
      const booking = eligibleBookings.find((item) => item.bookingId === bookingId);
      pushManagerNotification({
        kind: "success",
        title: "Đã tạo wash session",
        message: booking ? `${booking.vehiclePlate} đã được tạo session.` : "Session mới đã được tạo thành công.",
        target: booking?.assignedStaffName ?? "Manager",
        plate: booking?.vehiclePlate,
        href: "/manager/operations",
      });
    },
    onError: (actionError: ApiErrorResponse) => handleActionError("Tạo session không thành công", actionError),
  });

  const checkInMutation = useMutation({
    mutationFn: (sessionId: string) => checkInWashSession(sessionId),
    onSuccess: () => handleActionSuccess("Đã check-in xe. Staff có thể bắt đầu rửa."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Check-in không thành công", actionError),
  });

  const startMutation = useMutation({
    mutationFn: (sessionId: string) => startWashSession(sessionId),
    onSuccess: () => handleActionSuccess("Đã chuyển xe sang trạng thái đang rửa."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Bắt đầu rửa không thành công", actionError),
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) => completeWashSession(sessionId),
    onSuccess: () => handleActionSuccess("Đã hoàn thành phiên rửa và cộng điểm nếu đủ điều kiện."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Hoàn thành phiên rửa không thành công", actionError),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) => cancelWashSession(sessionId, reason, "CUSTOMER_FAULT"),
    onSuccess: () => handleActionSuccess("Đã hủy phiên rửa."),
    onError: (actionError: ApiErrorResponse) => handleActionError("Hủy phiên rửa không thành công", actionError),
  });

  const refreshDisabled = queueQuery.isFetching || eligibleQuery.isFetching || staffQuery.isFetching;

  return (
    <WorkspacePage className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Operations command center</h1>
          <p className="text-sm font-semibold text-slate-500">Theo dõi booking, check-in và điều phối staff cho luồng MVP.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 rounded-xl border-cyan-100 bg-white px-3 text-xs shadow-sm" onClick={refresh} disabled={refreshDisabled}>
          <RefreshCcw className={`h-4 w-4 ${refreshDisabled ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard icon={Clock3} label="Chờ xử lý" value={`${waitingCount} xe`} tone="blue" />
        <MetricCard icon={CheckCircle2} label="Đã check-in" value={`${checkedInCount} xe`} tone="cyan" />
        <MetricCard icon={Timer} label="Đang trong buồng" value={`${washingCount} xe`} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Hoàn thành hôm nay" value={`${completedCount} xe`} tone="green" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden rounded-2xl border-amber-200 bg-[#fffdf4] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <h2 className="text-base font-black text-amber-950">Booking cần tiếp nhận</h2>
              <p className="text-xs text-amber-800">Tạo session từ booking đã xác nhận để staff có thể xử lý tại quầy.</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-amber-800">{eligibleBookingsForSelectedDate.length}</span>
          </div>
          <div className="grid gap-2 px-4 pb-4 md:grid-cols-2">
            {eligibleBookingsForSelectedDate.map((booking) => (
              <div key={booking.bookingId} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{booking.vehiclePlate}</p>
                  <p className="truncate text-xs text-slate-500">
                    {booking.customerName} · {booking.bookingTime} · {formatCurrency(booking.finalAmount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-lg bg-cyan-500 px-3 text-xs font-black text-slate-950 hover:bg-cyan-400"
                  onClick={() => createMutation.mutate(booking.bookingId)}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && createMutation.variables === booking.bookingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo session"}
                </Button>
              </div>
            ))}
            {!eligibleQuery.isPending && eligibleBookingsForSelectedDate.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 px-3 py-4 text-center text-xs font-semibold text-amber-700 md:col-span-2">
                Không có booking cần tạo session trong ngày {formatDate(selectedDate)}.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">Staff workload</h2>
            <span className="text-xs font-black text-cyan-700">{staffWorkload.length} active</span>
          </div>
          <div className="space-y-2">
            {staffWorkload.map((staff) => (
              <div key={staff.staffId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-black text-slate-900">{staff.staffName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${staff.activeCount >= 3 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                    {staff.activeCount} active
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{staff.completedCount} completed today</p>
              </div>
            ))}
            {!staffQuery.isPending && staffWorkload.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-400">Chưa có staff active.</div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="relative z-40 overflow-visible rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="Chọn ngày vận hành" buttonClassName="h-10 rounded-lg bg-slate-50" />
            <div className="relative min-w-0 sm:w-[24rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm biển số, khách hàng, gói rửa..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`h-9 shrink-0 rounded-lg px-3 text-[11px] font-black transition ${
                  filter === item.value
                    ? "bg-[#00236f] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {hasError ? <WorkspaceEmptyState title="Không thể tải hàng đợi" description={getErrorMessage(error)} /> : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-wide text-slate-700">
                <th className="px-3 py-3">Biển số</th>
                <th className="px-3 py-3">Khách hàng</th>
                <th className="px-3 py-3">Dịch vụ</th>
                <th className="px-3 py-3">Giờ hẹn</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3">Staff</th>
                <th className="px-3 py-3">Thu tiền</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-700" />
                    <p className="mt-2 text-xs font-semibold text-slate-500">Đang tải hàng đợi...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-xs font-semibold text-slate-400">
                    Không có xe phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <OperationTableRow
                    key={row.id}
                    row={row}
                    onCreate={() => createMutation.mutate(row.bookingId)}
                    onCheckIn={() => row.sessionId && checkInMutation.mutate(row.sessionId)}
                    onStart={() => row.sessionId && startMutation.mutate(row.sessionId)}
                    onComplete={() => row.sessionId && completeMutation.mutate(row.sessionId)}
                    onCancel={() => row.sessionId && requestCancel(row, cancelMutation.mutate)}
                    creating={createMutation.isPending && createMutation.variables === row.bookingId}
                    checkingIn={Boolean(row.sessionId && checkInMutation.isPending && checkInMutation.variables === row.sessionId)}
                    starting={Boolean(row.sessionId && startMutation.isPending && startMutation.variables === row.sessionId)}
                    completing={Boolean(row.sessionId && completeMutation.isPending && completeMutation.variables === row.sessionId)}
                    cancelling={Boolean(row.sessionId && cancelMutation.isPending && cancelMutation.variables?.sessionId === row.sessionId)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </WorkspacePage>
  );
}

function OperationTableRow({
  row,
  onCreate,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  creating,
  checkingIn,
  starting,
  completing,
  cancelling,
}: {
  row: OperationRow;
  onCreate: () => void;
  onCheckIn: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  creating: boolean;
  checkingIn: boolean;
  starting: boolean;
  completing: boolean;
  cancelling: boolean;
}) {
  return (
    <tr className="text-xs transition hover:bg-cyan-50/40">
      <td className="px-3 py-2.5">
        <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 font-black tracking-wide text-[#00236f]">{row.vehiclePlate}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="font-bold text-slate-950">{row.customerName}</div>
        <div className="text-[11px] text-slate-500">{row.customerPhone || "Chưa có SĐT"}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="font-black text-[#00236f]">{row.servicePackage}</div>
        <div className="text-[11px] text-slate-500">{row.estimatedDurationMinutes ? `${row.estimatedDurationMinutes} phút` : "Chưa có thời lượng"}</div>
      </td>
      <td className="px-3 py-2.5 font-bold text-slate-800">
        {row.bookingTime} · {formatDate(row.bookingDate)}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-3 py-2.5">
        {row.assignedStaffName ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            <UserRound className="h-3 w-3" />
            {row.assignedStaffName}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400">Tự động phân</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1.5 font-black text-rose-600">
          <WalletCards className="h-3.5 w-3.5" />
          {row.amount ? formatCurrency(row.amount) : "Chưa tính"}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex min-w-[17rem] justify-end gap-1.5">
          {row.type === "booking" ? (
            <ActionButton label="Tạo session" icon={Play} loading={creating} onClick={onCreate} />
          ) : row.status === "QUEUED" || row.status === "PENDING" ? (
            <>
              <ActionButton label="Check-in" icon={Check} loading={checkingIn} onClick={onCheckIn} />
              <SecondaryActionButton label="Hủy" icon={AlertTriangle} loading={cancelling} onClick={onCancel} />
            </>
          ) : row.status === "CHECKED_IN" ? (
            <>
              <ActionButton label="Bắt đầu" icon={Play} loading={starting} onClick={onStart} />
            </>
          ) : row.status === "IN_PROGRESS" ? (
            <>
              <ActionButton label="Hoàn thành" icon={CheckCircle2} loading={completing} onClick={onComplete} />
            </>
          ) : row.status === "COMPLETED" ? (
            <span className="inline-flex items-center justify-end gap-1 font-black text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Hoàn tất
            </span>
          ) : (
            <span className="font-black text-slate-400">Không khả dụng</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  label,
  icon: Icon,
  loading,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" className="h-8 rounded-lg bg-[#00236f] px-3 text-xs text-white hover:bg-[#001b55]" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

function SecondaryActionButton({
  label,
  icon: Icon,
  loading,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant="outline" className="h-8 rounded-lg border-rose-200 px-3 text-xs font-black text-rose-600 hover:bg-rose-50" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
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
  value: string;
  tone: "blue" | "cyan" | "amber" | "green";
}) {
  const styles = {
    blue: "border-l-blue-500 text-blue-700 bg-blue-50",
    cyan: "border-l-cyan-500 text-cyan-700 bg-cyan-50",
    amber: "border-l-amber-400 text-amber-700 bg-amber-50",
    green: "border-l-emerald-500 text-emerald-700 bg-emerald-50",
  };

  return (
    <Card className={`rounded-2xl border-slate-200 border-l-[5px] bg-white p-4 shadow-sm ${styles[tone]}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}>
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

function StatusBadge({ status }: { status: WashSessionStatus }) {
  const styles: Record<WashSessionStatus, string> = {
    PENDING: "border-blue-200 bg-blue-50 text-blue-700",
    QUEUED: "border-sky-200 bg-sky-50 text-sky-700",
    CHECKED_IN: "border-cyan-200 bg-cyan-50 text-cyan-700",
    IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[status]}`}>{getStatusLabel(status)}</span>;
}

function buildRows(bookings: EligibleSessionBooking[], sessions: OperationsQueueSession[]): OperationRow[] {
  const sessionBookingIds = new Set(sessions.map((session) => session.bookingId));
  const bookingRows: OperationRow[] = bookings
    .filter((booking) => !sessionBookingIds.has(booking.bookingId))
    .map((booking) => ({
      id: `booking-${booking.bookingId}`,
      type: "booking",
      bookingId: booking.bookingId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      vehiclePlate: booking.vehiclePlate,
      servicePackage: getServiceName(booking.packageId),
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      status: "PENDING",
      assignedStaffId: booking.assignedStaffId,
      assignedStaffName: booking.assignedStaffName,
      amount: booking.finalAmount,
      estimatedDurationMinutes: booking.estimatedDurationMinutes,
      notes: null,
    }));

  const sessionRows: OperationRow[] = sessions.map((session) => ({
    id: `session-${session.sessionId}`,
    type: "session",
    bookingId: session.bookingId,
    sessionId: session.sessionId,
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    vehiclePlate: session.vehiclePlate,
    servicePackage: session.servicePackage ?? "Gói rửa xe",
    bookingDate: session.bookingDate,
    bookingTime: session.bookingTime,
    status: session.status,
    assignedStaffId: session.assignedStaffId ?? null,
    assignedStaffName: session.assignedStaffName ?? null,
    amount: session.feeAmount ?? null,
    estimatedDurationMinutes: session.estimatedDurationMinutes ?? null,
    notes: session.notes ?? null,
  }));

  return [...bookingRows, ...sessionRows].sort((left, right) => left.bookingTime.localeCompare(right.bookingTime));
}

function buildStaffWorkload(staffOptions: StaffOption[], sessions: OperationsQueueSession[]) {
  return staffOptions
    .map((staff) => {
      const assignedSessions = sessions.filter((session) => session.assignedStaffId === staff.staffId);
      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        activeCount: assignedSessions.filter((session) => session.status === "CHECKED_IN" || session.status === "IN_PROGRESS").length,
        completedCount: assignedSessions.filter((session) => session.status === "COMPLETED").length,
      };
    })
    .sort((left, right) => right.activeCount - left.activeCount || left.staffName.localeCompare(right.staffName));
}

function applyTableFilters(rows: OperationRow[], filter: QueueFilter, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesFilter = filter === "ALL" || row.status === filter;
    if (!matchesFilter) return false;
    if (!normalizedSearch) return true;
    return [row.vehiclePlate, row.customerName, row.customerPhone, row.servicePackage, row.assignedStaffName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

function flattenSessions(queue?: { columns: { sessions: OperationsQueueSession[] }[] }) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
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

function getServiceName(packageId: string | null) {
  const names: Record<string, string> = {
    "premium-wash": "Premium Wash",
    "interior-care": "Interior Care",
    "quick-wash": "Quick Wash",
  };
  return packageId ? names[packageId] ?? "Gói rửa xe" : "Gói rửa xe";
}

function requestCancel(row: OperationRow, mutate: (variables: { sessionId: string; reason: string }) => void) {
  if (!row.sessionId) return;
  const reason = window.prompt(`Nhập lý do hủy session của xe ${row.vehiclePlate}:`, "Khách không đến hoặc yêu cầu hủy");
  if (!reason?.trim()) return;
  mutate({ sessionId: row.sessionId, reason: reason.trim() });
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
