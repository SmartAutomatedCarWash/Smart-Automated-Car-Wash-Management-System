import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type SystemSettings = {
  operatingStartTime: string;
  operatingEndTime: string;
  maxAdvanceBookingDays: number;
  noShowGraceMinutes: number;
  maxBookingsPerTimeSlot: number;
  currency: string;
  earnPointsUnitAmount: number;
  vndPerPoint: number;
  minRedemptionPoints: number;
  maxRedemptionPoints: number;
  updatedAt: string;
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await apiClient.get<ApiSuccessResponse<SystemSettings>>("/admin/settings");
  return response.data.data;
}

export function updateSystemSettings(payload: Omit<SystemSettings, "updatedAt">) {
  return apiRequest<SystemSettings, Omit<SystemSettings, "updatedAt">>({
    method: "PUT",
    url: "/admin/settings",
    data: payload,
  });
}
