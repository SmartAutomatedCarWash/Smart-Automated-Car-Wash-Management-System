package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;

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
        LocalDate dateOfBirth,
        boolean birthdayLocked,
        int loyaltyBalance,
        Instant registeredAt,
        UserPreferencesDto preferences
) {
}
