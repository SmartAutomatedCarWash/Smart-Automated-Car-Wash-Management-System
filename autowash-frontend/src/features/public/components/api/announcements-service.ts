import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

export type Announcement = {
  id: string;
  title: string;
  message: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  type: string;
  active: boolean;
  priority: number;
  expiresAt: string | null;
  createdAt: string;
};

export type AnnouncementRequest = {
  title: string;
  message: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  type: string;
  active: boolean;
  priority: number;
  expiresAt: string | null;
};

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const res = await apiClient.get<ApiSuccessResponse<Announcement[]>>(
    "/public/announcements/active"
  );
  return res.data.data;
}

export async function fetchAdminAnnouncements(): Promise<Announcement[]> {
  const res = await apiClient.get<ApiSuccessResponse<Announcement[]>>(
    "/admin/announcements"
  );
  return res.data.data;
}

export function createAnnouncement(payload: AnnouncementRequest) {
  return apiRequest<Announcement, AnnouncementRequest>({
    method: "POST",
    url: "/admin/announcements",
    data: payload,
  });
}

export function updateAnnouncement(id: string, payload: AnnouncementRequest) {
  return apiRequest<Announcement, AnnouncementRequest>({
    method: "PUT",
    url: `/admin/announcements/${id}`,
    data: payload,
  });
}

export function deleteAnnouncement(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: `/admin/announcements/${id}`,
  });
}
