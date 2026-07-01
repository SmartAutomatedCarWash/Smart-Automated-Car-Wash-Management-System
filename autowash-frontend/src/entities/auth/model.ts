export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";
export type UserStatus = "ACTIVE" | "PENDING" | "PENDING_VERIFY" | "BLOCKED" | "SUSPENDED";
export type LoyaltyTier = "MEMBER" | "SILVER" | "GOLD" | "PLATINUM";

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export type RegisterResponseData = {
  userId: string;
  fullName: string;
  email: string;
  status: "PENDING_VERIFY";
  requiresOtpVerification: boolean;
  otpExpiresIn: number;
};

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type SendOtpRequest = {
  email: string;
};

export type SendOtpResponseData = {
  email: string;
  phone: string | null;
  otpExpiresIn: number;
  maskedEmail?: string;
  maskedPhone?: string;
  message?: string;
  devOtp?: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type VerifyForgotPasswordOtpRequest = VerifyOtpRequest;

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  newPassword: string;
  newPasswordConfirm: string;
};

export type AuthResponseData = {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  phone: string | null;
  email?: string;
  role: UserRole;
  status: UserStatus;
  tier?: LoyaltyTier;
  loyaltyBalance?: number;
  isNewCustomer?: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};

export type LoginResponseData = AuthResponseData;
export type VerifyOtpResponseData = AuthResponseData;

export type LogoutRequest = {
  refreshToken?: string | null;
};

export type AuthUser = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  tier: LoyaltyTier | null;
  loyaltyBalance: number | null;
  isNewCustomer: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  user: AuthUser;
};

export type GoogleAuthTicketStatus = "PENDING" | "LINK_REQUIRED" | "READY" | "CONSUMED" | "EXPIRED";

export type GoogleAuthTicketResponse = {
  state: string;
  status: GoogleAuthTicketStatus;
  providerEmail: string | null;
  providerFullName: string | null;
  providerAvatarUrl: string | null;
  returnUrl: string;
  userId: string | null;
  linkRequired: boolean;
  expired: boolean;
};

