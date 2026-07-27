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
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.StaffAssignmentService;
import java.time.Instant;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.LinkedHashSet;
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
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final WashSessionRepository washSessionRepository;

    public StaffAssignmentServiceImpl(
            UserRepository UserRepository,
            BookingRepository bookingRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            WashSessionRepository washSessionRepository
    ) {
        this.UserRepository = UserRepository;
        this.bookingRepository = bookingRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.washSessionRepository = washSessionRepository;
    }

    @Override
    public Optional<User> tryPickStaffForBookingAssignment() {
        Instant dayStart = startOfToday();
        Instant dayEnd = startOfTomorrow();
        Instant weekStart = startOfWeek();
        Instant weekEnd = startOfNextWeek();
        return UserRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE)
                .stream()
                .filter(staff -> !washSessionRepository.existsByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES))
                .min(staffLoadComparator(weekStart, weekEnd, dayStart, dayEnd));
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
        return rankActiveStaffForBooking(booking)
                .stream()
                .filter(staff -> isStaffAvailableForBooking(staff, booking))
                .limit(Math.max(limit, 0))
                .toList();
    }

    @Override
    public List<User> rankActiveStaffForBooking(Booking booking) {
        Instant weekStart = startOfWeek();
        Instant weekEnd = startOfNextWeek();
        Instant dayStart = startOfToday();
        Instant dayEnd = startOfTomorrow();
        return UserRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE)
                .stream()
                .sorted(staffLoadComparator(weekStart, weekEnd, dayStart, dayEnd))
                .toList();
    }

    @Override
    public List<User> pickStaffGroupForBooking(Booking booking, List<UUID> preferredStaffIds, int requiredCount) {
        int count = Math.max(requiredCount, 0);
        List<User> selected = new ArrayList<>();
        Set<UUID> selectedIds = new LinkedHashSet<>();

        if (preferredStaffIds != null) {
            for (UUID staffId : preferredStaffIds) {
                if (staffId == null || !selectedIds.add(staffId)) {
                    continue;
                }
                User staff = requireActiveStaff(staffId);
                if (isStaffAvailableForBooking(staff, booking)) {
                    selected.add(staff);
                }
                if (selected.size() == count) {
                    return selected;
                }
            }
        }

        for (User staff : rankAvailableStaffForBooking(booking, Integer.MAX_VALUE)) {
            if (selectedIds.add(staff.getId())) {
                selected.add(staff);
            }
            if (selected.size() == count) {
                return selected;
            }
        }

        throw new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Not enough available staff for this booking time",
                "NO_AVAILABLE_STAFF"
        );
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
                ))
                && bookingStaffAssignmentRepository.findByStaffAndBooking_StatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES)
                .stream()
                .map(assignment -> assignment.getBooking())
                .filter(existingBooking -> !existingBooking.getId().equals(booking.getId()))
                .noneMatch(existingBooking -> overlaps(
                        targetStart,
                        targetEnd,
                        existingBooking.getScheduledAt(),
                        existingBooking.getScheduledAt().plusSeconds((long) existingBooking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum() * 60)
                ))
                && bookingRepository.findByAssignedStaffAndStatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES)
                .stream()
                .filter(existingBooking -> !existingBooking.getId().equals(booking.getId()))
                .noneMatch(existingBooking -> overlaps(
                        targetStart,
                        targetEnd,
                        existingBooking.getScheduledAt(),
                        existingBooking.getScheduledAt().plusSeconds((long) existingBooking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum() * 60)
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

    private static Instant startOfWeek() {
        return LocalDate.now(ASSIGNMENT_ZONE)
                .with(DayOfWeek.MONDAY)
                .atStartOfDay(ASSIGNMENT_ZONE)
                .toInstant();
    }

    private static Instant startOfNextWeek() {
        return LocalDate.now(ASSIGNMENT_ZONE)
                .with(DayOfWeek.MONDAY)
                .plusWeeks(1)
                .atStartOfDay(ASSIGNMENT_ZONE)
                .toInstant();
    }

    private static boolean overlaps(Instant leftStart, Instant leftEnd, Instant rightStart, Instant rightEnd) {
        return leftStart.isBefore(rightEnd) && rightStart.isBefore(leftEnd);
    }

    private Comparator<User> staffLoadComparator(Instant weekStart, Instant weekEnd, Instant dayStart, Instant dayEnd) {
        return Comparator
                .comparingLong((User staff) -> washSessionRepository.countByAssignedStaffAndStatusAndCompletedAtBetween(
                        staff,
                        WashSessionStatus.COMPLETED,
                        weekStart,
                        weekEnd
                ))
                .thenComparingLong((User staff) -> bookingRepository.findTodayBookingsByAssignedStaff(staff, dayStart, dayEnd).size())
                .thenComparingLong((User staff) -> washSessionRepository.countByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES))
                .thenComparingLong((User staff) -> bookingRepository.countByAssignedStaffAndStatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES))
                .thenComparingLong((User staff) -> bookingStaffAssignmentRepository.countByStaffAndBooking_StatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES))
                .thenComparing(User::getFullName)
                .thenComparing(User::getId);
    }
}
