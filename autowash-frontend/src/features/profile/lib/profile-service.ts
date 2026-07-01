import axios from "axios";
import { apiRequest } from "@/shared/lib/api";
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
  await axios.put(uploadUrl, file, {
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
