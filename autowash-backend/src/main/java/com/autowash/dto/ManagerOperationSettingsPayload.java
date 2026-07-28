package com.autowash.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ManagerOperationSettingsPayload(
        boolean autoAssignEnabled,
        boolean leastBusyStaffFirst,
        boolean respectStaffCapacity,
        @Min(1) @Max(12) int maxActiveSessionsPerStaff,
        @Min(1) @Max(200) int weeklyStaffKpiTarget,
        boolean paidBookingPriority,
        boolean tierPriorityEnabled,
        boolean primaryVehiclePriority,
        @Min(0) @Max(180) int earlyCheckInMinutes,
        @Min(0) @Max(180) int lateGraceMinutes,
        @Min(1) @Max(120) int waitingAlertMinutes,
        @Min(1) @Max(180) int delayAlertMinutes,
        @Min(1) @Max(12) int overloadAlertSessions,
        @Min(1) @Max(100) int cancellationRateAlert,
        boolean notifyNewBooking,
        boolean notifyDelayedSession,
        boolean notifyStaffTransfer,
        boolean notifyCompletion
) {
}
