import { apiRequest } from "@/shared/lib/api";
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
  return apiRequest<CreateWashSessionResponse, { bookingId: string; notes?: string }>({
    method: "POST",
    url: SESSION_BASE_URL,
    data: { bookingId, notes },
  });
}

export function getOperationsQueue() {
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
  return apiRequest<StaffOption[]>({
    method: "GET",
    url: "/operations/staff/active",
  });
}

export function getEligibleSessionBookings() {
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
  return apiRequest<CheckInWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/check-in`,
  });
}

export function startWashSession(sessionId: string) {
  return apiRequest<StartWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/start`,
  });
}

export function completeWashSession(sessionId: string) {
  return apiRequest<CompleteWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/complete`,
  });
}

export function transferWashSession(sessionId: string, toStaffId: string, reason?: string) {
  return apiRequest<TransferWashSessionResponse, { toStaffId: string; reason?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/transfer`,
    data: { toStaffId, reason },
  });
}

export function cancelWashSession(sessionId: string, reason: string, faultType?: string) {
  return apiRequest<CancelWashSessionResponse, { reason: string; faultType?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/cancel`,
    data: { reason, faultType },
  });
}
