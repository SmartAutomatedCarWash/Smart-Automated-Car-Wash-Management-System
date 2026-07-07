package com.autowash.dto;

import com.autowash.entity.enums.ActiveStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminPackageRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be less than 100 characters")
        String name,

        @Size(max = 500, message = "Description must be less than 500 characters")
        String description,

        @NotNull(message = "Base price is required")
        @Min(value = 0, message = "Base price cannot be negative")
        Long basePrice,

        @NotNull(message = "Duration is required")
        @Min(value = 1, message = "Duration must be at least 1 minute")
        Integer durationMinutes,

        List<String> imageUrls,

        @Size(max = 100, message = "Category must be less than 100 characters")
        String category,

        ActiveStatus status,

        List<PackageOptionRequest> options
) {
    public record PackageOptionRequest(
            @NotBlank(message = "Option ID is required")
            String optionId,

            @Min(value = 1, message = "Quantity must be at least 1")
            Integer quantity,

            @Min(value = 0, message = "Sort order cannot be negative")
            Integer sortOrder
    ) {}
}
