"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, FileWarning, MoreVertical, Plus, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getActiveStaffOptions, getOperationsQueue, sendOperationsNotice } from "@/features/operations/lib/operations-service";
import {
  getManagerSettings,
  updateManagerSettings,
  type ManagerOperationSettingsPayload,
  type ManagerNotificationTemplatePayload,
} from "@/features/operations/lib/manager-settings-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

type PriorityLevel = "normal" | "important" | "urgent";

const DEFAULT_SETTINGS: ManagerOperationSettingsPayload = {
  autoAssignEnabled: true,
  leastBusyStaffFirst: true,
  respectStaffCapacity: true,
  maxActiveSessionsPerStaff: 4,
  paidBookingPriority: true,
  tierPriorityEnabled: true,
  primaryVehiclePriority: true,
  earlyCheckInMinutes: 15,
  lateGraceMinutes: 20,
  waitingAlertMinutes: 12,
  delayAlertMinutes: 25,
  overloadAlertSessions: 4,
  cancellationRateAlert: 18,
  notifyNewBooking: true,
  notifyDelayedSession: true,
  notifyStaffTransfer: true,
  notifyCompletion: false,
};

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";

const quickTemplates = ["Vehicle check reminder", "Booking waiting too long", "Incident warning"];

export function ManagerSettingsPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [noticeType, setNoticeType] = useState("Reminder");
  const [recipient, setRecipient] = useState("ALL");
  const [priority, setPriority] = useState<PriorityLevel>("normal");
  const [message, setMessage] = useState("Inspect the interior carefully and update the booking status after completion.");
  const [priorityReason, setPriorityReason] = useState("Customer has waited too long");
  const [notifyTarget, setNotifyTarget] = useState("Assigned staff");

  const [editingTemplate, setEditingTemplate] = useState<ManagerNotificationTemplatePayload | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["manager-settings", "config"],
    queryFn: getManagerSettings,
    refetchInterval: 30_000,
  });
  const staffQuery = useQuery({
    queryKey: ["manager-settings", "staff"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
  });
  const queueQuery = useQuery({
    queryKey: ["manager-settings", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      setSettings(settingsQuery.data.settings);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateManagerSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["manager-settings", "config"], data);
      toast.success("Operations settings saved.");
    },
    onError: (error) => toast.error(getErrorMessage(error as unknown as ApiErrorResponse)),
  });

  const sendNoticeMutation = useMutation({
    mutationFn: sendOperationsNotice,
    onSuccess: () => {
      toast.success("Operations notice sent.");
    },
    onError: (error) => toast.error(getErrorMessage(error as unknown as ApiErrorResponse)),
  });

  const staffOptions = staffQuery.data ?? [];
  const sessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const activeSessions = sessions.filter((session) => ["QUEUED", "CHECKED_IN", "IN_PROGRESS"].includes(session.status));
  const selectedSession = activeSessions[0] ?? sessions[0] ?? null;

  const persistSettings = (nextSettings: ManagerOperationSettingsPayload) => {
    setSettings(nextSettings);
    saveMutation.mutate({
      settings: nextSettings,
      templates: settingsQuery.data?.templates ?? [],
    });
  };

  const sendNotice = () => {
    sendNoticeMutation.mutate({
      recipient,
      noticeType,
      priority,
      message,
    });
  };

  const markPriority = () => {
    persistSettings({ ...settings, paidBookingPriority: true, tierPriorityEnabled: true });
    toast.success("Booking marked as priority.", {
      description: selectedSession ? `${selectedSession.customerName} · ${selectedSession.servicePackage ?? "Service"} · ${priorityReason}` : priorityReason,
    });
  };

  const handleSaveTemplate = (updatedTemplate: ManagerNotificationTemplatePayload) => {
    const currentTemplates = settingsQuery.data?.templates ?? [];
    const nextTemplates = currentTemplates.map((t) =>
      t.templateKey === updatedTemplate.templateKey ? updatedTemplate : t
    );
    saveMutation.mutate({
      settings,
      templates: nextTemplates,
    });
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <WorkspacePage className="max-w-none space-y-4 bg-[#f8fcff]">
      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg border-slate-200 bg-white p-5 shadow-sm">
          <CardTitle icon={<Send className="h-6 w-6" />} title="Send operations notice" subtitle="Send notes, reminders, or alerts to staff." tone="blue" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Notice type">
              <select value={noticeType} onChange={(event) => setNoticeType(event.target.value)} className={inputClassName}>
                <option>Reminder</option>
                <option>Warning</option>
                <option>Priority</option>
                <option>Incident</option>
              </select>
            </Field>
            <Field label="Recipient">
              <select value={recipient} onChange={(event) => setRecipient(event.target.value)} className={inputClassName}>
                <option value="ALL">All staff</option>
                {staffOptions.map((staff) => <option key={staff.staffId} value={staff.staffId}>{staff.staffName}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-sm font-black text-slate-800">Priority level</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <PriorityButton active={priority === "normal"} tone="normal" onClick={() => setPriority("normal")}>Normal</PriorityButton>
              <PriorityButton active={priority === "important"} tone="important" onClick={() => setPriority("important")}>Important</PriorityButton>
              <PriorityButton active={priority === "urgent"} tone="urgent" onClick={() => setPriority("urgent")}>Urgent</PriorityButton>
            </div>
          </div>

          <Field label="Content" className="mt-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              placeholder="Write the full message staff should receive..."
            />
          </Field>

          <div className="mt-4">
            <p className="text-sm font-black text-slate-800">Quick templates</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {quickTemplates.map((template) => (
                <button key={template} className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-bold text-teal-700 hover:bg-cyan-50" onClick={() => setMessage(template)}>
                  {template}
                </button>
              ))}
            </div>
          </div>

          <Button className="mt-4 h-11 w-full rounded-lg bg-[#0587a5] font-black text-white hover:bg-[#04738d]" onClick={sendNotice} disabled={sendNoticeMutation.isPending}>
            {sendNoticeMutation.isPending ? "Sending..." : "Send notice"}
          </Button>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white p-5 shadow-sm">
          <CardTitle icon={<Star className="h-6 w-6" />} title="Priority booking settings" subtitle="Mark bookings that need to be handled first." tone="amber" />
          <div className="mt-5 space-y-3">
            <Field label="Booking / session">
              <select className={inputClassName}>
                {activeSessions.length > 0 ? activeSessions.map((session) => (
                  <option key={session.sessionId}>#{session.vehiclePlate}</option>
                )) : <option>No active sessions</option>}
              </select>
            </Field>
            <Field label="Priority reason">
              <select value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} className={inputClassName}>
                <option>Customer has waited too long</option>
                <option>Vehicle needs urgent handoff</option>
                <option>VIP customer</option>
                <option>Incident needs attention</option>
              </select>
            </Field>
            <Field label="Notify">
              <select value={notifyTarget} onChange={(event) => setNotifyTarget(event.target.value)} className={inputClassName}>
                <option>Assigned staff</option>
                <option>All staff</option>
                <option>Shift manager</option>
              </select>
            </Field>
          </div>
          <Button className="mt-4 h-11 w-full rounded-lg bg-[#f59e0b] font-black text-white hover:bg-[#d97706]" onClick={markPriority} disabled={saveMutation.isPending}>
            Mark as priority
          </Button>
          <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50/35 px-4 py-4">
            <span className="mr-4 rounded-md bg-white px-4 py-2 text-sm font-black text-amber-700">Priority</span>
            <span className="text-sm font-black text-slate-900">
              {selectedSession ? `${selectedSession.customerName} · ${selectedSession.servicePackage ?? "Service"} · ${priorityReason}` : "No active session selected"}
            </span>
          </div>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <CardTitle icon={<FileWarning className="h-6 w-6" />} title="Operations notice templates" tone="slate" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(settingsQuery.data?.templates ?? []).map((row) => (
              <div key={row.templateKey} className="grid grid-cols-[8rem_1fr_auto_auto] items-center gap-4 py-3">
                <TemplateBadge tone={row.templateKey === "newBooking" ? "info" : row.templateKey === "delay" ? "warn" : "priority"}>
                  {row.displayName}
                </TemplateBadge>
                <div>
                  <p className="text-sm font-black text-slate-950">{row.description}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-[350px] truncate">{row.message}</p>
                </div>
                <button
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-50"
                  title="Edit template"
                  onClick={() => {
                    setEditingTemplate(row);
                    setIsTemplateDialogOpen(true);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="rounded-md p-2 text-slate-600 hover:bg-slate-50" title="More options"><MoreVertical className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {isTemplateDialogOpen && editingTemplate && (
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">Edit Template: {editingTemplate.displayName}</DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500">Modify template key message and previews.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field label="Display Name">
                <input
                  type="text"
                  value={editingTemplate.displayName}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, displayName: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Message Template">
                <textarea
                  value={editingTemplate.message}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                  className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
              <Field label="Preview Text">
                <textarea
                  value={editingTemplate.preview}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, preview: e.target.value })}
                  className="min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => handleSaveTemplate(editingTemplate)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </WorkspacePage>
  );
}

const inputClassName = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100";

function CardTitle({ icon, title, subtitle, tone }: { icon: ReactNode; title: string; subtitle?: string; tone: "blue" | "amber" | "slate" }) {
  const color = tone === "amber" ? "text-amber-500" : tone === "blue" ? "text-[#00236f]" : "text-slate-700";
  return (
    <div className="flex items-start gap-3">
      <span className={color}>{icon}</span>
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function PriorityButton({ active, tone, onClick, children }: { active: boolean; tone: PriorityLevel; onClick: () => void; children: ReactNode }) {
  const styles = {
    normal: active ? "border-cyan-300 bg-cyan-50 text-teal-700" : "border-cyan-200 text-teal-700",
    important: active ? "border-amber-300 bg-amber-50 text-amber-700" : "border-amber-200 text-amber-700",
    urgent: active ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 text-rose-700",
  }[tone];
  return <button className={`h-10 rounded-lg border text-sm font-black ${styles}`} onClick={onClick}>{children}</button>;
}

function TemplateBadge({ tone, children }: { tone: "info" | "warn" | "priority" | "danger"; children: ReactNode }) {
  const styles = {
    info: "border-cyan-100 bg-cyan-50 text-teal-700",
    warn: "border-amber-100 bg-amber-50 text-amber-700",
    priority: "border-yellow-100 bg-yellow-50 text-yellow-700",
    danger: "border-rose-100 bg-rose-50 text-rose-700",
  }[tone];
  return <span className={`rounded-md border px-3 py-1 text-center text-xs font-black ${styles}`}>{children}</span>;
}

function priorityLabel(value: PriorityLevel) {
  return { normal: "Normal", important: "Important", urgent: "Urgent" }[value];
}
