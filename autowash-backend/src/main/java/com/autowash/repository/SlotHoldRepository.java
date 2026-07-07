package com.autowash.repository;

import com.autowash.entity.SlotHold;
import com.autowash.entity.User;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SlotHoldRepository extends JpaRepository<SlotHold, UUID> {

    @Query("SELECT COUNT(s) FROM SlotHold s WHERE s.slotTime >= :slotStart AND s.slotTime < :slotEnd AND s.expiresAt > :now")
    long countActiveHoldsForSlot(@Param("slotStart") Instant slotStart, @Param("slotEnd") Instant slotEnd, @Param("now") Instant now);

    Optional<SlotHold> findByCustomerAndSlotTime(User customer, Instant slotTime);

    @Modifying
    @Query("DELETE FROM SlotHold s WHERE s.expiresAt <= :now")
    int deleteExpiredHolds(@Param("now") Instant now);
}
