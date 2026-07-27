package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateWashSessionRequest(
        @NotBlank String bookingId,
        @Size(max = 500) String notes,
        UUID preferredStaffId
) {
}
