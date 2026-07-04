package com.autowash.dto;

import com.autowash.entity.enums.ActiveStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminComboRequest(
        @NotBlank
        @Size(max = 100)
        String name,
        @Size(max = 500) String description,
        @Min(0) long price,
        @Min(0) Long originalPrice,
        @Min(1) int durationMinutes,
        @Min(1) Integer durationDays,
        @Min(1) Integer maxUsages,
        @Size(max = 500) String imageUrl,
        ActiveStatus status,
        List<@Valid ComboOptionRequest> options
) {
    public record ComboOptionRequest(
            @NotBlank String optionId,
            @Min(1) int quantity,
            @Min(0) int sortOrder
    ) {
    }
}
