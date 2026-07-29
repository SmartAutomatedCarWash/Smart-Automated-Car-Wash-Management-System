package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;

public record CustomerComboUsageResponse(
        long usageId,
        String bookingId,
        LocalDate bookingDate,
        String vehiclePlate,
        Instant usedAt
) {
}
