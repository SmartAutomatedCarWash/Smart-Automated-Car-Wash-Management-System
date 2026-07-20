package com.autowash.service.impl;

import com.autowash.entity.WashSession;

import com.autowash.entity.BookingDetail;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;


import com.autowash.entity.User;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.StaffAssignmentService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class StaffAssignmentServiceImpl implements StaffAssignmentService {

    private static final ZoneId ASSIGNMENT_ZONE = ZoneId.systemDefault();

    private static final Set<BookingStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS
    );

    private static final Set<WashSessionStatus> BUSY_SESSION_STATUSES = Set.of(
            WashSessionStatus.PENDING,
            WashSessionStatus.QUEUED,
            WashSessionStatus.CHECKED_IN,
            WashSessionStatus.IN_PROGRESS
    );

    private final UserRepository UserRepository;
    private final BookingRepository bookingRepository;
    private final WashSessionRepository washSessionRepository;

    public StaffAssignmentServiceImpl(
            UserRepository UserRepository,
            BookingRepository bookingRepository,
            WashSessionRepository washSessionRepository
    ) {
        this.UserRepository = UserRepository;
        this.bookingRepository = bookingRepository;
        this.washSessionRepository = washSessionRepository;
    }

    @Override
    public Optional<User> tryPickStaffForBookingAssignment() {
        Instant dayStart = startOfToday();
        Instant dayEnd = startOfTomorrow();
        return UserRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE)
                .stream()
                .filter(staff -> !washSessionRepository.existsByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES))
                .min(Comparator
                        .comparingLong((User staff) -> washSessionRepository.countByAssignedStaffAndStatusAndCompletedAtBetween(
                                staff,
                                WashSessionStatus.COMPLETED,
                                dayStart,
                                dayEnd
                        ))
                        .thenComparingLong((User staff) ->
                                bookingRepository.countByAssignedStaffAndStatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES))
                        .thenComparing(User::getFullName)
                        .thenComparing(User::getId));
    }

    @Override
    public User pickLeastLoadedActiveStaff() {
        return tryPickStaffForBookingAssignment()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "No active staff available for booking assignment",
                        "NO_AVAILABLE_STAFF"
                ));
    }

    @Override
    public Optional<User> tryPickLeastLoadedActiveStaffForBooking(Booking booking) {
        return rankAvailableStaffForBooking(booking, 1).stream().findFirst();
    }

    @Override
    public User pickLeastLoadedActiveStaffForBooking(Booking booking) {
        return tryPickLeastLoadedActiveStaffForBooking(booking)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "No active staff available for this booking time",
                        "NO_AVAILABLE_STAFF"
                ));
    }

    @Override
    public List<User> rankAvailableStaffForBooking(Booking booking, int limit) {
        return UserRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE)
                .stream()
                .filter(staff -> isStaffAvailableForBooking(staff, booking))
                .sorted(Comparator
                        .comparingLong((User staff) -> bookingRepository.countByAssignedStaffAndStatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES))
                        .thenComparingLong((User staff) -> washSessionRepository.countByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES))
                        .thenComparing(User::getFullName)
                        .thenComparing(User::getId))
                .limit(Math.max(limit, 0))
                .toList();
    }

    @Override
    public boolean isStaffAvailableForBooking(User staff, Booking booking) {
        if (staff == null || booking == null) {
            return false;
        }
        Instant targetStart = booking.getScheduledAt();
        Instant targetEnd = targetStart.plusSeconds((long) (booking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum()) * 60);
        List<WashSession> activeSessions = washSessionRepository.findByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES);
        return activeSessions.stream()
                .filter(session -> !session.getBooking().getId().equals(booking.getId()))
                .noneMatch(session -> overlaps(
                        targetStart,
                        targetEnd,
                        session.getBooking().getScheduledAt(),
                        session.getBooking().getScheduledAt().plusSeconds((long) session.getBooking().getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum() * 60)
                ));
    }

    @Override
    public User requireActiveStaff(UUID staffId) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (staff.getRole() != UserRole.STAFF || staff.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target staff must be active", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        return staff;
    }

    @Override
    public List<User> listActiveStaff() {
        return UserRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE);
    }

    private static Instant startOfToday() {
        return LocalDate.now(ASSIGNMENT_ZONE).atStartOfDay(ASSIGNMENT_ZONE).toInstant();
    }

    private static Instant startOfTomorrow() {
        return LocalDate.now(ASSIGNMENT_ZONE).plusDays(1).atStartOfDay(ASSIGNMENT_ZONE).toInstant();
    }

    private static boolean overlaps(Instant leftStart, Instant leftEnd, Instant rightStart, Instant rightEnd) {
        return leftStart.isBefore(rightEnd) && rightStart.isBefore(leftEnd);
    }
}
