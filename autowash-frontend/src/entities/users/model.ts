import type { LoyaltyTier, UserRole, UserStatus } from "@/entities/auth";

export type UserPreferenceLanguage = "VI" | "EN";
export type UserPreferenceTheme = "LIGHT" | "DARK";

export type UserPreferences = {
  userId: string;
  language: UserPreferenceLanguage;
  theme: UserPreferenceTheme;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

export type UserProfile = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  status: UserStatus;
  role: UserRole;
  tier: LoyaltyTier | null;
  hasGoogleAuth: boolean;
  isNewCustomer: boolean;
  loyaltyBalance: number;
  registeredAt: string;
  preferences: UserPreferences;
};

export type UpdateUserProfileRequest = {
  fullName: string;
  email: string | null;
  phone: string | null;
};

export type UpdateUserProfileResponse = {
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  updatedAt: string;
};

export type CreateAvatarUploadUrlRequest = {
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export type CreateAvatarUploadUrlResponse = {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
};

export type UpdateUserAvatarRequest = {
  objectKey: string;
};

export type UpdateUserAvatarResponse = {
  userId: string;
  avatarUrl: string;
  updatedAt: string;
};
