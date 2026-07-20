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
} from "@/features/operations/lib/operations-demo-data";
import type {
  CheckInWashSessionResponse,
  CompleteSessionRequest,
  CompleteSessionResponse,
  CompleteWashSessionResponse,
  CreateWashSessionResponse,
  EligibleSessionBooking,
  OperationsQueue,
  QueueWashSessionResponse,
  StaffDashboardSummary,
  StaffOption,
  StaffSessionHistoryParams,
  StaffSessionHistoryResponse,
  StaffTodayResponse,
  StartSessionRequest,
  StartSessionResponse,
  StartWashSessionResponse,
  CancelWashSessionResponse,
  TransferWashSessionResponse,
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

export function transferWashSession(sessionId: string, toStaffId: string, reason?: string) {
  return apiRequest<TransferWashSessionResponse, { toStaffId: string; reason?: string }>({
    method: "POST",
    url: `/manager/operations/sessions/${sessionId}/transfer`,
    data: { toStaffId, reason },
  });
}

// ─── Staff Today (My Sessions) ────────────────────────────────────────────────

export function getStaffSessionHistory(params: StaffSessionHistoryParams = {}) {
  return apiRequest<StaffSessionHistoryResponse>({
    method: "GET",
    url: "/operations/my-sessions/history",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 5,
      period: params.period ?? "ALL",
      ...(params.date && { date: params.date }),
      ...(params.servicePackage && { servicePackage: params.servicePackage }),
      rating: params.rating ?? "ALL",
      ...(params.search && { search: params.search }),
      sort: params.sort ?? "COMPLETED_DESC",
    },
  });
}

export function getManagerSessionHistory(params: StaffSessionHistoryParams = {}) {
  return apiRequest<StaffSessionHistoryResponse>({
    method: "GET",
    url: "/operations/manager/sessions/history",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 5,
      period: params.period ?? "ALL",
      ...(params.date && { date: params.date }),
      ...(params.servicePackage && { servicePackage: params.servicePackage }),
      rating: params.rating ?? "ALL",
      ...(params.search && { search: params.search }),
      sort: params.sort ?? "COMPLETED_DESC",
      ...(params.staffId && { staffId: params.staffId }),
    },
  });
}

export function getStaffTodaySessions(date?: string) {
  const params = date ? { date } : undefined;
  return apiRequest<StaffTodayResponse>({
    method: "GET",
    url: "/operations/my-sessions/today",
    params,
  });
}

export function startStaffSession(sessionId: string) {
  const payload: StartSessionRequest = { startedAt: new Date().toISOString() };
  return apiRequest<StartSessionResponse, StartSessionRequest>({
    method: "POST",
    url: `/operations/sessions/${sessionId}/start`,
    data: payload,
  });
}

export function completeStaffSession(sessionId: string, staffNote?: string) {
  const payload: CompleteSessionRequest = {
    completedAt: new Date().toISOString(),
    staffNote,
  };
  return apiRequest<CompleteSessionResponse, CompleteSessionRequest>({
    method: "POST",
    url: `/operations/sessions/${sessionId}/complete`,
    data: payload,
  });
}
