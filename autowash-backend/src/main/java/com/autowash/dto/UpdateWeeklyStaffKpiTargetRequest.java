package com.autowash.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateWeeklyStaffKpiTargetRequest(
        @Min(1) @Max(200) int weeklyStaffKpiTarget
) {
}
