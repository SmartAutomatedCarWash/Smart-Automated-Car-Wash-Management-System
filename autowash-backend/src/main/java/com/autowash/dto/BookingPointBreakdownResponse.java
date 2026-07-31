package com.autowash.dto;

import java.math.BigDecimal;

public record BookingPointBreakdownResponse(
        String bookingId,
        int basePoints,
        BigDecimal pointMultiplier,
        int bookingPoints,
        int reviewPoints,
        int totalPoints
) {
}
