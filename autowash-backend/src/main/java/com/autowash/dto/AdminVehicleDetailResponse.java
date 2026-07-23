package com.autowash.dto;

import java.time.LocalDate;
import java.util.List;

public record AdminVehicleDetailResponse(
        String vehicleId,
        String plate,
        String brand,
        String model,
        String color,
        String ownerName,
        String ownerPhone,
        List<VehicleBookingHistoryItem> bookingHistory
) {
    public record VehicleBookingHistoryItem(
            String bookingId,
            String confirmationNumber,
            LocalDate bookingDate,
            String bookingTime,
            String primaryItemName,
            long finalAmount,
            String status
    ) {}
}
