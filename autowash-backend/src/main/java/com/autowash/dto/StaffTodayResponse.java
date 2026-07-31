package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record StaffTodayResponse(
        StaffInfo staff,
        LocalDate date,
        int autoRefreshSeconds,
        Metrics metrics,
        List<SessionItem> waitingToStart,
        List<SessionItem> inProgress,
        List<SessionItem> todaySchedule
) {

    @Builder
    public record StaffInfo(String staffId, String staffName) {}

    @Builder
    public record Metrics(
            int checkedInCount,
            int inProgressCount,
            int completedTodayCount,
            int totalTodayCount
    ) {}

    @Builder
    public record SessionItem(
            UUID sessionId,
            String bookingId,
            String bookingStatus,
            String sessionStatus,
            String vehiclePlate,
            String customerName,
            String customerPhone,
            String serviceName,
            String bayCode,
            String bookingTime,
            Instant checkedInAt,
            Instant startedAt,
            Instant completedAt,
            Integer estimatedDurationMinutes,
            Integer elapsedMinutes,
            String customerNote,
            String managerNote,
            List<String> includedServices
    ) {}
}
