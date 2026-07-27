package com.autowash.dto;

import java.util.List;
import java.util.UUID;

public record ManagerCheckInRecommendationResponse(
        String bookingId,
        String currentStaffId,
        String currentStaffName,
        String currentStaffStatus,
        boolean needsReassignment,
        String message,
        List<ManagerCheckInRecommendationItem> candidates
) {
    public record ManagerCheckInRecommendationItem(
            UUID staffId,
            String staffName,
            String status,
            int activeCount,
            int waitingCount,
            int delayedCount,
            int openCount,
            long weeklyKpiRevenue,
            long weeklyKpiTarget,
            boolean available,
            String reason,
            boolean selectable
    ) {
    }
}
