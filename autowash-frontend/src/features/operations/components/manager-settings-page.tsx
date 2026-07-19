"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  ListChecks,
  RefreshCcw,
  Save,
  ShieldAlert,
  Star,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getActiveStaffOptions, getOperationsQueue } from "@/features/operations/lib/operations-service";
import {
  getManagerSettings,
  updateManagerSettings,
  type ManagerNotificationTemplatePayload,
  type ManagerOperationSettingsPayload,
} from "@/features/operations/lib/manager-settings-service";
import { translate, useLanguageStore, type Language } from "@/shared/store/language.store";
import { useManagerNotificationStore } from "@/features/operations/store/manager-notification.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";

type TemplateKey = "newBooking" | "delay" | "transfer";
type TemplateMap = Record<TemplateKey, string>;

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

const DEFAULT_TEMPLATES: TemplateMap = {
  newBooking: "A new booking is waiting for manager intake. Please review the queue and create a wash session.",
  delay: "A wash session is taking longer than expected. Please review bay progress and update the customer if needed.",
  transfer: "A wash session has been reassigned to another staff member. Please continue tracking the handover.",
};

const TEMPLATE_META: Record<TemplateKey, Omit<ManagerNotificationTemplatePayload, "templateKey" | "message">> = {
  newBooking: {
    displayName: "New booking",
    description: "Sent when a booking is waiting for manager intake.",
    preview: "Example: Vehicle 51F-456.89 - Ultimate Detail is waiting for intake.",
  },
  delay: {
    displayName: "Delayed session",
    description: "Sent when a wash session exceeds the configured delay threshold.",
    preview: "Example: Vehicle 51F-456.89 is taking longer than expected.",
  },
  transfer: {
    displayName: "Staff transfer",
    description: "Sent when a manager transfers a wash session to another staff member.",
    preview: "Example: Vehicle 51F-456.89 has been reassigned to Le Van Hai.",
  },
};

export function ManagerSettingsPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);
  const pushManagerNotification = useManagerNotificationStore((state) => state.push);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [isDirty, setIsDirty] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["manager-settings", "config"],
    queryFn: getManagerSettings,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const staffQuery = useQuery({
    queryKey: ["manager-settings", "staff"],
    queryFn: getActiveStaffOptions,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const queueQuery = useQuery({
    queryKey: ["manager-settings", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!settingsQuery.data || isDirty) return;
    setSettings(settingsQuery.data.settings);
    setTemplates(templatesToMap(settingsQuery.data.templates));
  }, [settingsQuery.data, isDirty]);

  const saveMutation = useMutation({
    mutationFn: updateManagerSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["manager-settings", "config"], data);
      setSettings(data.settings);
      setTemplates(templatesToMap(data.templates));
      setIsDirty(false);
      const title = t("Da luu cau hinh van hanh", "Operational settings saved");
      const detail = t(
        `Auto assignment ${data.settings.autoAssignEnabled ? "dang bat" : "dang tat"}, toi da ${data.settings.maxActiveSessionsPerStaff} xe/staff.`,
        `Auto assignment is ${data.settings.autoAssignEnabled ? "on" : "off"}, max ${data.settings.maxActiveSessionsPerStaff} active sessions per staff.`,
      );
      pushManagerNotification({
        kind: "success",
        title,
        message: detail,
        target: "Manager",
        href: "/manager/settings",
      });
      toast.success(title, { description: detail });
    },
    onError: (error) => {
      toast.error(t("Khong the luu cau hinh", "Unable to save settings"), {
        description: getErrorMessage(error as unknown as ApiErrorResponse),
      });
    },
  });

  const staffOptions = staffQuery.data ?? [];
  const sessions = useMemo(() => queueQuery.data?.columns.flatMap((column) => column.sessions) ?? [], [queueQuery.data]);
  const activeSessions = sessions.filter((session) => ["QUEUED", "CHECKED_IN", "IN_PROGRESS"].includes(session.status));
  const delayedSessions = activeSessions.filter((session) => isDelayed(session.startedAt ?? session.checkedInAt ?? session.queuedAt, settings.delayAlertMinutes));
  const overloadedStaff = staffOptions.filter((staff) => activeSessions.filter((session) => session.assignedStaffId === staff.staffId).length >= settings.overloadAlertSessions);
  const hasError = settingsQuery.isError || staffQuery.isError || queueQuery.isError;
  const error = (settingsQuery.error ?? staffQuery.error ?? queueQuery.error) as unknown as ApiErrorResponse;
  const auditEntries = settingsQuery.data?.auditLogs ?? [];

  const updateSetting = <K extends keyof ManagerOperationSettingsPayload>(key: K, value: ManagerOperationSettingsPayload[K]) => {
    setIsDirty(true);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateTemplate = (key: TemplateKey, value: string) => {
    setIsDirty(true);
    setTemplates((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate({
      settings,
      templates: templateMapToPayload(templates),
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setTemplates(DEFAULT_TEMPLATES);
    setIsDirty(true);
    toast.info(t("Da reset ve mac dinh", "Defaults restored"), {
      description: t("Bam Luu cau hinh de ghi thay doi xuong database.", "Click Save settings to write these changes to the database."),
    });
  };

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">{t("Cau hinh Manager", "Manager settings")}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{t("Cau hinh van hanh", "Operational settings")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("Thiet lap auto assignment, canh bao, check-in, uu tien booking va mau thong bao cho luong manager.", "Configure auto assignment, alerts, check-in rules, booking priority, and notification templates for the manager flow.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={handleReset}>
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button className="h-9 rounded-xl bg-[#00236f] text-xs font-black text-white hover:bg-[#001b55]" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? t("Dang luu...", "Saving...") : t("Luu cau hinh", "Save settings")}
          </Button>
        </div>
      </section>

      {hasError ? <WorkspaceEmptyState title={t("Khong the tai du lieu setting", "Unable to load settings data")} description={getErrorMessage(error)} /> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric icon={Users} label={t("Staff active", "Active staff")} value={`${staffOptions.length}`} />
        <Metric icon={ClipboardList} label={t("Session active", "Active sessions")} value={`${activeSessions.length}`} />
        <Metric icon={Timer} label={t("Session delay", "Delayed sessions")} value={`${delayedSessions.length}`} />
        <Metric icon={ShieldAlert} label={t("Staff qua tai", "Overloaded staff")} value={`${overloadedStaff.length}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <SettingsSection icon={Zap} title={t("Auto assignment", "Auto assignment")} subtitle={t("Luat tu dong chon staff khi manager tao session.", "Rules for choosing staff when a manager creates a session.")}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label={t("Bat auto assignment", "Enable auto assignment")} description={t("Tu chon staff khi tao session.", "Pick staff automatically when creating sessions.")} checked={settings.autoAssignEnabled} onChange={(value) => updateSetting("autoAssignEnabled", value)} />
              <ToggleRow label={t("Uu tien staff it viec", "Least busy staff first")} description={t("Chon staff co it session active hon.", "Prefer staff with fewer active sessions.")} checked={settings.leastBusyStaffFirst} onChange={(value) => updateSetting("leastBusyStaffFirst", value)} />
              <ToggleRow label={t("Ton trong capacity staff", "Respect staff capacity")} description={t("Khong giao qua so xe active cho phep.", "Avoid assigning beyond active session capacity.")} checked={settings.respectStaffCapacity} onChange={(value) => updateSetting("respectStaffCapacity", value)} />
              <NumberField label={t("Toi da xe active / staff", "Max active sessions / staff")} value={settings.maxActiveSessionsPerStaff} min={1} max={12} onChange={(value) => updateSetting("maxActiveSessionsPerStaff", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={AlertTriangle} title={t("Nguong canh bao", "Alert thresholds")} subtitle={t("Nguong canh bao de manager nhin thay rui ro som.", "Thresholds for surfacing operational risk early.")}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <NumberField label={t("Xe cho qua lau", "Waiting too long")} suffix="min" value={settings.waitingAlertMinutes} min={1} max={120} onChange={(value) => updateSetting("waitingAlertMinutes", value)} />
              <NumberField label={t("Session delay", "Session delay")} suffix="min" value={settings.delayAlertMinutes} min={1} max={180} onChange={(value) => updateSetting("delayAlertMinutes", value)} />
              <NumberField label={t("Staff qua tai", "Staff overload")} suffix="sessions" value={settings.overloadAlertSessions} min={1} max={12} onChange={(value) => updateSetting("overloadAlertSessions", value)} />
              <NumberField label={t("Ty le huy", "Cancellation rate")} suffix="%" value={settings.cancellationRateAlert} min={1} max={100} onChange={(value) => updateSetting("cancellationRateAlert", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={CalendarClock} title={t("Quy tac check-in", "Check-in rules")} subtitle={t("Quy tac nhan xe som/tre so voi lich dat.", "Rules for early and late arrivals.")}>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label={t("Cho check-in som", "Early check-in window")} suffix="min" value={settings.earlyCheckInMinutes} min={0} max={180} onChange={(value) => updateSetting("earlyCheckInMinutes", value)} />
              <NumberField label={t("Grace period tre", "Late grace period")} suffix="min" value={settings.lateGraceMinutes} min={0} max={180} onChange={(value) => updateSetting("lateGraceMinutes", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={Bell} title={t("Thong bao van hanh", "Operational notifications")} subtitle={t("Su kien nao se day thong bao cho manager.", "Choose which events notify managers.")}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label={t("Booking moi", "New booking")} description={t("Thong bao khi co booking du dieu kien tao session.", "Notify when a booking is ready for session creation.")} checked={settings.notifyNewBooking} onChange={(value) => updateSetting("notifyNewBooking", value)} />
              <ToggleRow label={t("Session delay", "Delayed session")} description={t("Thong bao khi session vuot nguong delay.", "Notify when a session exceeds the delay threshold.")} checked={settings.notifyDelayedSession} onChange={(value) => updateSetting("notifyDelayedSession", value)} />
              <ToggleRow label={t("Chuyen staff", "Staff transfer")} description={t("Thong bao khi xe duoc chuyen staff.", "Notify when a session is transferred.")} checked={settings.notifyStaffTransfer} onChange={(value) => updateSetting("notifyStaffTransfer", value)} />
              <ToggleRow label={t("Hoan thanh", "Completion")} description={t("Thong bao khi xe hoan thanh.", "Notify when a session is completed.")} checked={settings.notifyCompletion} onChange={(value) => updateSetting("notifyCompletion", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={Star} title={t("Uu tien booking", "Priority booking")} subtitle={t("Cach xep uu tien khi nhieu booking cung cho xu ly.", "How bookings are prioritized when the queue is busy.")}>
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleRow label={t("Khach tier cao", "High tier customers")} description={t("Uu tien Gold/Diamond.", "Prioritize Gold/Diamond customers.")} checked={settings.tierPriorityEnabled} onChange={(value) => updateSetting("tierPriorityEnabled", value)} />
              <ToggleRow label={t("Da thanh toan", "Paid bookings")} description={t("Uu tien booking da thanh toan.", "Prioritize paid bookings.")} checked={settings.paidBookingPriority} onChange={(value) => updateSetting("paidBookingPriority", value)} />
              <ToggleRow label={t("Xe primary", "Primary vehicles")} description={t("Uu tien xe chinh cua khach.", "Prioritize customer primary vehicles.")} checked={settings.primaryVehiclePriority} onChange={(value) => updateSetting("primaryVehiclePriority", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={FileText} title={t("Mau thong bao", "Notification messages")} subtitle={t("Noi dung hien thi cho cac thong bao van hanh.", "Messages shown for operational notifications.")}>
            <div className="space-y-3">
              <TemplateField label={t("Booking moi", "New booking")} description={t("Gui khi co booking dang cho manager tiep nhan.", TEMPLATE_META.newBooking.description)} preview={t("Vi du: Xe 51F-456.89 - Ultimate Detail dang cho tiep nhan.", TEMPLATE_META.newBooking.preview)} value={templates.newBooking} onChange={(value) => updateTemplate("newBooking", value)} />
              <TemplateField label={t("Session bi tre", "Delayed session")} description={t("Gui khi mot phien rua vuot nguong delay da cau hinh.", TEMPLATE_META.delay.description)} preview={t("Vi du: Xe 51F-456.89 dang xu ly lau hon du kien.", TEMPLATE_META.delay.preview)} value={templates.delay} onChange={(value) => updateTemplate("delay", value)} />
              <TemplateField label={t("Chuyen staff", "Staff transfer")} description={t("Gui khi manager chuyen phien rua sang staff khac.", TEMPLATE_META.transfer.description)} preview={t("Vi du: Xe 51F-456.89 da duoc chuyen sang Le Van Hai.", TEMPLATE_META.transfer.preview)} value={templates.transfer} onChange={(value) => updateTemplate("transfer", value)} />
            </div>
          </SettingsSection>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-2xl border-cyan-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-cyan-700" />
              <h2 className="font-black text-slate-950">{t("Tom tat cau hinh", "Configuration summary")}</h2>
            </div>
            <div className="mt-4 space-y-2">
              <SummaryRow label={t("Auto assignment", "Auto assignment")} value={settings.autoAssignEnabled ? "ON" : "OFF"} />
              <SummaryRow label={t("Capacity", "Capacity")} value={`${settings.maxActiveSessionsPerStaff}/staff`} />
              <SummaryRow label={t("Delay alert", "Delay alert")} value={`${settings.delayAlertMinutes} min`} />
              <SummaryRow label={t("Priority rules", "Priority rules")} value={`${[settings.tierPriorityEnabled, settings.paidBookingPriority, settings.primaryVehiclePriority].filter(Boolean).length}/3`} />
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-cyan-700" />
              <h2 className="font-black text-slate-950">Audit log</h2>
            </div>
            <div className="mt-4 space-y-3">
              {auditEntries.length > 0 ? auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-black text-slate-950">{entry.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{entry.detail}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">{formatDateTime(entry.createdAt, language)}</p>
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
                  {t("Chua co lich su thay doi.", "No setting changes have been saved yet.")}
                </p>
              )}
            </div>
          </Card>
        </aside>
      </section>
    </WorkspacePage>
  );
}

function SettingsSection({ icon: Icon, title, subtitle, children }: { icon: ComponentType<{ className?: string }>; title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-[5rem] items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        checked ? "border-cyan-200 bg-cyan-50/65" : "border-slate-200 bg-slate-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-cyan-500" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function NumberField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        />
        {suffix ? <span className="text-xs font-black text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TemplateField({
  label,
  description,
  preview,
  value,
  onChange,
}: {
  label: string;
  description: string;
  preview: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      />
      <span className="mt-2 block rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500">{preview}</span>
    </label>
  );
}

function Metric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function templateMapToPayload(templates: TemplateMap): ManagerNotificationTemplatePayload[] {
  return (Object.keys(templates) as TemplateKey[]).map((templateKey) => ({
    templateKey,
    ...TEMPLATE_META[templateKey],
    message: templates[templateKey],
  }));
}

function templatesToMap(templates: ManagerNotificationTemplatePayload[]): TemplateMap {
  return templates.reduce<TemplateMap>(
    (acc, template) => {
      if (template.templateKey in acc) {
        acc[template.templateKey as TemplateKey] = template.message;
      }
      return acc;
    },
    { ...DEFAULT_TEMPLATES },
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function isDelayed(value: string | null | undefined, thresholdMinutes: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() > thresholdMinutes * 60_000;
}

function formatDateTime(value: string, language: Language) {
  return new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
