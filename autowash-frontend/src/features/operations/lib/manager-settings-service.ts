import { apiRequest } from "@/shared/lib/api";
import { getAccessToken } from "@/features/auth/store/auth.store";

export type ManagerOperationSettingsPayload = {
  autoAssignEnabled: boolean;
  leastBusyStaffFirst: boolean;
  respectStaffCapacity: boolean;
  maxActiveSessionsPerStaff: number;
  paidBookingPriority: boolean;
  tierPriorityEnabled: boolean;
  primaryVehiclePriority: boolean;
  earlyCheckInMinutes: number;
  lateGraceMinutes: number;
  waitingAlertMinutes: number;
  delayAlertMinutes: number;
  overloadAlertSessions: number;
  cancellationRateAlert: number;
  notifyNewBooking: boolean;
  notifyDelayedSession: boolean;
  notifyStaffTransfer: boolean;
  notifyCompletion: boolean;
};

export type ManagerNotificationTemplatePayload = {
  templateKey: string;
  displayName: string;
  description: string;
  message: string;
  preview: string;
};

export type ManagerSettingAuditLog = {
  id: string;
  title: string;
  detail: string;
  actorName: string | null;
  createdAt: string;
};

export type ManagerSettingsResponse = {
  settings: ManagerOperationSettingsPayload;
  templates: ManagerNotificationTemplatePayload[];
  auditLogs: ManagerSettingAuditLog[];
  updatedAt: string;
};

export type UpdateManagerSettingsRequest = {
  settings: ManagerOperationSettingsPayload;
  templates: ManagerNotificationTemplatePayload[];
};

const DEFAULT_DEMO_SETTINGS: ManagerOperationSettingsPayload = {
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

const DEFAULT_DEMO_TEMPLATES: ManagerNotificationTemplatePayload[] = [
  {
    templateKey: "newBooking",
    displayName: "New booking",
    description: "Sent when a booking is waiting for manager intake.",
    message: "A new booking is waiting for manager intake. Please review the queue and create a wash session.",
    preview: "Example: Vehicle 51F-456.89 - Ultimate Detail is waiting for intake.",
  },
  {
    templateKey: "delay",
    displayName: "Delayed session",
    description: "Sent when a wash session exceeds the configured delay threshold.",
    message: "A wash session is taking longer than expected. Please review bay progress and update the customer if needed.",
    preview: "Example: Vehicle 51F-456.89 is taking longer than expected.",
  },
  {
    templateKey: "assignStaff",
    displayName: "Staff assignment",
    description: "Sent when a manager assigns or reassigns a wash session to a staff member.",
    message: "A wash session has been assigned to a staff member. Please continue tracking the wash progress.",
    preview: "Example: Vehicle 51F-456.89 has been reassigned to Le Van Hai.",
  },
];

let demoSettings: ManagerSettingsResponse = {
  settings: DEFAULT_DEMO_SETTINGS,
  templates: DEFAULT_DEMO_TEMPLATES,
  auditLogs: [],
  updatedAt: new Date().toISOString(),
};

export function getManagerSettings() {
  if (isManagerDemoToken()) {
    return Promise.resolve(demoSettings);
  }

  return apiRequest<ManagerSettingsResponse>({
    method: "GET",
    url: "/manager/settings",
  });
}

export function updateManagerSettings(data: UpdateManagerSettingsRequest) {
  if (isManagerDemoToken()) {
    const now = new Date().toISOString();
    demoSettings = {
      settings: data.settings,
      templates: data.templates,
      auditLogs: [
        {
          id: `demo-manager-settings-${Date.now()}`,
          title: "Operational settings saved",
          detail: "Demo manager saved assignment, alert, check-in, priority, and notification settings.",
          actorName: "Manager Demo",
          createdAt: now,
        },
        ...demoSettings.auditLogs,
      ].slice(0, 20),
      updatedAt: now,
    };
    return Promise.resolve(demoSettings);
  }

  return apiRequest<ManagerSettingsResponse, UpdateManagerSettingsRequest>({
    method: "PUT",
    url: "/manager/settings",
    data,
  });
}

function isManagerDemoToken() {
  return getAccessToken() === "mock-token-manager";
}
