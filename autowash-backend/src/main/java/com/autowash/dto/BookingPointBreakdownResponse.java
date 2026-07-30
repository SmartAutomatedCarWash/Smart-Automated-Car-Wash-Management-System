package com.autowash.dto;

public record BookingPointBreakdownResponse(
        String bookingId,
        int bookingPoints,
        int reviewPoints,
        int totalPoints
) {
}
