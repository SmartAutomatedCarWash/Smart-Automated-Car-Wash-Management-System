import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminNotificationCampaignsService, NotificationCampaignRequest } from "../api/admin-notification-campaigns-service";
import { notify } from "@/shared/lib/notify";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export const NOTIFICATION_CAMPAIGNS_QUERY_KEY = ["admin-notification-campaigns"];

export function useAdminNotificationCampaigns(page = 1, limit = 10, filters?: { type?: string; audience?: string; status?: string }) {
  return useQuery({
    queryKey: [...NOTIFICATION_CAMPAIGNS_QUERY_KEY, page, limit, filters],
    queryFn: () => adminNotificationCampaignsService.getCampaigns(page, limit, filters),
  });
}

export function useCreateNotificationCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationCampaignRequest) => adminNotificationCampaignsService.createCampaign(data),
    onSuccess: () => {
      notify.success("Notification campaign created successfully.");
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_CAMPAIGNS_QUERY_KEY });
    },
  });
}

export function useUpdateNotificationCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NotificationCampaignRequest }) => adminNotificationCampaignsService.updateCampaign(id, data),
    onSuccess: () => {
      notify.success("Notification campaign updated successfully.");
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_CAMPAIGNS_QUERY_KEY });
    },
  });
}

export function useDeleteNotificationCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminNotificationCampaignsService.deleteCampaign(id),
    onSuccess: () => {
      notify.success("Notification campaign deleted successfully.");
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_CAMPAIGNS_QUERY_KEY });
    },
  });
}
