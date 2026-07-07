import axios from "axios";
import { apiClient, apiRequest } from "@/shared/lib/api";
import type {
  CreateAvatarUploadUrlRequest,
  CreateAvatarUploadUrlResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
  UserProfile,
} from "@/entities/users";

export function getCustomerProfile() {
  return apiRequest<UserProfile>({
    method: "GET",
    url: "/users/profile",
  });
}

export function updateCustomerProfile(payload: UpdateUserProfileRequest) {
  return apiRequest<UpdateUserProfileResponse, UpdateUserProfileRequest>({
    method: "PUT",
    url: "/users/profile",
    data: payload,
  });
}

export function createCustomerAvatarUploadUrl(payload: CreateAvatarUploadUrlRequest) {
  return apiRequest<CreateAvatarUploadUrlResponse, CreateAvatarUploadUrlRequest>({
    method: "POST",
    url: "/users/profile/avatar/upload-url",
    data: payload,
  });
}

export async function uploadAvatarFile(uploadUrl: string, file: File, contentType: string) {
  if (uploadUrl.startsWith("http://localhost:8080") || uploadUrl.startsWith("http://127.0.0.1:8080")) {
    const url = new URL(uploadUrl);
    await apiClient.put(`${url.pathname}${url.search}`, file, {
      headers: {
        "Content-Type": contentType,
      },
    });
    return;
  }

  // Use Next.js proxy to bypass MinIO CORS
  const proxyUrl = uploadUrl.replace(/^http:\/\/(127\.0\.0\.1|localhost):9000/, '/minio-api');

  await axios.put(proxyUrl, file, {
    headers: {
      "Content-Type": contentType,
    },
  });
}

export function updateCustomerAvatar(payload: UpdateUserAvatarRequest) {
  return apiRequest<UpdateUserAvatarResponse, UpdateUserAvatarRequest>({
    method: "PUT",
    url: "/users/profile/avatar",
    data: payload,
  });
}
