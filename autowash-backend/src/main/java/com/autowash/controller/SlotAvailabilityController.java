package com.autowash.controller;

import com.autowash.dto.SlotAvailabilityResponse;
import com.autowash.service.CurrentUserService;
import com.autowash.service.SlotHoldService;
import com.autowash.shared.dto.ApiResponse;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/slots")
public class SlotAvailabilityController {

    private final SlotHoldService slotHoldService;
    private final CurrentUserService currentUserService;

    public SlotAvailabilityController(SlotHoldService slotHoldService, CurrentUserService currentUserService) {
        this.slotHoldService = slotHoldService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/availability")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<SlotAvailabilityResponse>> listAvailability(
            @RequestParam("date") @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("times") @Size(min = 1, max = 48) List<String> times
    ) {
        return ApiResponse.ok(
                "Slot availability retrieved",
                slotHoldService.listAvailability(currentUserService.getCurrentUser().getId(), date, times)
        );
    }
}
