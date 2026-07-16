import { apiRequest } from "@/shared/lib/api";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";
export type CampaignTargetAudience = "ALL_CUSTOMERS" | "TIER_BRONZE" | "TIER_SILVER" | "TIER_GOLD" | "TIER_PLATINUM" | "TIER_DIAMOND" | "INDIVIDUALS";
export type NotificationType = "BOOKING_CREATED" | "BOOKING_CONFIRMED" | "WASH_CHECKED_IN" | "WASH_COMPLETED" | "BOOKING_REMINDER" | "NO_SHOW" | "LOYALTY" | "VOUCHER_EXPIRY" | "SYSTEM" | "PROMOTION";

export interface NotificationCampaignResponse {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: CampaignTargetAudience;
  targetDetails?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  successCount: number;
  failedCount: number;
  createdAt: string;
}

export interface NotificationCampaignRequest {
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: CampaignTargetAudience;
  targetDetails?: string;
  scheduledAt?: string;
}

export interface CampaignPage {
  content: NotificationCampaignResponse[];
  totalPages: number;
  totalElements: number;
}

export const adminNotificationCampaignsService = {
  getCampaigns: async (page = 1, limit = 10) => {
    return apiRequest<CampaignPage>({
      url: `/admin/notification-campaigns`,
      method: "GET",
      params: { page, limit },
    });
  },
  createCampaign: async (data: NotificationCampaignRequest) => {
    return apiRequest<NotificationCampaignResponse>({
      url: `/admin/notification-campaigns`,
      method: "POST",
      data,
    });
  },
};
