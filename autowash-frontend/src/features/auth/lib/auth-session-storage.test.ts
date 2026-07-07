import assert from "node:assert/strict";
import test from "node:test";
import { deserializeAuthState, serializeAuthState } from "./auth-session-storage.ts";

test("serializes auth session to a persisted payload", () => {
  const originalNow = Date.now;
  Date.now = () => 1_000_000;

  const payload = serializeAuthState({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    user: {
      userId: "user_123",
      fullName: "Nguyen Van A",
      phone: "0901234567",
      email: "nguyenvana@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      loyaltyBalance: 10,
      isNewCustomer: false,
      avatarUrl: null,
    },
  });

  Date.now = originalNow;

  assert.deepEqual(JSON.parse(payload), {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_000_000 + 3_600_000,
    user: {
      userId: "user_123",
      fullName: "Nguyen Van A",
      phone: "0901234567",
      email: "nguyenvana@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      tier: "MEMBER",
      loyaltyBalance: 10,
      isNewCustomer: false,
      avatarUrl: null,
    },
  });
});

test("restores persisted auth state from storage json", () => {
  assert.deepEqual(
    deserializeAuthState(
      JSON.stringify({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 123456789,
        user: {
          userId: "user_123",
          fullName: "Nguyen Van A",
          phone: "0901234567",
          email: "nguyenvana@example.com",
          role: "CUSTOMER",
          status: "ACTIVE",
          tier: "MEMBER",
          loyaltyBalance: 10,
          isNewCustomer: false,
          avatarUrl: null,
        },
      }),
    ),
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 123456789,
      user: {
        userId: "user_123",
        fullName: "Nguyen Van A",
        phone: "0901234567",
        email: "nguyenvana@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        tier: "MEMBER",
        loyaltyBalance: 10,
        isNewCustomer: false,
        avatarUrl: null,
      },
    },
  );
});
