import assert from "node:assert/strict";
import test from "node:test";
import {
  applyProfileToAuthUser,
  buildAuthSession,
  getAuthRedirectPath,
  isAuthUserInSyncWithProfile,
  isCustomerRole,
} from "./auth-session.ts";

test("maps customer role to the customer workspace home", () => {
  assert.equal(getAuthRedirectPath("CUSTOMER"), "/customer/home");
});

test("maps staff role to the staff workspace dashboard", () => {
  assert.equal(getAuthRedirectPath("STAFF"), "/staff/dashboard");
});

test("maps admin role to the admin workspace dashboard", () => {
  assert.equal(getAuthRedirectPath("ADMIN"), "/admin/dashboard");
});

test("accepts customer role for customer auth flow", () => {
  assert.equal(isCustomerRole("CUSTOMER"), true);
});

test("rejects non-customer role for customer auth flow", () => {
  assert.equal(isCustomerRole("STAFF"), false);
});

test("builds auth session from API auth payload", () => {
  const session = buildAuthSession({
    userId: "user_123",
    fullName: "Nguyen Van A",
    phone: "0901234567",
    email: "nguyenvana@example.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    tier: "MEMBER",
    loyaltyBalance: 10,
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
  });

  assert.deepEqual(session, {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    user: {
      userId: "user_123",
      fullName: "Nguyen Van A",
      avatarUrl: null,
      phone: "0901234567",
      email: "nguyenvana@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      loyaltyBalance: 10,
      isNewCustomer: false,
    },
  });
});

test("normalizes a missing phone number from Google auth payload to an empty string", () => {
  const session = buildAuthSession({
    userId: "user_google",
    fullName: "Google Customer",
    phone: null,
    email: "google@example.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    tier: "MEMBER",
    loyaltyBalance: 0,
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
  });

  assert.equal(session.user.phone, "");
});

test("normalizes a missing phone number from profile payload to an empty string", () => {
  const user = applyProfileToAuthUser(
    {
      userId: "user_123",
      fullName: "Existing User",
      avatarUrl: null,
      phone: "0901234567",
      email: "old@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      loyaltyBalance: 10,
      isNewCustomer: true,
    },
    {
      userId: "user_123",
      fullName: "Existing User",
      avatarUrl: null,
      phone: null,
      email: "old@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      isNewCustomer: true,
      loyaltyBalance: 10,
      registeredAt: "2026-05-25T00:00:00Z",
      preferences: {
        userId: "user_123",
        language: "VI",
        theme: "LIGHT",
        notificationsEnabled: true,
        emailNotifications: false,
        smsNotifications: true,
      },
      hasGoogleAuth: false,
    },
  );

  assert.equal(user.phone, "");
});

test("applies fresh profile fields onto the authenticated user for workspace sync", () => {
  const user = applyProfileToAuthUser(
    {
      userId: "user_123",
      fullName: "Old Name",
      avatarUrl: null,
      phone: "0901234567",
      email: "old@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      loyaltyBalance: 10,
      isNewCustomer: false,
    },
    {
      userId: "user_123",
      fullName: "New Name",
      avatarUrl: "https://cdn.example.com/avatar.png",
      phone: "0987654321",
      email: "new@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "SILVER",
      isNewCustomer: false,
      loyaltyBalance: 25,
      registeredAt: "2026-05-25T00:00:00Z",
      preferences: {
        userId: "user_123",
        language: "VI",
        theme: "LIGHT",
        notificationsEnabled: true,
        emailNotifications: false,
        smsNotifications: true,
      },
      hasGoogleAuth: false,
    },
  );

  assert.deepEqual(user, {
    userId: "user_123",
    fullName: "New Name",
    avatarUrl: "https://cdn.example.com/avatar.png",
    phone: "0987654321",
    email: "new@example.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    tier: "SILVER",
    loyaltyBalance: 25,
    isNewCustomer: false,
  });
});

test("detects when the auth user is already in sync with the profile payload", () => {
  assert.equal(
    isAuthUserInSyncWithProfile(
      {
        userId: "user_123",
        fullName: "Nguyen Van A",
        avatarUrl: "https://cdn.example.com/avatar.png",
        phone: "0901234567",
        email: "nguyenvana@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        tier: "MEMBER",
        loyaltyBalance: 10,
        isNewCustomer: false,
      },
      {
        userId: "user_123",
        fullName: "Nguyen Van A",
        avatarUrl: "https://cdn.example.com/avatar.png",
        phone: "0901234567",
        email: "nguyenvana@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        tier: "MEMBER",
        isNewCustomer: false,
        loyaltyBalance: 10,
        registeredAt: "2026-05-25T00:00:00Z",
        preferences: {
          userId: "user_123",
          language: "VI",
          theme: "LIGHT",
          notificationsEnabled: true,
          emailNotifications: false,
          smsNotifications: true,
        },
        hasGoogleAuth: false,
      },
    ),
    true,
  );
});

test("detects avatar changes when syncing auth user with profile payload", () => {
  assert.equal(
    isAuthUserInSyncWithProfile(
      {
        userId: "user_123",
        fullName: "Nguyen Van A",
        avatarUrl: null,
        phone: "0901234567",
        email: "nguyenvana@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        tier: "MEMBER",
        loyaltyBalance: 10,
        isNewCustomer: false,
      },
      {
        userId: "user_123",
        fullName: "Nguyen Van A",
        avatarUrl: "https://cdn.example.com/new-avatar.png",
        phone: "0901234567",
        email: "nguyenvana@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        tier: "MEMBER",
        isNewCustomer: false,
        loyaltyBalance: 10,
        registeredAt: "2026-05-25T00:00:00Z",
        preferences: {
          userId: "user_123",
          language: "VI",
          theme: "LIGHT",
          notificationsEnabled: true,
          emailNotifications: false,
          smsNotifications: true,
        },
        hasGoogleAuth: false,
      },
    ),
    false,
  );
});
