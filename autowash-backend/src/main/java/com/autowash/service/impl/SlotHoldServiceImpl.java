package com.autowash.service.impl;

import com.autowash.entity.SlotHold;
import com.autowash.entity.SystemSettings;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.SlotHoldRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.repository.UserRepository;
import com.autowash.service.SlotHoldService;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SlotHoldServiceImpl implements SlotHoldService {

    private final SlotHoldRepository slotHoldRepository;
    private final BookingRepository bookingRepository;
    private final SystemSettingsRepository systemSettingsRepository;
    private final UserRepository userRepository;

    public SlotHoldServiceImpl(SlotHoldRepository slotHoldRepository, BookingRepository bookingRepository, SystemSettingsRepository systemSettingsRepository, UserRepository userRepository) {
        this.slotHoldRepository = slotHoldRepository;
        this.bookingRepository = bookingRepository;
        this.systemSettingsRepository = systemSettingsRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void holdSlot(UUID customerId, Instant slotTime) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND"));

        if (slotHoldRepository.findByCustomerAndSlotTime(customer, slotTime).isPresent()) {
            return; // Already holding this slot
        }

        SystemSettings settings = systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "System settings not found", "SYSTEM_ERROR"));

        validateSlotCapacity(slotTime, settings.getMaxBookingsPerTimeSlot());

        SlotHold hold = new SlotHold(customer, slotTime, Instant.now().plus(15, ChronoUnit.MINUTES));
        slotHoldRepository.save(hold);
    }

    @Override
    @Transactional
    public void releaseSlot(UUID customerId, Instant slotTime) {
        User customer = userRepository.findById(customerId).orElse(null);
        if (customer != null) {
            slotHoldRepository.findByCustomerAndSlotTime(customer, slotTime)
                    .ifPresent(slotHoldRepository::delete);
        }
    }

    private void validateSlotCapacity(Instant scheduledAt, int maxBookingsPerTimeSlot) {
        LocalDateTime localTime = scheduledAt.atZone(ZoneId.systemDefault()).toLocalDateTime();
        LocalDateTime slotStartLocal = localTime.withMinute(0).withSecond(0).withNano(0);
        LocalDateTime slotEndLocal = slotStartLocal.plusHours(1);

        Instant slotStart = slotStartLocal.atZone(ZoneId.systemDefault()).toInstant();
        Instant slotEnd = slotEndLocal.atZone(ZoneId.systemDefault()).toInstant();

        long existingBookings = bookingRepository.countByScheduledAtSlot(
                slotStart,
                slotEnd,
                Set.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW)
        );

        long activeHolds = slotHoldRepository.countActiveHoldsForSlot(slotStart, slotEnd, Instant.now());

        if (existingBookings + activeHolds >= maxBookingsPerTimeSlot) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking slot is full", "BOOKING_SLOT_FULL");
        }
    }
}
