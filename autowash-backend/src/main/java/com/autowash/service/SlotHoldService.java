package com.autowash.service;

import com.autowash.dto.SlotAvailabilityResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SlotHoldService {
    Instant holdSlot(UUID customerId, Instant slotTime);
    void releaseSlot(UUID customerId, Instant slotTime);
    List<SlotAvailabilityResponse> listAvailability(UUID customerId, LocalDate bookingDate, List<String> bookingTimes);
}
