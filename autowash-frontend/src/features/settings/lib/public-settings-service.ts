import { apiClient } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type PublicSettings = {
  operatingStartTime: string; // "HH:mm"
  operatingEndTime: string;   // "HH:mm"
  maxBookingsPerTimeSlot: number;
};

export async function getPublicSettings(): Promise<PublicSettings> {
  const response = await apiClient.get<ApiSuccessResponse<PublicSettings>>("/settings/public");
  return response.data.data;
}
