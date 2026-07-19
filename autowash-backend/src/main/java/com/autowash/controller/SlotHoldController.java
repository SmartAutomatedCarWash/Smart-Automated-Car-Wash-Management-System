package com.autowash.controller;

import java.time.Instant;

import com.autowash.dto.HoldSlotRequest;
import com.autowash.dto.HoldSlotResponse;
import com.autowash.service.CurrentUserService;
import com.autowash.service.SlotHoldService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping({"/api/v1/slots/hold", "/api/v1/bookings/hold-slot"})
public class SlotHoldController {

    private final SlotHoldService slotHoldService;
    private final CurrentUserService currentUserService;

    public SlotHoldController(SlotHoldService slotHoldService, CurrentUserService currentUserService) {
        this.slotHoldService = slotHoldService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<HoldSlotResponse> holdSlot(@RequestBody @Valid HoldSlotRequest request) {
        Instant slotTime = calculateSlotTime(request.bookingDate(), request.bookingTime());
        Instant expiresAt = slotHoldService.holdSlot(currentUserService.getCurrentUser().getId(), slotTime);
        return ResponseEntity.ok(new HoldSlotResponse(slotTime, expiresAt));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> releaseSlot(@RequestBody @Valid HoldSlotRequest request) {
        Instant slotTime = calculateSlotTime(request.bookingDate(), request.bookingTime());
        slotHoldService.releaseSlot(currentUserService.getCurrentUser().getId(), slotTime);
        return ResponseEntity.noContent().build();
    }

    private Instant calculateSlotTime(LocalDate date, String time) {
        LocalTime localTime = LocalTime.parse(time);
        ZonedDateTime zdt = date.atTime(localTime).atZone(ZoneId.systemDefault());
        return zdt.toInstant();
    }
}
