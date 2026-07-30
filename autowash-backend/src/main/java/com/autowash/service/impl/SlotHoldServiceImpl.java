package com.autowash.service.impl;

import com.autowash.dto.SlotAvailabilityResponse;
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
import com.autowash.shared.exception.ErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SlotHoldServiceImpl implements SlotHoldService {
    private static final long MIN_ADVANCE_BOOKING_MINUTES = 15;

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
    public Instant holdSlot(UUID customerId, Instant slotTime) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND));

        Instant now = Instant.now();
        validateMinimumAdvance(slotTime, now);
        var existingHold = slotHoldRepository.findByCustomerAndSlotTime(customer, slotTime);
        if (existingHold.isPresent()) {
            SlotHold hold = existingHold.get();
            if (hold.getExpiresAt().isAfter(now)) {
                return hold.getExpiresAt();
            }
            slotHoldRepository.delete(hold);
        }

        SystemSettings settings = systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "System settings not found", ErrorCode.SYSTEM_ERROR));

        validateSlotCapacity(slotTime, settings.getMaxBookingsPerTimeSlot());

        SlotHold hold = new SlotHold(customer, slotTime, now.plus(15, ChronoUnit.MINUTES));
        slotHoldRepository.save(hold);
        return hold.getExpiresAt();
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

    @Override
    @Transactional(readOnly = true)
    public List<SlotAvailabilityResponse> listAvailability(UUID customerId, LocalDate bookingDate, List<String> bookingTimes) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND));

        SystemSettings settings = systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "System settings not found", ErrorCode.SYSTEM_ERROR));

        int capacity = settings.getMaxBookingsPerTimeSlot();
        LocalTime operatingStart = LocalTime.parse(settings.getOperatingStartTime());
        LocalTime operatingEnd = LocalTime.parse(settings.getOperatingEndTime());
        Instant now = Instant.now();

        return bookingTimes.stream()
                .distinct()
                .map(time -> toAvailability(bookingDate, time, customer, capacity, operatingStart, operatingEnd, now))
                .toList();
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
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking slot is full", ErrorCode.BOOKING_SLOT_FULL);
        }
    }

    private SlotAvailabilityResponse toAvailability(
            LocalDate bookingDate,
            String bookingTime,
            User customer,
            int capacity,
            LocalTime operatingStart,
            LocalTime operatingEnd,
            Instant now
    ) {
        LocalTime localTime = LocalTime.parse(bookingTime);
        LocalDateTime scheduledLocal = bookingDate.atTime(localTime);
        LocalDateTime slotStartLocal = scheduledLocal.withMinute(0).withSecond(0).withNano(0);
        LocalDateTime slotEndLocal = slotStartLocal.plusHours(1);
        Instant slotStart = slotStartLocal.atZone(ZoneId.systemDefault()).toInstant();
        Instant slotEnd = slotEndLocal.atZone(ZoneId.systemDefault()).toInstant();

        long existingBookings = bookingRepository.countByScheduledAtSlot(
                slotStart,
                slotEnd,
                Set.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW)
        );
        long activeHolds = slotHoldRepository.countActiveHoldsForSlotExcludingCustomer(slotStart, slotEnd, now, customer);
        long remaining = Math.max(capacity - existingBookings - activeHolds, 0);
        boolean withinOperatingHours = !localTime.isBefore(operatingStart) && localTime.isBefore(operatingEnd);
        boolean meetsMinimumAdvance = !scheduledLocal
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .isBefore(now.plus(MIN_ADVANCE_BOOKING_MINUTES, ChronoUnit.MINUTES));
        boolean available = withinOperatingHours && meetsMinimumAdvance && remaining > 0;

        return new SlotAvailabilityResponse(
                bookingDate,
                bookingTime,
                scheduledLocal.atZone(ZoneId.systemDefault()).toInstant(),
                capacity,
                existingBookings,
                activeHolds,
                remaining,
                available
        );
    }

    private void validateMinimumAdvance(Instant slotTime, Instant now) {
        if (slotTime.isBefore(now.plus(MIN_ADVANCE_BOOKING_MINUTES, ChronoUnit.MINUTES))) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking time must be at least 15 minutes from now",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
    }
}
