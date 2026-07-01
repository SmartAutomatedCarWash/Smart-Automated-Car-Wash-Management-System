package com.autowash.dto;

import java.time.Instant;

public record UserProfileResponse(
        String userId,
        String fullName,
        String avatarUrl,
        String phone,
        String email,
        String status,
        String role,
        String tier,
        boolean hasGoogleAuth,
        boolean isNewCustomer,
        int loyaltyBalance,
        Instant registeredAt,
        UserPreferencesDto preferences
) {
}
