package com.autowash.dto;

import java.util.UUID;

public record StaffWorkloadItemResponse(
        UUID staffId,
        String staffName,
        int activeCount,
        int waitingCount,
        int completedCount,
        int delayedCount,
        int openCount,
        String status
) {
}
