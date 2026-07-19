package com.autowash.dto;

import java.util.UUID;

public record BookingDetailDto(
        UUID id,
        String itemType,
        UUID refId,
        String snapshotName,
        long snapshotPrice,
        int quantity,
        long subtotal,
        int durationMinutes
) {
}
