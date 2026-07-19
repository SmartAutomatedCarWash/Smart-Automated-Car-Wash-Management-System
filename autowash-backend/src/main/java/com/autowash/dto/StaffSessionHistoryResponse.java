package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record StaffSessionHistoryResponse(
        Summary summary,
        List<Item> items,
        Pagination pagination
) {

    @Builder
    public record Summary(
            int completedTotal,
            int completedToday,
            Integer averageDurationMinutes,
            Double averageRating,
            int reviewedCount,
            int unreviewedCount
    ) {
    }

    @Builder
    public record Item(
            UUID sessionId,
            String bookingId,
            String customerName,
            String customerPhone,
            String vehiclePlate,
            String packageId,
            String servicePackage,
            UUID assignedStaffId,
            String assignedStaffName,
            String status,
            LocalDate bookingDate,
            String bookingTime,
            Instant checkedInAt,
            Instant startedAt,
            Instant completedAt,
            Integer durationMinutes,
            String managerNotes,
            String customerNotes,
            Review review
    ) {
    }

    @Builder
    public record Review(
            boolean hasReview,
            String id,
            Integer rating,
            String comment,
            String beforeImageUrl,
            String afterImageUrl,
            Instant createdAt
    ) {
    }

    @Builder
    public record Pagination(
            int page,
            int limit,
            long totalItems,
            int totalPages
    ) {
    }
}
