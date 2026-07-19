package com.autowash.dto;

import com.autowash.entity.enums.DiscountAcquisitionMethod;
import com.autowash.entity.enums.UserDiscountStatus;
import java.time.Instant;
import java.util.UUID;

public record UserDiscountResponse(
        UUID id,
        DiscountResponse discount,
        DiscountAcquisitionMethod acquisitionMethod,
        int pointsSpent,
        Instant claimedAt,
        Instant expiresAt,
        UserDiscountStatus status,
        Instant usedAt,
        UUID usedInBookingId
) {
}
