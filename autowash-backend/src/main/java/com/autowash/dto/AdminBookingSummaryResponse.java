package com.autowash.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Summary statistics for admin bookings page")
public record AdminBookingSummaryResponse(
        @Schema(description = "Total number of bookings")
        long totalBookings,

        @Schema(description = "Bookings scheduled for today")
        long todayBookings,

        @Schema(description = "Bookings currently in progress")
        long inProgress,

        @Schema(description = "Total completed combo sessions")
        long completedComboSessions
) {}
