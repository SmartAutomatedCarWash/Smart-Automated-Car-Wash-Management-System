import { apiRequest } from "@/shared/lib/api";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";
export type CampaignTargetAudience = "ALL_CUSTOMERS" | "TIER_BRONZE" | "TIER_SILVER" | "TIER_GOLD" | "TIER_PLATINUM" | "TIER_DIAMOND" | "INDIVIDUALS";
export type NotificationType = "SYSTEM" | "WARNING";

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
  getCampaigns: async (page = 1, limit = 10, filters?: { type?: string; audience?: string; status?: string }) => {
    return apiRequest<CampaignPage>({
      url: `/admin/notification-campaigns`,
      method: "GET",
      params: { page, limit, ...filters },
    });
  },
  createCampaign: async (data: NotificationCampaignRequest) => {
    return apiRequest<NotificationCampaignResponse>({
      url: `/admin/notification-campaigns`,
      method: "POST",
      data,
    });
  },
  updateCampaign: async (id: string, data: NotificationCampaignRequest) => {
    return apiRequest<NotificationCampaignResponse>({
      url: `/admin/notification-campaigns/${id}`,
      method: "PUT",
      data,
    });
  },
  deleteCampaign: async (id: string) => {
    return apiRequest<void>({
      url: `/admin/notification-campaigns/${id}`,
      method: "DELETE",
    });
  },
};
