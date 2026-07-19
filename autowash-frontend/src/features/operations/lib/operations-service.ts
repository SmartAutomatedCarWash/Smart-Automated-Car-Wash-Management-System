import { apiRequest } from "@/shared/lib/api";
import { getAccessToken } from "@/features/auth/store/auth.store";
import {
  cancelDemoWashSession,
  checkInDemoWashSession,
  completeDemoWashSession,
  createDemoWashSession,
  getDemoActiveStaffOptions,
  getDemoEligibleSessionBookings,
  getDemoOperationsQueue,
  isManagerDemoToken,
  startDemoWashSession,
  transferDemoWashSession,
} from "@/features/operations/lib/operations-demo-data";
import type {
  CheckInWashSessionResponse,
  CompleteWashSessionResponse,
  CreateWashSessionResponse,
  EligibleSessionBooking,
  OperationsQueue,
  QueueWashSessionResponse,
  StaffDashboardSummary,
  StaffOption,
  StartWashSessionResponse,
  TransferWashSessionResponse,
  CancelWashSessionResponse,
} from "@/entities/operations";

const SESSION_BASE_URL = "/operations/sessions";

export function createWashSession(bookingId: string, notes?: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return createDemoWashSession(bookingId);
  }

  return apiRequest<CreateWashSessionResponse, { bookingId: string; notes?: string }>({
    method: "POST",
    url: SESSION_BASE_URL,
    data: { bookingId, notes },
  });
}

export function getOperationsQueue() {
  if (isManagerDemoToken(getAccessToken())) {
    return getDemoOperationsQueue();
  }

  return apiRequest<OperationsQueue>({
    method: "GET",
    url: "/operations/queue",
  });
}

export function getStaffDashboardSummary() {
  return apiRequest<StaffDashboardSummary>({
    method: "GET",
    url: "/operations/staff/summary",
  });
}

export function getActiveStaffOptions() {
  if (isManagerDemoToken(getAccessToken())) {
    return getDemoActiveStaffOptions();
  }

  return apiRequest<StaffOption[]>({
    method: "GET",
    url: "/operations/staff/active",
  });
}

export function getEligibleSessionBookings() {
  if (isManagerDemoToken(getAccessToken())) {
    return getDemoEligibleSessionBookings();
  }

  return apiRequest<EligibleSessionBooking[]>({
    method: "GET",
    url: "/operations/bookings/eligible-sessions",
    params: { limit: 20 },
  });
}

export function queueWashSession(sessionId: string) {
  return apiRequest<QueueWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/queue`,
  });
}

export function checkInWashSession(sessionId: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return checkInDemoWashSession(sessionId);
  }

  return apiRequest<CheckInWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/check-in`,
  });
}

export function startWashSession(sessionId: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return startDemoWashSession(sessionId);
  }

  return apiRequest<StartWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/start`,
  });
}

export function completeWashSession(sessionId: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return completeDemoWashSession(sessionId);
  }

  return apiRequest<CompleteWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/complete`,
  });
}

export function transferWashSession(sessionId: string, toStaffId: string, reason?: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return transferDemoWashSession(sessionId, toStaffId, reason);
  }

  return apiRequest<TransferWashSessionResponse, { toStaffId: string; reason?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/transfer`,
    data: { toStaffId, reason },
  });
}

export function cancelWashSession(sessionId: string, reason: string, faultType?: string) {
  if (isManagerDemoToken(getAccessToken())) {
    return cancelDemoWashSession(sessionId, reason);
  }

  return apiRequest<CancelWashSessionResponse, { reason: string; faultType?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/cancel`,
    data: { reason, faultType },
  });
}
