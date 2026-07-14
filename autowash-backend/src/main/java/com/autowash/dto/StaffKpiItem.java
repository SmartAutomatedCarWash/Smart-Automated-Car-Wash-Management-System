package com.autowash.dto;

import java.util.UUID;

/**
 * Per-staff KPI item for admin dashboard staff performance section.
 * Range: TODAY | WEEK | MONTH
 */
public record StaffKpiItem(
        UUID staffId,
        String staffName,
        String status,               // ACTIVE | INACTIVE
        long completedBookings,      // completed in range
        long completedRevenue,       // sum finalAmount of completed bookings in range
        long activeSessions,         // currently active sessions (PENDING/QUEUED/CHECKED_IN/IN_PROGRESS)
        long totalAssignedBookings,  // all-time assigned
        int kpiProgressPercent,      // completedRevenue vs kpiTargetRevenue
        long kpiTargetRevenue,
        boolean isOnline             // has any active session right now
) {}
