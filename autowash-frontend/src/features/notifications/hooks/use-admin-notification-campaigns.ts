import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminNotificationCampaignsService, NotificationCampaignRequest } from "../api/admin-notification-campaigns-service";
import { toast } from "sonner";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export const NOTIFICATION_CAMPAIGNS_QUERY_KEY = ["admin-notification-campaigns"];

export function useAdminNotificationCampaigns(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...NOTIFICATION_CAMPAIGNS_QUERY_KEY, page, limit],
    queryFn: () => adminNotificationCampaignsService.getCampaigns(page, limit),
  });
}

export function useCreateNotificationCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationCampaignRequest) => adminNotificationCampaignsService.createCampaign(data),
    onSuccess: () => {
      toast.success("Chiến dịch thông báo đã được tạo!");
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_CAMPAIGNS_QUERY_KEY });
    },
  });
}
