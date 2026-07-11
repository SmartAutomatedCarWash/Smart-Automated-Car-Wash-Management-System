package com.autowash.service;

import java.time.Instant;
import java.util.UUID;

public interface SlotHoldService {
    Instant holdSlot(UUID customerId, Instant slotTime);
    void releaseSlot(UUID customerId, Instant slotTime);
}
