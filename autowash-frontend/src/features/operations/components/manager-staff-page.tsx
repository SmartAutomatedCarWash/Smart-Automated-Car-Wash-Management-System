"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CalendarClock, Car, ClipboardCheck, Clock3, Edit3, Plus, Repeat2, Star, Trash2, UserCheck, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { Progress } from "@/shared/ui/ui/progress";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { getActiveStaffOptions, getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useManagerNotificationStore } from "@/features/operations/store/manager-notification.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, StaffOption } from "@/entities/operations";

type StaffShift = "Sáng" | "Chiều" | "Tối" | "Nghỉ";

type StaffRecord = {
  id: string;
  name: string;
  phone: string;
  title: string;
  shift: StaffShift;
  status: "Đang hoạt động" | "Tạm nghỉ";
  kpiTarget: number;
  rating: number;
  reviews: number;
  bay: string;
};

type AssignmentOverride = Record<string, Pick<StaffRecord, "id" | "name">>;
type DailyStaffPlan = Pick<StaffRecord, "shift" | "status" | "kpiTarget" | "bay">;
type ShiftPlanOverrides = Record<string, Record<string, DailyStaffPlan>>;

const DEFAULT_STAFF_DETAILS: Record<string, Omit<StaffRecord, "id" | "name">> = {
  "demo-staff-minh": {
    phone: "0908 111 222",
    title: "Senior wash specialist",
    shift: "Sáng",
    status: "Đang hoạt động",
    kpiTarget: 8,
    rating: 4.8,
    reviews: 126,
    bay: "Bay A1",
  },
  "demo-staff-linh": {
    phone: "0908 333 444",
    title: "Interior care lead",
    shift: "Sáng",
    status: "Đang hoạt động",
    kpiTarget: 7,
    rating: 4.9,
    reviews: 142,
    bay: "Bay A2",
  },
  "demo-staff-khoa": {
    phone: "0908 555 666",
    title: "Quick wash operator",
    shift: "Chiều",
    status: "Đang hoạt động",
    kpiTarget: 6,
    rating: 4.6,
    reviews: 88,
    bay: "Bay B1",
  },
};

const SHIFT_OPTIONS: StaffShift[] = ["Sáng", "Chiều", "Tối", "Nghỉ"];

export function ManagerStaffPage() {
  const staffQuery = useQuery({
    queryKey: ["manager-operations", "staff"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });
  const queueQuery = useQuery({
    queryKey: ["manager-operations", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });

  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [assignmentOverrides, setAssignmentOverrides] = useState<AssignmentOverride>({});
  const [shiftPlanOverrides, setShiftPlanOverrides] = useState<ShiftPlanOverrides>({});
  const [editingStaffId, setEditingStaffId] = useState("");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [shiftStaffId, setShiftStaffId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    title: "Wash specialist",
    shift: "Sáng" as StaffShift,
    kpiTarget: "6",
    bay: "Bay A1",
  });
  const [shiftForm, setShiftForm] = useState({ shift: "Sáng" as StaffShift, kpiTarget: "6", bay: "Bay A1" });
  const pushManagerNotification = useManagerNotificationStore((state) => state.push);

  const baseSessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const sessions = useMemo(
    () =>
      baseSessions.map((session) => {
        const override = assignmentOverrides[session.sessionId];
        return override
          ? {
              ...session,
              assignedStaffId: override.id,
              assignedStaffName: override.name,
            }
          : session;
      }),
    [assignmentOverrides, baseSessions],
  );
  const sessionsForSelectedDate = useMemo(() => sessions.filter((session) => isSameDate(session.bookingDate, selectedDate)), [selectedDate, sessions]);

  useEffect(() => {
    if (!staffQuery.data?.length) return;

    setStaffRecords((current) => mergeStaffRecords(current, staffQuery.data ?? []));
  }, [staffQuery.data]);

  useEffect(() => {
    if (staffRecords.length === 0) return;
    setShiftStaffId((current) => current || staffRecords[0]?.id || "");
    setAssignStaffId((current) => current || staffRecords[0]?.id || "");
  }, [staffRecords]);

  useEffect(() => {
    if (sessionsForSelectedDate.length === 0) {
      setSessionId("");
      return;
    }

    setSessionId((current) => {
      if (sessionsForSelectedDate.some((session) => session.sessionId === current)) return current;
      return sessionsForSelectedDate.find((session) => session.status !== "COMPLETED" && session.status !== "CANCELLED")?.sessionId || sessionsForSelectedDate[0]?.sessionId || "";
    });
  }, [sessionsForSelectedDate]);

  const staffStats = useMemo(
    () =>
      staffRecords.map((staff) => {
        const dailyPlan = getDailyStaffPlan(staff, selectedDate, shiftPlanOverrides);
        const staffForDate = { ...staff, ...dailyPlan };
        const assigned = sessionsForSelectedDate.filter((session) => session.assignedStaffId === staff.id);
        const washing = assigned.filter((session) => session.status === "IN_PROGRESS");
        const ready = assigned.filter((session) => session.status === "QUEUED" || session.status === "CHECKED_IN");
        const completed = assigned.filter((session) => session.status === "COMPLETED");
        const progress = Math.min(100, Math.round((completed.length / Math.max(staffForDate.kpiTarget, 1)) * 100));
        return { staff: staffForDate, assigned, washing, ready, completed, progress };
      }),
    [selectedDate, sessionsForSelectedDate, shiftPlanOverrides, staffRecords],
  );

  const activeStaffCount = staffStats.filter(({ staff }) => staff.status === "Đang hoạt động" && staff.shift !== "Nghỉ").length;
  const washingCount = sessionsForSelectedDate.filter((session) => session.status === "IN_PROGRESS").length;
  const completedCount = sessionsForSelectedDate.filter((session) => session.status === "COMPLETED").length;
  const selectedShiftStaff = staffRecords.find((staff) => staff.id === shiftStaffId);
  const selectedShiftPlan = useMemo(
    () => (selectedShiftStaff ? getDailyStaffPlan(selectedShiftStaff, selectedDate, shiftPlanOverrides) : null),
    [selectedDate, selectedShiftStaff, shiftPlanOverrides],
  );
  const activeShiftCount = staffStats.filter(({ staff }) => staff.shift !== "Nghỉ").length;

  useEffect(() => {
    if (!selectedShiftPlan) return;
    setShiftForm({ shift: selectedShiftPlan.shift, kpiTarget: String(selectedShiftPlan.kpiTarget), bay: selectedShiftPlan.bay });
  }, [selectedShiftPlan]);

  const handleSaveStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = staffForm.name.trim();
    const kpiTarget = Number(staffForm.kpiTarget);

    if (!name || !Number.isFinite(kpiTarget) || kpiTarget <= 0) {
      toast.error("Vui lòng nhập tên và KPI hợp lệ.");
      pushManagerNotification({
        kind: "error",
        title: "Thêm/sửa staff không thành công",
        message: "Tên nhân viên hoặc KPI xe/ngày chưa hợp lệ. Vui lòng kiểm tra lại form.",
        target: "Manager",
        href: "/manager/staff",
      });
      return;
    }

    if (editingStaffId) {
      setStaffRecords((records) =>
        records.map((staff) =>
          staff.id === editingStaffId
            ? { ...staff, name, phone: staffForm.phone, title: staffForm.title, shift: staffForm.shift, kpiTarget, bay: staffForm.bay }
            : staff,
        ),
      );
      toast.success("Đã cập nhật thông tin nhân viên.");
      pushManagerNotification({
        kind: "success",
        title: "Đã cập nhật thông tin staff",
        message: `${name} đã được cập nhật thông tin, ca mặc định và KPI.`,
        target: name,
        href: "/manager/staff",
      });
    } else {
      const id = `local-staff-${Date.now()}`;
      setStaffRecords((records) => [
        ...records,
        {
          id,
          name,
          phone: staffForm.phone,
          title: staffForm.title,
          shift: staffForm.shift,
          status: "Đang hoạt động",
          kpiTarget,
          rating: 4.7,
          reviews: 0,
          bay: staffForm.bay,
        },
      ]);
      setAssignStaffId(id);
      setShiftStaffId(id);
      toast.success("Đã thêm nhân viên mới vào ca.");
      pushManagerNotification({
        kind: "success",
        title: "Đã thêm staff mới",
        message: `${name} đã được thêm vào Staff Management với KPI ${kpiTarget} xe/ngày.`,
        target: name,
        href: "/manager/staff",
      });
    }

    resetStaffForm();
    setStaffDialogOpen(false);
  };

  const handleOpenAddStaff = () => {
    resetStaffForm();
    setStaffDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffRecord) => {
    setEditingStaffId(staff.id);
    setStaffForm({
      name: staff.name,
      phone: staff.phone,
      title: staff.title,
      shift: staff.shift,
      kpiTarget: String(staff.kpiTarget),
      bay: staff.bay,
    });
    setStaffDialogOpen(true);
  };

  const handleDeleteStaff = (staffId: string) => {
    const staff = staffRecords.find((record) => record.id === staffId);
    const activeSessions = sessions.filter((session) => session.assignedStaffId === staffId && ["CHECKED_IN", "IN_PROGRESS", "QUEUED"].includes(session.status));

    if (activeSessions.length > 0) {
      toast.error("Nhân viên còn session đang xử lý. Hãy chuyển ca trước khi xóa.");
      pushManagerNotification({
        kind: "error",
        title: "Xóa staff không thành công",
        message: `${staff?.name ?? "Nhân viên"} vẫn còn session đang xử lý, cần chuyển ca trước khi xóa.`,
        target: staff?.name ?? "Manager",
        href: "/manager/staff",
      });
      return;
    }

    setStaffRecords((records) => records.filter((record) => record.id !== staffId));
    if (editingStaffId === staffId) resetStaffForm();
    toast.success(`Đã xóa ${staff?.name ?? "nhân viên"} khỏi danh sách demo.`);
    pushManagerNotification({
      kind: "warning",
      title: "Đã xóa staff khỏi danh sách",
      message: `${staff?.name ?? "Nhân viên"} đã được xóa khỏi danh sách demo.`,
      target: staff?.name ?? "Manager",
      href: "/manager/staff",
    });
  };

  const handleUpdateShift = () => {
    const target = Number(shiftForm.kpiTarget);
    if (!shiftStaffId || !Number.isFinite(target) || target <= 0) {
      toast.error("Vui lòng chọn nhân viên và KPI hợp lệ.");
      pushManagerNotification({
        kind: "error",
        title: "Cập nhật ca không thành công",
        message: "Nhân viên hoặc KPI chưa hợp lệ. Vui lòng kiểm tra lại cấu hình ca.",
        target: "Manager",
        href: "/manager/staff",
      });
      return;
    }

    setShiftPlanOverrides((current) => ({
      ...current,
      [selectedDate]: {
        ...(current[selectedDate] ?? {}),
        [shiftStaffId]: {
          shift: shiftForm.shift,
          kpiTarget: target,
          bay: shiftForm.bay,
          status: shiftForm.shift === "Nghỉ" ? "Tạm nghỉ" : "Đang hoạt động",
        },
      },
    }));
    toast.success(`Đã cập nhật ca làm và KPI cho ngày ${formatDate(selectedDate)}.`);
    pushManagerNotification({
      kind: "shift",
      title: "Đã cập nhật ca làm staff",
      message: `${selectedShiftStaff?.name ?? "Nhân viên"} được chuyển sang ca ${shiftForm.shift}, KPI ${target} xe/ngày vào ${formatDate(selectedDate)}.`,
      target: selectedShiftStaff?.name ?? "Manager",
      href: "/manager/staff",
    });
  };

  const handleAssignSession = () => {
    const staff = staffRecords.find((record) => record.id === assignStaffId);
    const session = sessionsForSelectedDate.find((item) => item.sessionId === sessionId);
    if (!staff || !session) {
      toast.error("Vui lòng chọn session và nhân viên.");
      pushManagerNotification({
        kind: "error",
        title: "Assign session không thành công",
        message: "Chưa chọn đủ session hoặc nhân viên để phân công.",
        target: "Manager",
        href: "/manager/staff",
      });
      return;
    }

    setAssignmentOverrides((current) => ({ ...current, [session.sessionId]: { id: staff.id, name: staff.name } }));
    toast.success(`Đã assign ${session.vehiclePlate} cho ${staff.name}.`);
    pushManagerNotification({
      kind: "success",
      title: "Đã assign ca rửa",
      message: `${session.vehiclePlate} đã được assign cho ${staff.name}.`,
      target: staff.name,
      plate: session.vehiclePlate,
      href: "/manager/staff",
    });
  };

  const resetStaffForm = () => {
    setEditingStaffId("");
    setStaffForm({ name: "", phone: "", title: "Wash specialist", shift: "Sáng", kpiTarget: "6", bay: "Bay A1" });
  };

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Current shift</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-500">Xem lịch làm, giao ca sáng/chiều/tối, chuyển ca, KPI và phân công session.</p>
        </div>
        <div className="relative z-50 flex flex-wrap items-center gap-2">
          <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="Chọn ngày xem trạng thái staff" buttonClassName="h-9" align="right" />
          <Button className="h-9 rounded-xl bg-[#00236f] px-4 text-xs font-black text-white hover:bg-[#001b55]" onClick={handleOpenAddStaff}>
            <Plus className="h-4 w-4" /> Thêm nhân viên
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm"
            onClick={() => setSelectedDate(getTodayInputValue())}
          >
            Hôm nay
          </Button>
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={() => queueQuery.refetch()} disabled={queueQuery.isFetching}>
            Làm mới
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Staff active" value={activeStaffCount} icon={Users} />
        <Metric label="Có ca hôm nay" value={activeShiftCount} icon={CalendarClock} />
        <Metric label="Đang rửa" value={washingCount} icon={Car} />
        <Metric label="Xe đã rửa" value={completedCount} icon={ClipboardCheck} />
      </div>

      {staffQuery.isError || queueQuery.isError ? (
        <WorkspaceEmptyState title="Không thể tải dữ liệu staff" description={getDisplayErrorMessage((staffQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse)} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <ShiftScheduleBoard staffStats={staffStats} selectedDate={selectedDate} />
            <div className="grid gap-3 lg:grid-cols-2">
              {staffStats.map((item) => (
                <StaffCard key={item.staff.id} {...item} selectedDate={selectedDate} onEdit={handleEditStaff} onDelete={handleDeleteStaff} />
              ))}
            </div>
          </div>

          <Card className="h-fit rounded-3xl border-cyan-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Repeat2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">Staff Management</p>
                <p className="text-xs text-slate-500">Giao/chuyển ca, set KPI, assign session.</p>
              </div>
            </div>

            <Button variant="outline" className="mt-4 h-10 w-full rounded-xl border-cyan-100 bg-cyan-50/60 text-xs font-black text-cyan-800 hover:bg-cyan-100" onClick={handleOpenAddStaff}>
              <Plus className="h-4 w-4" /> Thêm nhân viên mới
            </Button>

            <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-white p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Giao / chuyển ca theo ngày</p>
              <p className="text-[11px] font-semibold text-slate-500">Áp dụng cho {formatDate(selectedDate)}.</p>
              <CompactSelect label="Nhân viên" value={shiftStaffId} options={staffRecords.map((staff) => staff.id)} labels={Object.fromEntries(staffRecords.map((staff) => [staff.id, staff.name]))} onChange={setShiftStaffId} />
              <div className="grid grid-cols-2 gap-2">
                <CompactSelect label="Ca mới" value={shiftForm.shift} options={SHIFT_OPTIONS} onChange={(value) => setShiftForm((form) => ({ ...form, shift: value as StaffShift }))} />
                <CompactInput label="KPI" value={shiftForm.kpiTarget} onChange={(value) => setShiftForm((form) => ({ ...form, kpiTarget: value }))} type="number" />
              </div>
              <CompactInput label="Khu vực" value={shiftForm.bay} onChange={(value) => setShiftForm((form) => ({ ...form, bay: value }))} />
              <Button variant="outline" className="h-9 w-full rounded-xl text-xs font-black" onClick={handleUpdateShift}>
                Cập nhật ca & KPI
              </Button>
            </div>

            <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-white p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Assign session</p>
              <CompactSelect
                label="Session"
                value={sessionId}
                options={sessionsForSelectedDate.map((session) => session.sessionId)}
                labels={Object.fromEntries(sessionsForSelectedDate.map((session) => [session.sessionId, `${session.vehiclePlate} - ${statusLabel(session.status)}`]))}
                onChange={setSessionId}
              />
              <CompactSelect label="Assign cho" value={assignStaffId} options={staffRecords.map((staff) => staff.id)} labels={Object.fromEntries(staffRecords.map((staff) => [staff.id, staff.name]))} onChange={setAssignStaffId} />
              <Button className="h-9 w-full rounded-xl bg-cyan-600 text-xs font-black text-white hover:bg-cyan-700" onClick={handleAssignSession}>
                Assign ca rửa
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={staffDialogOpen} onOpenChange={(open) => {
        setStaffDialogOpen(open);
        if (!open) resetStaffForm();
      }}>
        <DialogContent className="max-w-[30rem] rounded-3xl border-cyan-100 bg-white p-0 shadow-[0_28px_90px_rgba(6,17,26,0.22)]">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#ffffff_0%,#f3feff_48%,#fff8ed_100%)] p-5">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-xl font-black text-slate-950">{editingStaffId ? "Sửa nhân viên" : "Thêm nhân viên"}</DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500">
                {editingStaffId ? "Cập nhật thông tin, ca mặc định, KPI và khu vực làm việc." : "Tạo nhân viên mới cho khu vực vận hành demo."}
              </DialogDescription>
            </DialogHeader>

            <form className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-white/86 p-4 shadow-sm" onSubmit={handleSaveStaff}>
              <CompactInput label="Tên" value={staffForm.name} onChange={(value) => setStaffForm((form) => ({ ...form, name: value }))} placeholder="VD: Nam Nguyen" />
              <CompactInput label="SĐT" value={staffForm.phone} onChange={(value) => setStaffForm((form) => ({ ...form, phone: value }))} placeholder="090..." />
              <CompactInput label="Vị trí" value={staffForm.title} onChange={(value) => setStaffForm((form) => ({ ...form, title: value }))} />
              <div className="grid grid-cols-2 gap-2">
                <CompactSelect label="Ca" value={staffForm.shift} options={SHIFT_OPTIONS} onChange={(value) => setStaffForm((form) => ({ ...form, shift: value as StaffShift }))} />
                <CompactInput label="KPI xe/ngày" value={staffForm.kpiTarget} onChange={(value) => setStaffForm((form) => ({ ...form, kpiTarget: value }))} type="number" />
              </div>
              <CompactInput label="Khu vực" value={staffForm.bay} onChange={(value) => setStaffForm((form) => ({ ...form, bay: value }))} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="h-10 flex-1 rounded-xl text-xs font-black" onClick={() => setStaffDialogOpen(false)}>
                  Hủy
                </Button>
                <Button className="h-10 flex-[1.4] rounded-xl bg-[#00236f] text-xs font-black text-white hover:bg-[#001b55]">
                  <Plus className="h-4 w-4" /> {editingStaffId ? "Lưu thay đổi" : "Thêm nhân viên"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

function StaffCard({
  staff,
  washing,
  ready,
  completed,
  assigned,
  progress,
  selectedDate,
  onEdit,
  onDelete,
}: {
  staff: StaffRecord;
  washing: OperationsQueueSession[];
  ready: OperationsQueueSession[];
  completed: OperationsQueueSession[];
  assigned: OperationsQueueSession[];
  progress: number;
  selectedDate: string;
  onEdit: (staff: StaffRecord) => void;
  onDelete: (staffId: string) => void;
}) {
  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950">{staff.name}</p>
            <p className="truncate text-xs font-semibold text-emerald-600">{staff.status}</p>
            <p className="truncate text-xs text-slate-500">{staff.title}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900" type="button" onClick={() => onEdit(staff)} aria-label={`Sửa ${staff.name}`}>
            <Edit3 className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" type="button" onClick={() => onDelete(staff.id)} aria-label={`Xóa ${staff.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Đã rửa" value={completed.length} />
        <MiniStat label="Đang rửa" value={washing.length} tone="amber" />
        <MiniStat label="Chờ/Bắt đầu" value={ready.length} tone="cyan" />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-700">KPI {formatDate(selectedDate)}</span>
          <span className="font-black text-[#00236f]">
            {completed.length}/{staff.kpiTarget} xe
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-2 bg-slate-200" />
        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>{staff.shift} · {staff.bay}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Pill icon={Star} label={`${staff.rating.toFixed(1)} (${staff.reviews} đánh giá)`} />
        <Pill icon={Award} label={staff.phone || "Chưa có SĐT"} />
      </div>

      <div className="mt-4 space-y-2">
        {assigned.filter((session) => session.status !== "COMPLETED" && session.status !== "CANCELLED").slice(0, 3).map((session) => (
          <div key={session.sessionId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
            <div>
              <p className="font-black text-slate-800">{session.vehiclePlate}</p>
              <p className="text-slate-500">{session.servicePackage ?? "Gói rửa"} · {session.bookingTime}</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 font-bold text-slate-600">{statusLabel(session.status)}</span>
          </div>
        ))}
        {assigned.filter((session) => session.status !== "COMPLETED" && session.status !== "CANCELLED").length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-400">Đang rảnh, có thể nhận ca mới.</p>
        ) : null}
      </div>
    </Card>
  );
}

function ShiftScheduleBoard({
  staffStats,
  selectedDate,
}: {
  staffStats: Array<{
    staff: StaffRecord;
    assigned: OperationsQueueSession[];
    washing: OperationsQueueSession[];
    ready: OperationsQueueSession[];
    completed: OperationsQueueSession[];
    progress: number;
  }>;
  selectedDate: string;
}) {
  const byShift = SHIFT_OPTIONS.map((shift) => ({
    shift,
    staffItems: staffStats.filter(({ staff }) => staff.shift === shift),
  }));

  return (
    <Card className="rounded-3xl border-cyan-100 bg-white/92 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-black text-slate-950">Lịch làm staff</p>
            <p className="text-xs font-semibold text-slate-500">Theo dõi ca làm, khu vực, KPI và trạng thái ngày {formatDate(selectedDate)}.</p>
          </div>
        </div>
        <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">
          {staffStats.filter(({ staff }) => staff.shift !== "Nghỉ").length} nhân viên có ca
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {byShift.map(({ shift, staffItems }) => (
          <div key={shift} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${shiftTone(shift).icon}`}>
                  {shift === "Nghỉ" ? <Clock3 className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Ca {shift}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{shiftTimeLabel(shift)}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-black ${shiftTone(shift).badge}`}>{staffItems.length}</span>
            </div>

            <div className="mt-3 space-y-2">
              {staffItems.map(({ staff, assigned, washing, completed, progress }) => (
                <div key={staff.id} className="rounded-2xl border border-white bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{staff.name}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-500">{staff.bay} · KPI {completed.length}/{staff.kpiTarget}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${staff.status === "Đang hoạt động" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {staff.status === "Đang hoạt động" ? "Active" : "Off"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{washing.length} đang rửa · {assigned.length} tổng xe</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="mt-1.5 h-1.5 bg-slate-100" />
                </div>
              ))}

              {staffItems.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-5 text-center text-xs font-semibold text-slate-400">
                  Chưa có nhân viên trong ca này.
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Users }) {
  return (
    <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "cyan" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    cyan: "bg-cyan-50 text-cyan-700",
  }[tone];

  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: typeof Star; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-600">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function CompactSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select
        className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function mergeStaffRecords(current: StaffRecord[], staffOptions: StaffOption[]) {
  const currentById = new Map(current.map((staff) => [staff.id, staff]));
  const remoteRecords = staffOptions.map((staff, index) => {
    const fallback = {
      phone: "",
      title: "Wash specialist",
      shift: index % 2 === 0 ? "Sáng" : "Chiều",
      status: "Đang hoạt động",
      kpiTarget: 6,
      rating: 4.7,
      reviews: 0,
      bay: `Bay A${index + 1}`,
    } satisfies Omit<StaffRecord, "id" | "name">;

    return currentById.get(staff.staffId) ?? { id: staff.staffId, name: staff.staffName, ...(DEFAULT_STAFF_DETAILS[staff.staffId] ?? fallback) };
  });

  const localRecords = current.filter((staff) => staff.id.startsWith("local-staff-"));
  return [...remoteRecords, ...localRecords];
}

function getDailyStaffPlan(staff: StaffRecord, selectedDate: string, overrides: ShiftPlanOverrides): DailyStaffPlan {
  return overrides[selectedDate]?.[staff.id] ?? {
    shift: staff.shift,
    status: staff.status,
    kpiTarget: staff.kpiTarget,
    bay: staff.bay,
  };
}

function shiftTimeLabel(shift: StaffShift) {
  const labels: Record<StaffShift, string> = {
    Sáng: "07:00 - 12:00",
    Chiều: "12:00 - 17:00",
    Tối: "17:00 - 21:00",
    Nghỉ: "Không làm việc",
  };
  return labels[shift];
}

function shiftTone(shift: StaffShift) {
  const tones: Record<StaffShift, { icon: string; badge: string }> = {
    Sáng: {
      icon: "bg-cyan-50 text-cyan-700",
      badge: "bg-cyan-50 text-cyan-700",
    },
    Chiều: {
      icon: "bg-amber-50 text-amber-700",
      badge: "bg-amber-50 text-amber-700",
    },
    Tối: {
      icon: "bg-indigo-50 text-indigo-700",
      badge: "bg-indigo-50 text-indigo-700",
    },
    Nghỉ: {
      icon: "bg-slate-100 text-slate-500",
      badge: "bg-slate-100 text-slate-500",
    },
  };
  return tones[shift];
}

function statusLabel(status: OperationsQueueSession["status"]) {
  const labels: Record<OperationsQueueSession["status"], string> = {
    PENDING: "Chờ tạo",
    QUEUED: "Chờ check-in",
    CHECKED_IN: "Sẵn sàng",
    IN_PROGRESS: "Đang rửa",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return labels[status];
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
