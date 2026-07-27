"use client";

import { useEffect, useMemo, useState, useRef, type ComponentType } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Timer,
  Trash2,
  X,
  UserRound,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/ui/dropdown-menu";
import { Progress } from "@/shared/ui/ui/progress";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useWorkspaceHeader } from "@/shared/ui/workspace/workspace-header-context";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { cn } from "@/shared/lib/utils";
import { formatIntegerRating } from "@/shared/lib/rating-format";
import { ManagerStaffAssignmentDialog } from "@/features/operations/components/manager-staff-assignment-dialog";
import { assignStaffToSession, getActiveStaffOptions, getOperationsQueue } from "@/features/operations/lib/operations-service";
import { createAdminStaff, deleteAdminStaff, listAdminStaff, listAdminStaffKpi, updateAdminStaff } from "@/features/reports/api/admin-reporting-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, StaffOption, WashSessionStatus } from "@/entities/operations";
import type { AdminAccount, AdminAccountStatus, CreateAdminStaffPayload, PaginationMeta, StaffKpiItem, UpdateAdminStaffPayload } from "@/entities/reports";

type StaffStatus = "available" | "busy" | "overloaded" | "offline";
type StaffRole = string;

type StaffRow = {
  staffId: string;
  staffName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  activeSessions: OperationsQueueSession[];
  completedSessions: OperationsQueueSession[];
  queuedSessions: OperationsQueueSession[];
  totalSessions: OperationsQueueSession[];
  rating: number | null;
  reviewCount: number;
  kpiPercent: number;
  avatarUrl?: string;
  accountStatus: AdminAccountStatus | "UNKNOWN";
};

type StaffDialogMode = "view" | "edit";

type StaffFormState = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  status: AdminAccountStatus | "UNKNOWN";
};

const EMPTY_CREATE_FORM: CreateAdminStaffPayload = {
  fullName: "",
  phone: "",
  email: "",
  password: "Password123@",
  role: "STAFF",
};

const ACTIVE_STATUSES: WashSessionStatus[] = ["QUEUED", "CHECKED_IN", "IN_PROGRESS"];
const EMPTY_STAFF_FORM: StaffFormState = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  status: "UNKNOWN",
};
const STAFF_PAGE_SIZE = 5;
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ManagerStaffPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [clientReady, setClientReady] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accountStatusFilter, setAccountStatusFilter] = useState("ALL");
  const [performanceStaffId, setPerformanceStaffId] = useState("ALL");
  const [performancePeriod, setPerformancePeriod] = useState<"DAY" | "WEEK" | "MONTH">("WEEK");
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [staffPage, setStaffPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminStaffPayload>(EMPTY_CREATE_FORM);
  const [profileDialog, setProfileDialog] = useState<{ mode: StaffDialogMode; staffId: string } | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<{ sessionId: string; currentStaffId?: string | null } | null>(null);
  const [bookingDialogSession, setBookingDialogSession] = useState<OperationsQueueSession | null>(null);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const staffQuery = useQuery({
    queryKey: ["manager-staff", "active-staff"],
    queryFn: getActiveStaffOptions,
    enabled: clientReady,
    refetchInterval: 30_000,
  });
  const queueQuery = useQuery({
    queryKey: ["manager-staff", "queue"],
    queryFn: getOperationsQueue,
    enabled: clientReady,
    refetchInterval: 15_000,
  });
  const staffAccountsQuery = useQuery({
    queryKey: ["manager-staff", "accounts", staffPage],
    queryFn: () => listAdminStaff(staffPage, STAFF_PAGE_SIZE),
    enabled: clientReady,
    refetchInterval: 30_000,
    retry: 1,
  });
  const staffKpiQuery = useQuery({
    queryKey: ["manager-staff", "kpi", performancePeriod],
    queryFn: () => listAdminStaffKpi(performancePeriod),
    enabled: clientReady,
    refetchInterval: 30_000,
    retry: 1,
  });

  const sessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const staffRows = useMemo(
    () => buildStaffRows(staffQuery.data ?? [], sessions, staffAccountsQuery.data?.items ?? [], staffKpiQuery.data?.items ?? []),
    [sessions, staffAccountsQuery.data, staffKpiQuery.data, staffQuery.data],
  );
  const filteredRows = useMemo(
    () => staffRows.filter((row) => matchesStaff(row, search, statusFilter, accountStatusFilter)),
    [accountStatusFilter, search, staffRows, statusFilter],
  );
  const staffPagination = staffAccountsQuery.data?.pagination;
  const selectedStaff = staffRows.find((row) => row.staffId === selectedStaffId) ?? null;
  const profileStaff = profileDialog ? staffRows.find((row) => row.staffId === profileDialog.staffId) ?? null : null;
  const deleteTargetStaff = deleteStaffId ? staffRows.find((row) => row.staffId === deleteStaffId) ?? null : null;
  const totalDisplay = staffPagination?.total ?? staffRows.length;
  const busyCount = staffRows.filter((row) => row.status === "busy" || row.status === "overloaded").length;
  const availableCount = staffRows.filter((row) => row.status === "available").length;
  const completedBookings = sessions.filter((session) => session.status === "COMPLETED").length;
  const activeBookings = sessions.filter((session) => ACTIVE_STATUSES.includes(session.status)).length;
  const performanceSessions = useMemo(
    () => sessions.filter((session) => performanceStaffId === "ALL" || session.assignedStaffId === performanceStaffId),
    [performanceStaffId, sessions],
  );
  
  const kpiData = staffKpiQuery.data?.items ?? [];
  const performanceKpi = performanceStaffId === "ALL"
    ? kpiData
    : kpiData.filter((k) => k.staffId === performanceStaffId);

  const performanceCompletedBookings = performanceKpi.reduce((sum, k) => sum + k.completedBookings, 0);
  const performanceRevenue = performanceKpi.reduce((sum, k) => sum + k.completedRevenue, 0);
  const performanceOnTimeRate = performanceKpi.length ? Math.round(performanceKpi.reduce((sum, k) => sum + k.kpiProgressPercent, 0) / performanceKpi.length) : 0;
  
  const performanceStaff = performanceStaffId === "ALL" ? null : staffRows.find((row) => row.staffId === performanceStaffId) ?? null;
  const performanceChartData = useMemo(() => buildPerformanceChartData(performanceSessions), [performanceSessions]);
  const isFetching = staffQuery.isFetching || queueQuery.isFetching || staffAccountsQuery.isFetching || staffKpiQuery.isFetching;
  const hasError = staffQuery.isError || queueQuery.isError;

  useEffect(() => {
    if (staffPagination && staffPagination.totalPages > 0 && staffPage > staffPagination.totalPages) {
      setStaffPage(staffPagination.totalPages);
    }
  }, [staffPage, staffPagination]);

  useEffect(() => {
    if (!selectedStaffId) {
      return;
    }
    const stillExists = staffRows.some((row) => row.staffId === selectedStaffId);
    if (!stillExists) {
      setSelectedStaffId("");
      setDetailsExpanded(false);
    }
  }, [selectedStaffId, staffRows]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manager-staff"] });
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
  };

  const transferMutation = useMutation({
    mutationFn: ({ sessionId, staffId }: { sessionId: string; staffId: string }) => assignStaffToSession(sessionId, staffId, "Manager staff quick assignment"),
    onSuccess: () => {
      refresh();
      toast.success("Booking assigned to the selected staff member.");
    },
    onError: (error: ApiErrorResponse) => toast.error(getErrorMessage(error)),
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ staffId, payload }: { staffId: string; payload: UpdateAdminStaffPayload }) => updateAdminStaff(staffId, payload),
    onSuccess: () => {
      refresh();
      toast.success("Staff profile updated.");
      setProfileDialog(null);
    },
    onError: (error: ApiErrorResponse) => toast.error(getErrorMessage(error)),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: string) => deleteAdminStaff(staffId),
    onSuccess: (_data, staffId) => {
      refresh();
      if (selectedStaffId === staffId) {
        setSelectedStaffId("");
      }
      setDeleteStaffId(null);
      toast.success("Staff member deleted.");
    },
    onError: (error: ApiErrorResponse) => toast.error(getErrorMessage(error)),
  });

  const createStaffMutation = useMutation({
    mutationFn: createAdminStaff,
    onSuccess: () => {
      setShowCreateForm(false);
      setCreateForm(EMPTY_CREATE_FORM);
      refresh();
      toast.success("Staff member created in the backend.");
    },
    onError: (error: ApiErrorResponse) => toast.error(getErrorMessage(error)),
  });

  const exportReport = () => {
    const rows = staffRows.map((row) => `${row.staffName},${row.email},${statusLabel(row.status)},${row.activeSessions.length},${row.kpiPercent}%,${row.rating ?? ""}`);
    const blob = new Blob([["Staff,Email,Status,Active,KPI,Rating", ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "manager-staff-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const openStaffProfile = (staffId: string, mode: StaffDialogMode) => {
    setSelectedStaffId(staffId);
    setProfileDialog({ staffId, mode });
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    setDetailsExpanded(true);
  };

  const openAssignmentForRow = (row: StaffRow) => {
    const session = row.activeSessions[0] ?? row.queuedSessions[0];
    if (!session) {
      toast.info("This staff member has no active booking to assign.");
      return;
    }

    setAssignmentDialog({
      sessionId: session.sessionId,
      currentStaffId: session.assignedStaffId,
    });
  };

  const headerToolbar = useMemo(
    () => (
      <div className="flex w-full justify-start lg:justify-end">
        <div className="flex flex-wrap justify-end gap-2">
        <Button className="h-9 rounded-lg bg-[#00236f] px-4 text-xs font-black text-white shadow-sm hover:bg-[#001a55]" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
        <Button variant="outline" className="h-9 rounded-lg border-slate-200 bg-white px-4 text-xs font-black text-slate-900 shadow-sm" onClick={exportReport}>
          <Download className="h-4 w-4" />
          Export report
        </Button>
        </div>
      </div>
    ),
    [exportReport],
  );

  useWorkspaceHeader({ toolbar: headerToolbar });

  return (
    <WorkspacePage className="max-w-none space-y-4 bg-[#f8fcff]">
      {hasError ? (
        <WorkspaceEmptyState title="Unable to load staff data" description={getErrorMessage((staffQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse)} />
      ) : (
        <section>
          <div className={cn("grid items-stretch gap-4 transition-[grid-template-columns] duration-300", detailsExpanded ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : "xl:grid-cols-[minmax(0,1fr)_3rem]")}>
            <div className="space-y-4 min-w-0">
            {showCreateForm ? (
              <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950">Add staff</h2>
                  <button className="text-sm font-bold text-slate-500" onClick={() => setShowCreateForm(false)}>Close</button>
                </div>
                <form
                  className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1.1fr_0.9fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createStaffMutation.mutate(createForm);
                  }}
                >
                  <input required value={createForm.fullName} onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))} placeholder="Full name" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300" />
                  <input required value={createForm.phone} onChange={(event) => setCreateForm((form) => ({ ...form, phone: event.target.value }))} placeholder="10-digit phone" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300" />
                  <input required type="email" value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} placeholder="Email" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300" />
                  <input required type="password" value={createForm.password} onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))} placeholder="Password" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300" />
                  <Button type="submit" disabled={createStaffMutation.isPending} className="h-11 rounded-lg bg-[#00236f] px-6 font-black text-white">
                    {createStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Save
                  </Button>
                </form>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <MetricCard icon={Users} label="Total staff" value={totalDisplay} detail="All staff" tone="blue" />
              <MetricCard icon={UserRound} label="Available" value={availableCount} detail="Ready" tone="green" />
              <MetricCard icon={Timer} label="Busy" value={busyCount} detail="In service" tone="amber" />
            </div>

            <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Team performance</h2>
                <select
                  value={performanceStaffId}
                  onChange={(event) => setPerformanceStaffId(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="ALL">All staff</option>
                  {staffRows.map((staff) => (
                    <option key={staff.staffId} value={staff.staffId}>{staff.staffName}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr] xl:items-center">
                <div>
                  <div className="mb-6 inline-flex rounded-lg border border-slate-100 bg-slate-50 p-1">
                    {[ { label: "Day", value: "DAY" }, { label: "Week", value: "WEEK" }, { label: "Month", value: "MONTH" } ].map((item) => (
                      <button key={item.value} onClick={() => setPerformancePeriod(item.value as any)} className={`h-9 rounded-md px-6 text-sm font-bold ${item.value === performancePeriod ? "bg-[#00236f] text-white shadow-sm" : "text-slate-600"}`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <PerformanceItem icon={CalendarClock} label="Completed bookings" value={performanceCompletedBookings} change="" />
                    <PerformanceItem icon={CheckCircle2} label="Revenue" value={formatCompactRevenue(performanceRevenue)} change="" />
                    <PerformanceItem icon={Star} label="Average rating" value={formatRating(performanceStaff?.rating ?? averageRating(staffRows))} change="" />
                    <PerformanceItem icon={Timer} label="On-time rate" value={`${performanceOnTimeRate}%`} change="" />
                  </div>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={176}>
                    <BarChart data={performanceChartData} barGap={8}>
                      <CartesianGrid stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(value) => `${value}M`} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="bookings" fill="#bae6fd" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="right" dataKey="revenue" fill="#0b2f75" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <h2 className="text-lg font-black text-slate-950">Staff list</h2>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setStaffPage(1);
                      }}
                      placeholder="Search name, phone, email..."
                      className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-300"
                    />
                  </div>
                  <select value={statusFilter} onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setStaffPage(1);
                  }} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none">
                    <option value="ALL">All statuses</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="overloaded">Overloaded</option>
                    <option value="offline">Offline</option>
                  </select>
                  <select value={accountStatusFilter} onChange={(event) => {
                    setAccountStatusFilter(event.target.value);
                    setStaffPage(1);
                  }} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none">
                    <option value="ALL">All accounts</option>
                    <option value="ACTIVE">Active accounts</option>
                    <option value="BLOCKED">Blocked accounts</option>
                    <option value="INACTIVE">Inactive accounts</option>
                    <option value="UNKNOWN">Unknown status</option>
                  </select>
                </div>
              </div>
              <StaffTable
                rows={filteredRows}
                pagination={staffPagination}
                currentPage={staffPage}
                onPageChange={setStaffPage}
                selectedStaffId={selectedStaff?.staffId}
                onSelect={handleSelectStaff}
                onViewProfile={(staffId) => openStaffProfile(staffId, "view")}
                onEditProfile={(staffId) => openStaffProfile(staffId, "edit")}
                onOpenAssignment={(staffId) => {
                  const row = staffRows.find((item) => item.staffId === staffId);
                  if (row) openAssignmentForRow(row);
                }}
                onDeleteStaff={setDeleteStaffId}
              />
            </Card>

            </div>

            <QuickDetailPanel
              staff={selectedStaff}
              expanded={detailsExpanded}
              onToggle={() => setDetailsExpanded((prev) => !prev)}
              onClose={() => setDetailsExpanded(false)}
              onViewProfile={(staffId) => openStaffProfile(staffId, "view")}
              onEditProfile={(staffId) => openStaffProfile(staffId, "edit")}
              onOpenAssignment={(staffId) => {
                const row = staffRows.find((item) => item.staffId === staffId);
                if (row) openAssignmentForRow(row);
              }}
              onOpenBooking={(session) => setBookingDialogSession(session)}
              onOpenAssignmentForSession={(session) => {
                setAssignmentDialog({
                  sessionId: session.sessionId,
                  currentStaffId: session.assignedStaffId,
                });
              }}
              onDeleteStaff={setDeleteStaffId}
              isFetching={isFetching}
            />
          </div>

        </section>
      )}
      <StaffProfileDialog
        staff={profileStaff}
        mode={profileDialog?.mode ?? "view"}
        open={Boolean(profileDialog)}
        onOpenChange={(open) => {
          if (!open) setProfileDialog(null);
        }}
        onSubmit={(payload) => {
          if (!profileStaff) return;
          updateStaffMutation.mutate({ staffId: profileStaff.staffId, payload });
        }}
        submitting={updateStaffMutation.isPending}
      />
      <Dialog open={Boolean(bookingDialogSession)} onOpenChange={(open) => { if (!open) setBookingDialogSession(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
          {bookingDialogSession ? (
            <BookingDetailDialog session={bookingDialogSession} onClose={() => setBookingDialogSession(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
      <ManagerStaffAssignmentDialog
        open={Boolean(assignmentDialog)}
        onOpenChange={(open) => {
          if (!open) setAssignmentDialog(null);
        }}
        sessionId={assignmentDialog?.sessionId ?? ""}
        currentStaffId={assignmentDialog?.currentStaffId}
      />
      <AlertDialog open={Boolean(deleteTargetStaff)} onOpenChange={(open) => { if (!open) setDeleteStaffId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetStaff
                ? `Are you sure you want to delete ${deleteTargetStaff.staffName}? This will mark the account as deleted.`
                : "Are you sure you want to delete this staff member?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStaffMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteStaffMutation.isPending || !deleteTargetStaff}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTargetStaff) return;
                deleteStaffMutation.mutate(deleteTargetStaff.staffId);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  detail: string;
  tone: "blue" | "green" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];
  
  const dot = {
    blue: "bg-slate-300",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
  }[tone];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {detail}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PerformanceItem({ icon: Icon, label, value, change }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; change: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Icon className="h-3.5 w-3.5" /></span>
        {label}
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      {change ? <p className="mt-1 text-xs font-bold text-emerald-600">{change}</p> : null}
    </div>
  );
}

function StaffTable({
  rows,
  pagination,
  currentPage,
  onPageChange,
  selectedStaffId,
  onSelect,
  onViewProfile,
  onEditProfile,
  onOpenAssignment,
  onDeleteStaff,
}: {
  rows: StaffRow[];
  pagination?: PaginationMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedStaffId?: string;
  onSelect: (staffId: string) => void;
  onViewProfile: (staffId: string) => void;
  onEditProfile: (staffId: string) => void;
  onOpenAssignment: (staffId: string) => void;
  onDeleteStaff: (staffId: string) => void;
}) {
  const total = pagination?.total ?? rows.length;
  const pageSize = pagination?.limit ?? rows.length;
  const totalPages = pagination?.totalPages ?? (rows.length > 0 ? 1 : 0);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : start + rows.length - 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[24%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Contact & account</th>
              <th className="px-4 py-2">Current status</th>
              <th className="px-4 py-2">Booking</th>
              <th className="px-4 py-2">Weekly KPI</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr key={row.staffId} className={`border-t border-slate-100 ${selectedStaffId === row.staffId ? "bg-cyan-50/35" : "bg-white"}`}>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => onSelect(row.staffId)} className="flex items-center gap-2 text-left">
                      <Avatar name={row.staffName} src={row.avatarUrl} />
                      <span className="text-xs font-black text-slate-950">{row.staffName}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    <p>{row.email}</p>
                    <p className="mt-0.5">{row.phone}</p>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="font-black text-[#0067a8]">{row.activeSessions.length}</span>
                    <span className="text-slate-500"> active</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-xs font-black text-slate-900">{row.kpiPercent}%</span>
                      <Progress value={row.kpiPercent} className="h-1.5 w-24 bg-slate-100" />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-slate-900">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {formatRating(row.rating)}
                      <span className="font-normal text-slate-500">({row.reviewCount})</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <IconButton icon={Eye} label="View profile" onClick={() => onViewProfile(row.staffId)} />
                      <IconButton icon={Edit3} label="Edit profile" onClick={() => onEditProfile(row.staffId)} />
                      <StaffRowActionMenu
                        onTransfer={() => onOpenAssignment(row.staffId)}
                        onDelete={() => onDeleteStaff(row.staffId)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
        <span>{total > 0 ? `${start}-${end} of ${total} staff` : "0 staff"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {"<"}
          </button>
          <button type="button" className="h-8 min-w-8 rounded-lg border bg-[#00236f] px-3 text-sm font-black text-white">
            {currentPage}
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={totalPages === 0 || currentPage >= totalPages}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {">"}
          </button>
        </div>
        <div className="hidden items-center gap-2">
          <button className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-400">‹</button>
          <button className="h-8 w-8 rounded-lg border bg-[#00236f] text-sm font-black text-white">1</button>
          <button className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-400">›</button>
        </div>
      </div>
    </div>
  );
}

function QuickDetailPanel({
  staff,
  expanded,
  onToggle,
  onClose,
  onViewProfile,
  onEditProfile,
  onOpenAssignment,
  onOpenBooking,
  onOpenAssignmentForSession,
  onDeleteStaff,
  isFetching,
}: {
  staff: StaffRow | null;
  expanded: boolean;
  onToggle: () => void;
  onClose?: () => void;
  onViewProfile: (staffId: string) => void;
  onEditProfile: (staffId: string) => void;
  onOpenAssignment: (staffId: string) => void;
  onOpenBooking: (session: OperationsQueueSession) => void;
  onOpenAssignmentForSession: (session: OperationsQueueSession) => void;
  onDeleteStaff: (staffId: string) => void;
  isFetching: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

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
  }, [expanded, onClose]);

  if (!staff) {
    return <Card className="rounded-lg border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Select a staff member to view details.</Card>;
  }
  const bookings = [...staff.activeSessions, ...staff.queuedSessions].slice(0, 2);

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="flex h-full min-h-[43rem] w-12 flex-col items-center justify-start gap-4 rounded-lg border-slate-200 bg-white py-6 text-slate-500 hover:text-slate-900 shadow-sm transition-all"
        onClick={onToggle}
      >
        <ChevronDown className="h-5 w-5 rotate-90 shrink-0" />
        <span className="writing-vertical-rl font-black tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Quick details</span>
      </Button>
    );
  }

  return (
    <Card ref={panelRef} className={cn("flex flex-col rounded-lg border-slate-200 bg-white p-6 shadow-sm", expanded ? "h-full min-h-[43rem]" : "h-fit")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-950">Quick details</h2>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs font-black shrink-0"
          onClick={onToggle}
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
          Collapse
        </Button>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Avatar name={staff.staffName} src={staff.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="font-black text-slate-950 truncate">{staff.staffName}</p>
          <StatusBadge status={staff.status} />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="h-10 flex-1 rounded-lg border-slate-200 bg-white text-sm font-bold" onClick={() => onViewProfile(staff.staffId)}>
          <UserRound className="h-4 w-4" />
          View profile
        </Button>
        <Button variant="outline" className="h-10 w-12 rounded-lg border-slate-200 bg-white p-0" onClick={() => onEditProfile(staff.staffId)}>
          <Edit3 className="h-4 w-4" />
        </Button>
        <StaffRowActionMenu
          align="end"
          onTransfer={() => onOpenAssignment(staff.staffId)}
          onDelete={() => onDeleteStaff(staff.staffId)}
        />
      </div>
      <div className="my-5 border-t border-slate-100" />

      <h3 className="font-black text-slate-950">Assigned bookings</h3>
      <div className="mt-3 space-y-3">
        {bookings.map((session) => (
          <div
            key={session.sessionId}
            onClick={() => onOpenBooking(session)}
            role="button"
            tabIndex={0}
            className="w-full rounded-lg border border-slate-100 bg-white px-3 py-3 text-left shadow-sm transition hover:border-cyan-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">#{session.vehiclePlate}</p>
                <p className="mt-1 text-xs text-slate-500">Customer: {session.customerName}</p>
              </div>
              <span className={cn(
                "rounded-md px-2 py-1 text-[11px] font-black",
                session.status === "IN_PROGRESS" || session.status === "CHECKED_IN"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700",
              )}>
                {getStatusLabel(session.status)}
              </span>
            </div>
            <Button
              variant="outline"
              className="mt-3 h-9 w-full rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-700"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAssignmentForSession(session);
              }}
            >
              Assign to another staff member
            </Button>
            <Link
              href="/manager/history"
              onClick={(event) => event.stopPropagation()}
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 text-xs font-black text-cyan-800 transition hover:bg-cyan-100"
            >
              Open booking history
            </Link>
          </div>
        ))}
        {bookings.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs font-semibold text-slate-400">No assigned bookings.</div> : null}
      </div>
      <Link href="/manager/history" className="mt-3 inline-flex text-sm font-bold text-[#0067a8]">
        View all ({staff.activeSessions.length + staff.queuedSessions.length}) ›
      </Link>

      <div className="my-5 border-t border-slate-100" />
      <h3 className="font-black text-slate-950">Recent reviews</h3>
      <div className="mt-4 grid grid-cols-[5rem_1fr] gap-4">
        <div>
          <p className="text-4xl font-black text-slate-950">{formatRating(staff.rating)} <Star className="inline h-7 w-7 fill-amber-400 text-amber-400" /></p>
          <p className="mt-2 text-xs text-slate-500">({staff.reviewCount} reviews)</p>
        </div>
        <div className="space-y-2">
          {[0, 0, 0, 0, 0].map((value, index) => (
            <div key={index} className="grid grid-cols-[1rem_1fr_2rem] items-center gap-2 text-xs text-slate-500">
              <span>{5 - index}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${value}%` }} /></div>
              <span>{value}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-400">
        No backend review details yet.
      </div>
      <div className="mt-auto flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
        {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {isFetching ? "Syncing backend" : "Backend data"}
      </div>
    </Card>
  );
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white px-2 py-2">
      <div className="text-base font-black text-slate-950">{value}</div>
      <div className="text-[10px] font-black uppercase text-slate-400">{label}</div>
    </div>
  );
}

function Avatar({ name, src, size = "md" }: { name: string; src?: string; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";
  if (src) {
    return <img src={src} alt={name} className={`${classes} shrink-0 rounded-full object-cover shadow-sm`} />;
  }

  return <div className={`${classes} flex shrink-0 items-center justify-center rounded-full bg-slate-950 font-black text-cyan-100 shadow-sm`}>{getInitials(name)}</div>;
}

function StatusBadge({ status }: { status: StaffStatus }) {
  const styles = {
    available: "bg-emerald-50 text-emerald-700",
    busy: "bg-amber-50 text-amber-700",
    overloaded: "bg-rose-50 text-rose-700",
    offline: "bg-slate-100 text-slate-500",
  }[status];
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${styles}`}>● {statusLabel(status)}</span>;
}

function IconButton({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title={label}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function StaffRowActionMenu({
  onTransfer,
  onDelete,
  align = "end",
}: {
  onTransfer: () => void;
  onDelete: () => void;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          title="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuItem onClick={onTransfer} className="cursor-pointer">
          <UserRound className="mr-2 h-4 w-4" />
          Assign booking to another staff member
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-rose-600 focus:text-rose-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete staff
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StaffProfileDialog({
  staff,
  mode,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  staff: StaffRow | null;
  mode: StaffDialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdateAdminStaffPayload) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);

  useEffect(() => {
    if (!staff) {
      setForm(EMPTY_STAFF_FORM);
      return;
    }

    setForm({
      fullName: staff.staffName,
      phone: staff.phone,
      email: staff.email,
      password: "",
      status: staff.accountStatus,
    });
  }, [staff, open, mode]);

  if (!staff) {
    return null;
  }

  const submitEdit = () => {
    const payload: UpdateAdminStaffPayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }
    
    if (form.status && form.status !== "UNKNOWN") {
      payload.status = form.status as AdminAccountStatus;
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{mode === "view" ? "Staff profile" : "Edit staff profile"}</DialogTitle>
          <DialogDescription>
            {mode === "view"
              ? "View contact information, performance, and current work status."
              : "Update the staff profile. Leave password blank if it should not change."}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" ? (
          <div className="grid gap-4 py-2 md:grid-cols-[minmax(220px,240px)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col items-center text-center">
                <Avatar name={staff.staffName} src={staff.avatarUrl} size="lg" />
                <p className="mt-4 break-words text-xl font-black leading-tight text-slate-950">{staff.staffName}</p>
                <div className="mt-2"><StatusBadge status={staff.status} /></div>
                <p className="mt-3 break-words text-sm font-semibold text-slate-500">{staff.role}</p>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <ProfileInfoCard label="Email" value={staff.email} className="sm:col-span-2" />
              <ProfileInfoCard label="Phone" value={staff.phone} />
              <ProfileInfoCard label="Weekly KPI" value={`${staff.kpiPercent}%`} />
              <ProfileInfoCard label="Rating" value={`${formatRating(staff.rating)} (${staff.reviewCount})`} />
              <ProfileInfoCard label="Active bookings" value={String(staff.activeSessions.length)} />
              <ProfileInfoCard label="Completed bookings" value={String(staff.completedSessions.length)} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-bold text-slate-700">Full name</label>
              <input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300"
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Phone</label>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300"
                  placeholder="0901234567"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Email</label>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300"
                  placeholder="staff@auracar.vn"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700">Account status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminAccountStatus | "UNKNOWN" }))}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-300"
                >
                  <option value="UNKNOWN" disabled>Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-2 grid gap-2">
              <label className="text-sm font-bold text-slate-700">New Password (optional)</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-300"
                placeholder="Leave blank to keep current password"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-lg border-slate-200" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          {mode === "edit" ? (
            <Button className="rounded-lg bg-[#00236f] text-white hover:bg-[#001a55]" onClick={submitEdit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileInfoCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-slate-200 bg-white p-4", className)}>
      <p className="text-xs font-black uppercase leading-snug tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function buildStaffRows(staffOptions: StaffOption[], sessions: OperationsQueueSession[], accounts: AdminAccount[], kpis: StaffKpiItem[]): StaffRow[] {
  const kpiMap = new Map(kpis.map((kpi) => [kpi.staffId, kpi]));
  const staffOptionMap = new Map(staffOptions.map((staff) => [staff.staffId, staff]));

  return accounts.map((account) => {
    const staff = staffOptionMap.get(account.accountId);
    const kpi = kpiMap.get(account.accountId);
    const totalSessions = sessions.filter((session) => session.assignedStaffId === account.accountId || session.assignedStaff?.some((s) => s.staffId === account.accountId));
    const activeSessions = totalSessions.filter((session) => session.status === "CHECKED_IN" || session.status === "IN_PROGRESS");
    const queuedSessions = totalSessions.filter((session) => session.status === "QUEUED");
    const completedSessions = totalSessions.filter((session) => session.status === "COMPLETED");
    const role = account.role;
    const activeCount = activeSessions.length + queuedSessions.length;
    const isInactive = account.status !== "ACTIVE";
    const status: StaffStatus = isInactive ? "offline" : activeCount >= 4 ? "overloaded" : activeCount > 0 ? "busy" : "available";
    return {
      staffId: account.accountId,
      staffName: account.fullName ?? staff?.staffName ?? "Unknown staff",
      email: account.email ?? "Not provided",
      phone: formatPhone(account.phone) ?? "Not provided",
      role,
      status,
      activeSessions,
      queuedSessions,
      completedSessions,
      totalSessions,
      rating: null,
      reviewCount: 0,
      kpiPercent: clampPercent(kpi?.kpiProgressPercent ?? 0),
      accountStatus: account.status ?? "UNKNOWN",
    };
  });
}

function buildPerformanceChartData(sessions: OperationsQueueSession[]) {
  const grouped = weekDays.map((day) => ({ day, bookings: 0, revenue: 0 }));

  sessions.forEach((session) => {
    const date = new Date(session.bookingDate);
    const dayIndex = Number.isNaN(date.getTime()) ? -1 : (date.getDay() + 5) % 7;
    if (dayIndex < 0) {
      return;
    }

    grouped[dayIndex].bookings += 1;
    grouped[dayIndex].revenue += Math.round((session.feeAmount ?? 0) / 1_000_000);
  });

  return grouped;
}

function formatCompactRevenue(value: number) {
  return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M`;
}

function averageRating(rows: StaffRow[]) {
  const ratings = rows.map((row) => row.rating).filter((rating): rating is number => rating !== null);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function averageKpi(rows: StaffRow[]) {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.kpiPercent, 0) / rows.length);
}

function formatRating(value: number | null) {
  return value === null ? "--" : formatIntegerRating(value);
}

function BookingDetailDialog({
  session,
  onClose,
}: {
  session: OperationsQueueSession;
  onClose: () => void;
}) {
  const serviceName = session.servicePackage ?? session.packageId ?? "Wash package";

  return (
    <div className="bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-cyan-700">Wash session history</p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">#{session.vehiclePlate}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {session.customerName} · {session.assignedStaffName ?? "Unassigned"}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <InfoCard label="Service" value={serviceName} />
        <InfoCard label="Phone" value={session.customerPhone || "Not available"} />
        <InfoCard label="Appointment" value={`${session.bookingDate} ${session.bookingTime}`} />
        <InfoCard label="Duration" value={session.estimatedDurationMinutes != null ? `${session.estimatedDurationMinutes} min` : "--"} />
        <InfoCard label="Check-in" value={formatDateTime(session.checkedInAt)} />
        <InfoCard label="Completed" value={formatDateTime(session.completedAt)} />
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
        <span className="font-black text-slate-900">{getStatusLabel(session.status)}</span>
        {session.rating != null ? ` · Rating ${session.rating}/5` : ""}
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/manager/history"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          Open booking history
        </Link>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-US") : "Not available";
}

function matchesStaff(row: StaffRow, search: string, statusFilter: string, accountStatusFilter: string) {
  const normalized = search.trim().toLowerCase();
  const matchesSearch = !normalized || [row.staffName, row.email, row.phone].some((value) => value.toLowerCase().includes(normalized));
  const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
  const matchesAccountStatus = accountStatusFilter === "ALL" || row.accountStatus === accountStatusFilter;
  return matchesSearch && matchesStatus && matchesAccountStatus;
}

function statusLabel(status: StaffStatus) {
  return { available: "Available", busy: "Busy", overloaded: "Overloaded", offline: "Offline" }[status];
}

function getStatusLabel(status: WashSessionStatus) {
  return {
    PENDING: "Pending",
    QUEUED: "Waiting check-in",
    CHECKED_IN: "Checked in",
    IN_PROGRESS: "Washing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  }[status];
}

function formatPhone(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getInitials(fullName: string) {
  return fullName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "S";
}
