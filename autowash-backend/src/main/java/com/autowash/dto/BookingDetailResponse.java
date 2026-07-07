package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record BookingDetailResponse(
        String bookingId,
        String confirmationNumber,
        String customerId,
        String customerName,
        String customerPhone,
        String vehicleId,
        String vehiclePlate,
        String vehicleBrand,
        String vehicleModel,
        String packageId,
        String packageName,
        List<BookingOptionResponse> options,
        Pricing pricing,
        Scheduling scheduling,
        Payment payment,
        String status,
        String confirmationStatus,
        Instant confirmationExpiresAt,
        String washSessionId,
        String staffName,
        String washStatus,
        String notes,
        Instant createdAt,
        String devOtp,
        List<BookingStatusHistoryItem> statusHistory
) {
    public record Pricing(
            long basePrice,
            long optionsTotal,
            long subtotal,
            String voucherCode,
            long voucherDiscount,
            long finalAmount,
            String currency
    ) {}

    public record Scheduling(
            LocalDate bookingDate,
            String bookingTime,
            int estimatedDuration,
            String estimatedEndTime
    ) {}

    public record Payment(
            String method,
            String status,
            String transactionId,
            Instant paidAt
    ) {}
}
