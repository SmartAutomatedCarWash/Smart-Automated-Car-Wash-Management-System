package com.autowash.dto;


import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record AdminBookingResponse(
        String bookingId,
        String confirmationNumber,
        UUID customerId,
        String customerName,
        String customerPhone,
        String vehiclePlate,
        String servicePackageId,
        String servicePackageName,
        LocalDate bookingDate,
        LocalTime bookingTime,
        long finalAmount,
        String paymentMethod,
        String paymentStatus,
        String status,
        UUID sessionId,
        String washStatus,
        Instant createdAt,
        String staffName
) {
}

