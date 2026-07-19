"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  RadioTower,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getActiveStaffOptions, getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useManagerNotificationStore } from "@/features/operations/store/manager-notification.store";
import type { OperationsQueueSession, StaffOption } from "@/entities/operations";
import type { ApiErrorResponse } from "@/shared/types/api.types";

type ShiftKey = "morning" | "afternoon" | "evening";
type NotificationType = "reminder" | "note" | "priority" | "shift";
type AdminSubmissionType = "incident" | "leave";

type LeaveRequest = {
  id: string;
  staffName: string;
  shift: string;
  requestedDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

type ShiftSetting = {
  key: ShiftKey;
  name: string;
  time: string;
  capacity: string;
};

const DEFAULT_SHIFTS: ShiftSetting[] = [
  { key: "morning", name: "Ca sáng", time: "07:00 - 12:00", capacity: "4 staff" },
  { key: "afternoon", name: "Ca chiều", time: "12:00 - 17:00", capacity: "4 staff" },
  { key: "evening", name: "Ca tối", time: "17:00 - 21:00", capacity: "3 staff" },
];

const QUICK_TEMPLATES = [
  "Ưu tiên xe này trong hàng đợi, xử lý ngay khi bay trống.",
  "Kiểm tra kỹ nội thất và báo Manager nếu phát sinh sự cố.",
  "Nhắc khách đang chờ lâu, cập nhật tiến độ sau 10 phút.",
];

export function ManagerSettingsPage() {
  const getErrorMessage = useErrorMessage();
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [shiftSettings, setShiftSettings] = useState(DEFAULT_SHIFTS);
  const [messageType, setMessageType] = useState<NotificationType>("reminder");
  const [targetStaffId, setTargetStaffId] = useState("ALL");
  const [message, setMessage] = useState(QUICK_TEMPLATES[0]);
  const [prioritySessionId, setPrioritySessionId] = useState("");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "leave-minh-01",
      staffName: "Minh Tran",
      shift: "Morning shift",
      requestedDate: "2026-07-19",
      reason: "Family appointment, requesting one morning shift off.",
      status: "Pending",
    },
    {
      id: "leave-linh-01",
      staffName: "Linh Pham",
      shift: "Afternoon shift",
      requestedDate: "2026-07-20",
      reason: "Medical check-up, can hand over active sessions before 12:00.",
      status: "Pending",
    },
  ]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminSubmissionType, setAdminSubmissionType] = useState<AdminSubmissionType>("incident");
  const [adminSubmissionText, setAdminSubmissionText] = useState("");
  const pushGlobalManagerNotification = useManagerNotificationStore((state) => state.push);
  const managerNotifications = useManagerNotificationStore((state) => state.notifications);

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

  const staffOptions = staffQuery.data ?? [];
  const sessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const activeSessions = sessions.filter((session) => ["QUEUED", "CHECKED_IN", "IN_PROGRESS"].includes(session.status));
  const prioritySessions = activeSessions.filter((session) => session.notes?.toLowerCase().includes("vip") || session.feeAmount && session.feeAmount >= 220000);
  const selectedPrioritySession = activeSessions.find((session) => session.sessionId === prioritySessionId) ?? activeSessions[0];
  const hasError = staffQuery.isError || queueQuery.isError;
  const error = (staffQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse;

  const handleShiftChange = (key: ShiftKey, field: "time" | "capacity", value: string) => {
    setShiftSettings((current) =>
      current.map((shift) => (shift.key === key ? { ...shift, [field]: value } : shift)),
    );
  };

  const pushNotification = (notification: {
    type: NotificationType;
    title: string;
    message: string;
    target: string;
    priorityPlate?: string;
  }) => {
    pushGlobalManagerNotification({
      kind: notification.type === "priority" ? "priority" : notification.type === "shift" ? "shift" : "info",
      title: notification.title,
      message: notification.message,
      target: notification.target,
      plate: notification.priorityPlate,
      href: "/manager/settings",
    });
    toast.success(notification.title, { description: notification.message });
  };

  const handleSaveShiftSettings = () => {
    pushNotification({
      type: "shift",
      title: "Đã cập nhật cấu hình ca làm",
      message: `Áp dụng cho ngày ${formatDate(selectedDate)}: ${shiftSettings.map((shift) => `${shift.name} ${shift.time}`).join(", ")}.`,
      target: "Manager",
    });
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      toast.error("Vui lòng nhập nội dung thông báo.");
      pushGlobalManagerNotification({
        kind: "error",
        title: "Gửi thông báo không thành công",
        message: "Nội dung nhắc nhở/note đang trống. Manager cần nhập nội dung trước khi gửi.",
        target: "Manager",
        href: "/manager/settings",
      });
      return;
    }

    const targetName = targetStaffId === "ALL" ? "Tất cả staff" : staffOptions.find((staff) => staff.staffId === targetStaffId)?.staffName ?? "Nhân viên";
    pushNotification({
      type: messageType,
      title: messageType === "note" ? "Manager đã gửi note" : "Manager đã gửi nhắc nhở",
      message: cleanMessage,
      target: targetName,
    });
  };

  const handleMarkPriority = () => {
    if (!selectedPrioritySession) {
      toast.error("Chưa có xe đang vận hành để đánh dấu ưu tiên.");
      pushGlobalManagerNotification({
        kind: "error",
        title: "Đánh dấu xe ưu tiên không thành công",
        message: "Hiện chưa có xe đang vận hành để gửi thông báo ưu tiên.",
        target: "Manager",
        href: "/manager/settings",
      });
      return;
    }

    pushNotification({
      type: "priority",
      title: "Thông báo xe ưu tiên",
      message: `${selectedPrioritySession.vehiclePlate} cần được ưu tiên. Staff phụ trách: ${selectedPrioritySession.assignedStaffName ?? "chưa assign"}.`,
      target: selectedPrioritySession.assignedStaffName ?? "Tất cả staff",
      priorityPlate: selectedPrioritySession.vehiclePlate,
    });
    setPrioritySessionId(selectedPrioritySession.sessionId);
  };

  const handleLeaveDecision = (request: LeaveRequest, status: "Approved" | "Rejected") => {
    setLeaveRequests((current) =>
      current.map((item) => (item.id === request.id ? { ...item, status } : item)),
    );
    const approved = status === "Approved";
    pushGlobalManagerNotification({
      kind: approved ? "success" : "warning",
      title: approved ? "Leave request approved" : "Leave request rejected",
      message: `${request.staffName} - ${request.shift} on ${formatDate(request.requestedDate)}. Reason: ${request.reason}`,
      target: request.staffName,
      href: "/manager/settings",
    });
    toast.success(approved ? "Leave request approved." : "Leave request rejected.");
  };

  const openAdminSubmissionDialog = (type: AdminSubmissionType) => {
    setAdminSubmissionType(type);
    setAdminSubmissionText(
      type === "incident"
        ? "Incident summary:\nAffected area:\nImpact:\nImmediate action taken:"
        : "Leave request summary:\nRequested date:\nReason:\nShift coverage plan:",
    );
    setAdminDialogOpen(true);
  };

  const handleSubmitToAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanText = adminSubmissionText.trim();
    if (!cleanText) {
      toast.error("Please enter content before sending to Admin.");
      pushGlobalManagerNotification({
        kind: "error",
        title: "Admin submission failed",
        message: "Manager tried to send an empty report/request to Admin.",
        target: "Manager",
        href: "/manager/settings",
      });
      return;
    }

    const isIncident = adminSubmissionType === "incident";
    pushGlobalManagerNotification({
      kind: isIncident ? "warning" : "info",
      title: isIncident ? "Incident report sent to Admin" : "Leave request sent to Admin",
      message: cleanText,
      target: "Admin",
      href: "/manager/settings",
    });
    toast.success(isIncident ? "Incident report sent to Admin." : "Leave request sent to Admin.");
    setAdminDialogOpen(false);
  };

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Manager settings</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Operations Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Tùy chỉnh ca làm, gửi note/nhắc nhở và tracking thông báo vận hành.</p>
        </div>
        <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="Ngày áp dụng" buttonClassName="h-9" align="right" />
      </section>

      {hasError ? (
        <WorkspaceEmptyState title="Không thể tải dữ liệu setting" description={getErrorMessage(error)} />
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric icon={Users} label="Staff nhận thông báo" value={`${staffOptions.length || 0}`} />
        <Metric icon={CarFront} label="Xe đang tracking" value={`${activeSessions.length}`} />
        <Metric icon={ShieldAlert} label="Xe ưu tiên" value={`${prioritySessions.length}`} />
        <Metric icon={MessageSquareText} label="Thông báo hôm nay" value={`${managerNotifications.length}`} />
      </section>

      <div className="space-y-4">
          <Card className="rounded-3xl border-cyan-100 bg-white/92 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Tùy chỉnh ca làm</h2>
                  <p className="text-xs font-semibold text-slate-500">Cấu hình giờ và số staff mong muốn cho ngày {formatDate(selectedDate)}.</p>
                </div>
              </div>
              <Button className="h-9 rounded-xl bg-[#00236f] text-xs font-black text-white hover:bg-[#001b55]" onClick={handleSaveShiftSettings}>
                <CheckCircle2 className="h-4 w-4" /> Lưu cấu hình
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {shiftSettings.map((shift) => (
                <div key={shift.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{shift.name}</p>
                      <p className="text-[11px] font-semibold text-slate-500">Có thể chỉnh theo ngày</p>
                    </div>
                  </div>
                  <CompactInput label="Khung giờ" value={shift.time} onChange={(value) => handleShiftChange(shift.key, "time", value)} />
                  <CompactInput label="Số lượng staff" value={shift.capacity} onChange={(value) => handleShiftChange(shift.key, "capacity", value)} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Gửi nhắc nhở / note cho staff</h2>
                <p className="text-xs font-semibold text-slate-500">Gửi cho tất cả staff hoặc từng nhân viên cụ thể.</p>
              </div>
            </div>

            <form className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4" onSubmit={handleSendMessage}>
              <div className="grid gap-3 md:grid-cols-2">
                <CompactSelect
                  label="Loại thông báo"
                  value={messageType}
                  options={["reminder", "note"]}
                  labels={{ reminder: "Nhắc nhở", note: "Note vận hành" }}
                  onChange={(value) => setMessageType(value as NotificationType)}
                />
                <CompactSelect
                  label="Người nhận"
                  value={targetStaffId}
                  options={["ALL", ...staffOptions.map((staff) => staff.staffId)]}
                  labels={{ ALL: "Tất cả staff", ...Object.fromEntries(staffOptions.map((staff) => [staff.staffId, staff.staffName])) }}
                  onChange={setTargetStaffId}
                />
              </div>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nội dung</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-1 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((template) => (
                  <button key={template} type="button" className="rounded-full border border-cyan-100 bg-white px-3 py-1.5 text-[11px] font-bold text-cyan-800 hover:bg-cyan-50" onClick={() => setMessage(template)}>
                    {template.slice(0, 36)}...
                  </button>
                ))}
              </div>
              <Button className="h-10 rounded-xl bg-cyan-600 text-xs font-black text-white hover:bg-cyan-700">
                <Send className="h-4 w-4" /> Gửi thông báo
              </Button>
            </form>
          </Card>

          <Card className="rounded-3xl border-amber-200 bg-[#fffdf4] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-amber-950">Thông báo xe ưu tiên</h2>
                  <p className="text-xs font-semibold text-amber-800">Đánh dấu xe cần xử lý trước để Manager tracking toàn bộ.</p>
                </div>
              </div>
              <Button className="h-9 rounded-xl bg-amber-500 text-xs font-black text-amber-950 hover:bg-amber-400" onClick={handleMarkPriority}>
                <RadioTower className="h-4 w-4" /> Gửi ưu tiên
              </Button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
              <CompactSelect
                label="Chọn xe"
                value={prioritySessionId || selectedPrioritySession?.sessionId || ""}
                options={activeSessions.map((session) => session.sessionId)}
                labels={Object.fromEntries(activeSessions.map((session) => [session.sessionId, `${session.vehiclePlate} - ${session.assignedStaffName ?? "Chưa assign"}`]))}
                onChange={setPrioritySessionId}
              />
              <div className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs">
                {selectedPrioritySession ? (
                  <>
                    <p className="font-black text-slate-950">{selectedPrioritySession.vehiclePlate}</p>
                    <p className="mt-1 text-slate-500">
                      {selectedPrioritySession.customerName} · {selectedPrioritySession.servicePackage ?? "Gói rửa"} · {statusLabel(selectedPrioritySession.status)}
                    </p>
                  </>
                ) : (
                  <p className="py-2 text-center font-semibold text-amber-700">Chưa có xe đang vận hành.</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Approve staff leave requests</h2>
                  <p className="text-xs font-semibold text-slate-500">Review leave requests sent by staff before forwarding operational impact to Admin.</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {leaveRequests.filter((request) => request.status === "Pending").length} pending
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {leaveRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{request.staffName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {request.shift} · {formatDate(request.requestedDate)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${leaveStatusTone(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                    {request.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="h-8 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"
                      disabled={request.status !== "Pending"}
                      onClick={() => handleLeaveDecision(request, "Approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-rose-100 bg-white text-xs font-black text-rose-600 hover:bg-rose-50"
                      disabled={request.status !== "Pending"}
                      onClick={() => handleLeaveDecision(request, "Rejected")}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-cyan-100 bg-white/92 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Send request / report to Admin</h2>
                  <p className="text-xs font-semibold text-slate-500">Open a text form to send incident reports or leave requests upward to Admin.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="h-9 rounded-xl bg-amber-500 text-xs font-black text-amber-950 hover:bg-amber-400" onClick={() => openAdminSubmissionDialog("incident")}>
                  <AlertTriangle className="h-4 w-4" /> Incident report
                </Button>
                <Button className="h-9 rounded-xl bg-[#00236f] text-xs font-black text-white hover:bg-[#001b55]" onClick={() => openAdminSubmissionDialog("leave")}>
                  <Send className="h-4 w-4" /> Leave request
                </Button>
              </div>
            </div>
          </Card>
      </div>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-[34rem] rounded-3xl border-cyan-100 bg-white p-0 shadow-[0_28px_90px_rgba(6,17,26,0.24)]">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#ffffff_0%,#f1feff_48%,#fff8ec_100%)] p-5">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-xl font-black text-slate-950">
                {adminSubmissionType === "incident" ? "Send incident report to Admin" : "Send leave request to Admin"}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500">
                Write the details clearly so Admin can review and respond.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-white/88 p-4 shadow-sm" onSubmit={handleSubmitToAdmin}>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Content</span>
                <textarea
                  value={adminSubmissionText}
                  onChange={(event) => setAdminSubmissionText(event.target.value)}
                  className="mt-1 min-h-44 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-black" onClick={() => setAdminDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="h-10 rounded-xl bg-cyan-600 text-xs font-black text-white hover:bg-cyan-700">
                  <Send className="h-4 w-4" /> Send to Admin
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function CompactInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length === 0 ? <option value="">Không có dữ liệu</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function leaveStatusTone(status: LeaveRequest["status"]) {
  const tones: Record<LeaveRequest["status"], string> = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
  };
  return tones[status];
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
