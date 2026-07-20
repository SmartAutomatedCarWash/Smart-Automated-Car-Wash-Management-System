package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;

public record SlotAvailabilityResponse(
        LocalDate bookingDate,
        String bookingTime,
        Instant slotTime,
        int capacity,
        long bookedCount,
        long heldCount,
        long remaining,
        boolean available
) {
}
