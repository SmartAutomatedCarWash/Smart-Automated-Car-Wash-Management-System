import type { UpdateUserProfileRequest, UpdateUserProfileResponse, UserProfile } from "@/entities/users";

let demoManagerProfile: UserProfile = {
  userId: "demo-manager-001",
  fullName: "Mai Anh Manager",
  avatarUrl: null,
  phone: "0909090909",
  email: "manager@demo.com",
  status: "ACTIVE",
  role: "MANAGER",
  tier: null,
  hasGoogleAuth: false,
  isNewCustomer: false,
  loyaltyBalance: 0,
  registeredAt: "2026-07-01T08:00:00+07:00",
  preferences: {
    userId: "demo-manager-001",
    language: "VI",
    theme: "LIGHT",
    notificationsEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
  },
};

export function isManagerDemoAccessToken(token: string | null) {
  return token === "mock-token-manager";
}

export async function getDemoManagerProfile(): Promise<UserProfile> {
  return { ...demoManagerProfile };
}

export async function updateDemoManagerProfile(
  payload: UpdateUserProfileRequest,
): Promise<UpdateUserProfileResponse> {
  const updatedAt = new Date().toISOString();

  demoManagerProfile = {
    ...demoManagerProfile,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
  };

  return {
    userId: demoManagerProfile.userId,
    fullName: demoManagerProfile.fullName,
    phone: demoManagerProfile.phone,
    email: demoManagerProfile.email,
    updatedAt,
  };
}
