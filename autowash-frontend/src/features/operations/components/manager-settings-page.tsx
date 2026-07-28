"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Send,
  Settings2,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getActiveStaffOptions, sendOperationsNotice } from "@/features/operations/lib/operations-service";
import {
  getManagerSettings,
  updateManagerSettings,
  updateWeeklyStaffKpiTarget,
  type ManagerNotificationTemplatePayload,
  type ManagerOperationSettingsPayload,
} from "@/features/operations/lib/manager-settings-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";

type PriorityLevel = "normal" | "important" | "urgent";
type ManagerSettingsSectionId = "notifications" | "kpi" | "alerts";

const DEFAULT_SETTINGS: ManagerOperationSettingsPayload = {
  autoAssignEnabled: true,
  leastBusyStaffFirst: true,
  respectStaffCapacity: true,
  maxActiveSessionsPerStaff: 4,
  weeklyStaffKpiTarget: 40,
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

export function ManagerSettingsPage() {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recipient, setRecipient] = useState("ALL");
  const [noticeType, setNoticeType] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("normal");
  const [message, setMessage] = useState("");
  const [expandedSection, setExpandedSection] = useState<ManagerSettingsSectionId | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    displayName: "",
    description: "",
    message: "",
    preview: "",
  });

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

  useEffect(() => {
    if (settingsQuery.data?.settings) {
      setSettings(settingsQuery.data.settings);
    }
  }, [settingsQuery.data]);

  const templates = settingsQuery.data?.templates ?? [];

  const saveSettingsMutation = useMutation({
    mutationFn: updateManagerSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["manager-settings", "config"], data);
      void queryClient.invalidateQueries({ queryKey: ["manager-reports", "manager-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-reports", "manager-settings"] });
      setSettings(data.settings);
      toast.success("Manager settings saved.");
    },
    onError: (error) => toast.error(getErrorMessage(error as unknown as ApiErrorResponse)),
  });

  const saveWeeklyKpiMutation = useMutation({
    mutationFn: async ({ weeklyStaffKpiTarget }: { weeklyStaffKpiTarget: number }) => {
      try {
        return await updateWeeklyStaffKpiTarget({ weeklyStaffKpiTarget });
      } catch (error) {
        const apiError = error as ApiErrorResponse;
        if (apiError.statusCode !== 404) {
          throw error;
        }

        return updateManagerSettings({
          settings: {
            ...settings,
            weeklyStaffKpiTarget,
          },
          templates,
        });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["manager-settings", "config"], data);
      void queryClient.invalidateQueries({ queryKey: ["manager-reports", "manager-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-reports", "manager-settings"] });
      setSettings(data.settings);
      toast.success("Weekly KPI target saved.");
    },
    onError: (error) => toast.error(getErrorMessage(error as unknown as ApiErrorResponse)),
  });

  const sendNoticeMutation = useMutation({
    mutationFn: sendOperationsNotice,
    onSuccess: () => {
      setMessage("");
      toast.success("Staff notice sent.");
    },
    onError: (error) => toast.error(getErrorMessage(error as unknown as ApiErrorResponse)),
  });

  const hasUnsavedAlertSettings = useMemo(() => {
    const baseline = settingsQuery.data?.settings;
    if (!baseline) return false;
    return JSON.stringify({
      waitingAlertMinutes: settings.waitingAlertMinutes,
      delayAlertMinutes: settings.delayAlertMinutes,
      overloadAlertSessions: settings.overloadAlertSessions,
      cancellationRateAlert: settings.cancellationRateAlert,
      notifyNewBooking: settings.notifyNewBooking,
      notifyDelayedSession: settings.notifyDelayedSession,
      notifyStaffTransfer: settings.notifyStaffTransfer,
      notifyCompletion: settings.notifyCompletion,
    }) !== JSON.stringify({
      waitingAlertMinutes: baseline.waitingAlertMinutes,
      delayAlertMinutes: baseline.delayAlertMinutes,
      overloadAlertSessions: baseline.overloadAlertSessions,
      cancellationRateAlert: baseline.cancellationRateAlert,
      notifyNewBooking: baseline.notifyNewBooking,
      notifyDelayedSession: baseline.notifyDelayedSession,
      notifyStaffTransfer: baseline.notifyStaffTransfer,
      notifyCompletion: baseline.notifyCompletion,
    });
  }, [settings, settingsQuery.data?.settings]);

  function updateSetting<K extends keyof ManagerOperationSettingsPayload>(
    key: K,
    value: ManagerOperationSettingsPayload[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleSaveAlertSettings() {
    saveSettingsMutation.mutate({
      settings,
      templates,
    });
  }

  function handleSaveWeeklyKpi() {
    saveWeeklyKpiMutation.mutate({
      weeklyStaffKpiTarget: settings.weeklyStaffKpiTarget,
    });
  }

  function handleTemplateApply(template: ManagerNotificationTemplatePayload) {
    setNoticeType(template.displayName);
    setMessage(template.message);
  }

  function handleSendNotice() {
    const trimmedType = noticeType.trim();
    const trimmedMessage = message.trim();

    if (!trimmedType) {
      toast.error("Enter a notice type.");
      return;
    }

    if (!trimmedMessage) {
      toast.error("Enter a message for staff.");
      return;
    }

    sendNoticeMutation.mutate({
      recipient,
      noticeType: trimmedType,
      priority,
      message: trimmedMessage,
    });
  }

  function handleCreateTemplate() {
    const displayName = newTemplate.displayName.trim();
    const messageValue = newTemplate.message.trim();

    if (!displayName) {
      toast.error("Enter a template name.");
      return;
    }

    if (!messageValue) {
      toast.error("Enter a template message.");
      return;
    }

    const baseTemplateKey = displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const templateKey = templates.some((template) => template.templateKey === baseTemplateKey)
      ? `${baseTemplateKey}-${Date.now()}`
      : baseTemplateKey;

    saveSettingsMutation.mutate(
      {
        settings,
        templates: [
          ...templates,
          {
            templateKey,
            displayName,
            description: newTemplate.description.trim(),
            message: messageValue,
            preview: newTemplate.preview.trim(),
          },
        ],
      },
      {
        onSuccess: () => {
          setIsTemplateDialogOpen(false);
          setNewTemplate({
            displayName: "",
            description: "",
            message: "",
            preview: "",
          });
        },
      },
    );
  }

  return (
    <WorkspacePage>
      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Manager Settings</CardTitle>
              {settingsQuery.data?.updatedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last updated: {new Date(settingsQuery.data.updatedAt).toLocaleString("en-US")}
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {settingsQuery.isPending ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : settingsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getErrorMessage(settingsQuery.error)}
            </div>
          ) : (
            <div className="space-y-4">
              <ManagerSettingsSection
                id="notifications"
                icon={Send}
                title="Staff Notifications"
                description="Send real operational notices to active staff and reuse saved backend templates."
                isExpanded={expandedSection === "notifications"}
                onToggle={(id) => setExpandedSection((current) => (current === id ? null : id))}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput label="Notice type" value={noticeType} onChange={setNoticeType} placeholder="Example: Delay alert" />
                  <FieldSelect
                    label="Recipient"
                    value={recipient}
                    onChange={setRecipient}
                    options={[
                      { label: "All staff", value: "ALL" },
                      ...(staffQuery.data ?? []).map((staff) => ({
                        label: staff.staffName,
                        value: staff.staffId,
                      })),
                    ]}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Priority</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <PriorityButton active={priority === "normal"} tone="normal" onClick={() => setPriority("normal")}>
                      Normal
                    </PriorityButton>
                    <PriorityButton active={priority === "important"} tone="important" onClick={() => setPriority("important")}>
                      Important
                    </PriorityButton>
                    <PriorityButton active={priority === "urgent"} tone="urgent" onClick={() => setPriority("urgent")}>
                      Urgent
                    </PriorityButton>
                  </div>
                </div>

                <div className="mt-4">
                  <FieldTextarea
                    label="Message"
                    value={message}
                    onChange={setMessage}
                    placeholder="Write the notice content staff should receive."
                  />
                </div>

                {templates.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-muted-foreground">Saved templates</p>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
                        onClick={() => setIsTemplateDialogOpen(true)}
                        aria-label="Add template"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.templateKey}
                          type="button"
                          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                          onClick={() => handleTemplateApply(template)}
                        >
                          {template.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-muted-foreground">Saved templates</p>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
                        onClick={() => setIsTemplateDialogOpen(true)}
                        aria-label="Add template"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button type="button" disabled={sendNoticeMutation.isPending} onClick={handleSendNotice}>
                    {sendNoticeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send notice
                  </Button>
                </div>
              </ManagerSettingsSection>

              <ManagerSettingsSection
                id="kpi"
                icon={Timer}
                title="Weekly Staff KPI"
                description="Set the target used by manager reports and staff performance summaries."
                isExpanded={expandedSection === "kpi"}
                onToggle={(id) => setExpandedSection((current) => (current === id ? null : id))}
              >
                <div className="max-w-md">
                  <FieldNumber
                    label="Weekly completed sessions target"
                    value={settings.weeklyStaffKpiTarget}
                    min={1}
                    max={200}
                    onChange={(value) => updateSetting("weeklyStaffKpiTarget", value)}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="button" disabled={saveWeeklyKpiMutation.isPending} onClick={handleSaveWeeklyKpi}>
                    {saveWeeklyKpiMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save KPI target
                  </Button>
                </div>
              </ManagerSettingsSection>

              <ManagerSettingsSection
                id="alerts"
                icon={BellRing}
                title="Alert & Notification Thresholds"
                description="Configure red-alert limits and notification toggles stored in manager operational settings."
                isExpanded={expandedSection === "alerts"}
                onToggle={(id) => setExpandedSection((current) => (current === id ? null : id))}
              >
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Alert time thresholds</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldNumber
                        label="Waiting alert minutes"
                        value={settings.waitingAlertMinutes}
                        min={1}
                        max={120}
                        onChange={(value) => updateSetting("waitingAlertMinutes", value)}
                      />
                      <FieldNumber
                        label="Delay alert minutes"
                        value={settings.delayAlertMinutes}
                        min={1}
                        max={180}
                        onChange={(value) => updateSetting("delayAlertMinutes", value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">System thresholds</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldNumber
                        label="Overload alert sessions"
                        value={settings.overloadAlertSessions}
                        min={1}
                        max={12}
                        onChange={(value) => updateSetting("overloadAlertSessions", value)}
                      />
                      <FieldNumber
                        label="Cancellation rate alert (%)"
                        value={settings.cancellationRateAlert}
                        min={1}
                        max={100}
                        onChange={(value) => updateSetting("cancellationRateAlert", value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Notification toggles</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ToggleCard
                        title="Notify new booking"
                        description="Receive a notification when a new booking enters the manager flow."
                        checked={settings.notifyNewBooking}
                        onChange={(checked) => updateSetting("notifyNewBooking", checked)}
                      />
                      <ToggleCard
                        title="Notify delayed session"
                        description="Receive a notification when an active wash session exceeds the delay threshold."
                        checked={settings.notifyDelayedSession}
                        onChange={(checked) => updateSetting("notifyDelayedSession", checked)}
                      />
                      <ToggleCard
                        title="Notify staff transfer"
                        description="Receive a notification when a wash session is reassigned between staff."
                        checked={settings.notifyStaffTransfer}
                        onChange={(checked) => updateSetting("notifyStaffTransfer", checked)}
                      />
                      <ToggleCard
                        title="Notify completion"
                        description="Receive a notification when a wash session is completed."
                        checked={settings.notifyCompletion}
                        onChange={(checked) => updateSetting("notifyCompletion", checked)}
                      />
                    </div>
                  </div>
                </div>

                {saveSettingsMutation.isError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {getErrorMessage(saveSettingsMutation.error)}
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end">
                  <Button type="button" disabled={saveSettingsMutation.isPending || !hasUnsavedAlertSettings} onClick={handleSaveAlertSettings}>
                    {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save alert settings
                  </Button>
                </div>
              </ManagerSettingsSection>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create notice template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FieldInput
              label="Template name"
              value={newTemplate.displayName}
              onChange={(value) => setNewTemplate((current) => ({ ...current, displayName: value }))}
              placeholder="Example: Delay alert"
            />
            <FieldInput
              label="Description"
              value={newTemplate.description}
              onChange={(value) => setNewTemplate((current) => ({ ...current, description: value }))}
              placeholder="Short explanation for managers"
            />
            <FieldTextarea
              label="Template message"
              value={newTemplate.message}
              onChange={(value) => setNewTemplate((current) => ({ ...current, message: value }))}
              placeholder="Message staff should receive"
            />
            <FieldTextarea
              label="Preview"
              value={newTemplate.preview}
              onChange={(value) => setNewTemplate((current) => ({ ...current, preview: value }))}
              placeholder="Optional preview text"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saveSettingsMutation.isPending} onClick={handleCreateTemplate}>
              {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

function ManagerSettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  isExpanded,
  onToggle,
}: {
  id: ManagerSettingsSectionId;
  icon: typeof Settings2;
  title: string;
  description: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: ManagerSettingsSectionId) => void;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card shadow-sm transition-all">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
        onClick={() => onToggle(id)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>
      {isExpanded ? <div className="border-t border-border/40 p-4">{children}</div> : null}
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const fieldId = toFieldId(label);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const fieldId = toFieldId(label);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <textarea
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-32 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const fieldId = toFieldId(label);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={fieldId}
        name={fieldId}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clampNumber(event.target.value, min, max, value))}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  const fieldId = toFieldId(label);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.7rem top 50%",
          backgroundSize: "0.65rem auto",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriorityButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: PriorityLevel;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const styles = {
    normal: active ? "border-cyan-500 bg-cyan-500 text-white shadow-md shadow-cyan-200" : "border-cyan-200 bg-white text-teal-700",
    important: active ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-200" : "border-amber-200 bg-white text-amber-700",
    urgent: active ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-200" : "border-rose-200 bg-white text-rose-700",
  }[tone];

  return (
    <button type="button" className={`h-11 rounded-xl border text-sm font-black transition ${styles}`} onClick={onClick}>
      {children}
    </button>
  );
}

function toFieldId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function clampNumber(raw: string, min: number, max: number, fallback: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
