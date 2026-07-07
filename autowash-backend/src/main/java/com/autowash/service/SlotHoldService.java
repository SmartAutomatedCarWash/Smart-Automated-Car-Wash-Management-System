package com.autowash.service;

import java.time.Instant;
import java.util.UUID;

public interface SlotHoldService {
    void holdSlot(UUID customerId, Instant slotTime);
    void releaseSlot(UUID customerId, Instant slotTime);
}
