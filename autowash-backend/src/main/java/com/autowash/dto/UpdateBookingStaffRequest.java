package com.autowash.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateBookingStaffRequest(
        @NotNull
        @Size(min = 3, max = 3, message = "Exactly 3 staff must be selected")
        List<String> staffIds
) {
}
