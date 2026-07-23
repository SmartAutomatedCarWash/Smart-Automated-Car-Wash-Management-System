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
        String confirmationEmail,
        String vehicleId,
        String vehiclePlate,
        String vehicleBrand,
        String vehicleModel,
        String primaryItemName,
        List<BookingDetailDto> details,
        Pricing pricing,
        Scheduling scheduling,
        Payment payment,
        String status,
        String confirmationStatus,
        Instant confirmationExpiresAt,
        String washSessionId,
        String staffName,
        List<StaffAssignment> assignedStaff,
        String washStatus,
        String notes,
        Instant createdAt,
        String devOtp,
        List<BookingStatusHistoryItem> statusHistory,
        ReviewInfo review
) {
    public record Pricing(
            long subtotal,
            String discountCode,
            long discountAmount,
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
            Instant paidAt,
            String qrUrl,
            String bankCode,
            String accountNumber,
            String accountName,
            String transferDescription
    ) {}

    public record StaffAssignment(
            String staffId,
            String staffName,
            int sortOrder
    ) {}

    public record ReviewInfo(
            Double rating,
            String comment,
            Instant createdAt
    ) {}
}
