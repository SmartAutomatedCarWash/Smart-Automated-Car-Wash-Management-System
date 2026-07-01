import type {
  AuthResponseData,
  AuthSession,
  AuthUser,
  UserRole,
} from "@/entities/auth";
import type { UserProfile } from "@/entities/users";

const AUTH_REDIRECT_PATH: Record<UserRole, string> = {
  CUSTOMER: "/customer/home",
  STAFF: "/staff/dashboard",
  ADMIN: "/admin/dashboard",
};

export function getAuthRedirectPath(role: UserRole) {
  return AUTH_REDIRECT_PATH[role];
}

export function isCustomerRole(role: UserRole) {
  return role === "CUSTOMER";
}

export function buildAuthSession(data: AuthResponseData): AuthSession {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
    expiresIn: data.expiresIn,
    user: {
      userId: data.userId,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl ?? null,
      phone: data.phone ?? "",
      email: data.email ?? null,
      role: data.role,
      status: data.status,
      tier: data.tier ?? null,
      loyaltyBalance: data.loyaltyBalance ?? null,
      isNewCustomer: data.isNewCustomer ?? false,
    },
  };
}

export function applyProfileToAuthUser(user: AuthUser, profile: UserProfile): AuthUser {
  return {
    ...user,
    userId: profile.userId,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone ?? "",
    email: profile.email,
    role: profile.role,
    status: profile.status,
    tier: profile.tier,
    loyaltyBalance: profile.loyaltyBalance,
    isNewCustomer: profile.isNewCustomer,
  };
}

export function isAuthUserInSyncWithProfile(user: AuthUser, profile: UserProfile) {
  return (
    user.userId === profile.userId &&
    user.fullName === profile.fullName &&
    user.avatarUrl === profile.avatarUrl &&
    user.phone === (profile.phone ?? "") &&
    user.email === profile.email &&
    user.role === profile.role &&
    user.status === profile.status &&
    user.tier === profile.tier &&
    user.loyaltyBalance === profile.loyaltyBalance &&
    user.isNewCustomer === profile.isNewCustomer
  );
}
