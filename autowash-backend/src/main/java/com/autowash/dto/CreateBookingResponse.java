package com.autowash.dto;


import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CreateBookingResponse(
        String bookingId,
        String customerId,
        String vehicleId,
        String vehiclePlate,
        String packageId,
        String packageName,
        List<BookingOptionResponse> options,
        long basePrice,
        long optionsTotal,
        long voucherDiscount,
        long finalAmount,
        LocalDate bookingDate,
        String bookingTime,
        int estimatedDuration,
        String paymentMethod,
        String paymentStatus,
        String status,
        String confirmationStatus,
        int otpExpiresIn,
        Instant otpExpiresAt,
        Instant createdAt,
        String confirmationNumber,
        String comboId,
        String customerComboId,
        boolean comboPurchased,
        String devOtp
) {
}

