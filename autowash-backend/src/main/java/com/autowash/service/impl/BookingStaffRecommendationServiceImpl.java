package com.autowash.service.impl;

import com.autowash.dto.BookingStaffOptionResponse;
import com.autowash.dto.BookingStaffOptionsRequest;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.repository.WashSessionStaffAssignmentRepository;
import com.autowash.service.BookingStaffRecommendationService;
import com.autowash.service.CatalogService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.StaffAssignmentService;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingStaffRecommendationServiceImpl implements BookingStaffRecommendationService {

    private final CurrentUserService currentUserService;
    private final CatalogService catalogService;
    private final StaffAssignmentService staffAssignmentService;
    private final BookingRepository bookingRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final WashSessionRepository washSessionRepository;
    private final WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository;
    private static final ZoneId DISPLAY_ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm").withZone(DISPLAY_ZONE);
    private static final Set<BookingStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
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

    public BookingStaffRecommendationServiceImpl(
            CurrentUserService currentUserService,
            CatalogService catalogService,
            StaffAssignmentService staffAssignmentService,
            BookingRepository bookingRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            WashSessionRepository washSessionRepository,
            WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository
    ) {
        this.currentUserService = currentUserService;
        this.catalogService = catalogService;
        this.staffAssignmentService = staffAssignmentService;
        this.bookingRepository = bookingRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.washSessionRepository = washSessionRepository;
        this.washSessionStaffAssignmentRepository = washSessionStaffAssignmentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingStaffOptionResponse> recommendStaffOptions(BookingStaffOptionsRequest request) {
        BookingDraft draft = buildDraftBooking(request);
        List<User> recommendedStaff = staffAssignmentService.rankAvailableStaffForBooking(draft.booking(), 1);

        return staffAssignmentService.rankActiveStaffForBooking(draft.booking()).stream()
                .map(staff -> {
                    boolean available = staffAssignmentService.isStaffAvailableForBooking(staff, draft.booking());
                    String busyUntil = available ? null : busyUntil(staff, draft.booking()).map(TIME_FORMAT::format).orElse(null);
                    return new BookingStaffOptionResponse(
                            staff.getId().toString(),
                            staff.getFullName(),
                            draft.serviceName(),
                            recommendedStaff.stream().anyMatch(recommended -> recommended.getId().equals(staff.getId())),
                            available
                                    ? "Available for this service window"
                                    : busyUntil == null ? "Busy during this service window" : "Busy until " + busyUntil,
                            available,
                            available ? "AVAILABLE" : "BUSY",
                            busyUntil
                    );
                })
                .toList();
    }

    private Optional<Instant> busyUntil(User staff, Booking targetBooking) {
        Instant targetStart = targetBooking.getScheduledAt();
        Instant targetEnd = endAt(targetBooking);

        Optional<Instant> sessionBusyUntil = washSessionRepository.findByAssignedStaffAndStatusIn(staff, BUSY_SESSION_STATUSES)
                .stream()
                .map(WashSession::getBooking)
                .filter(booking -> !booking.getId().equals(targetBooking.getId()))
                .filter(booking -> overlaps(targetStart, targetEnd, booking.getScheduledAt(), endAt(booking)))
                .map(this::endAt)
                .min(Instant::compareTo);

        Optional<Instant> multiSessionBusyUntil = washSessionStaffAssignmentRepository.findByStaffAndSession_StatusIn(staff, BUSY_SESSION_STATUSES)
                .stream()
                .map(assignment -> assignment.getSession().getBooking())
                .filter(booking -> !booking.getId().equals(targetBooking.getId()))
                .filter(booking -> overlaps(targetStart, targetEnd, booking.getScheduledAt(), endAt(booking)))
                .map(this::endAt)
                .min(Instant::compareTo);

        Optional<Instant> bookingBusyUntil = bookingStaffAssignmentRepository.findByStaffAndBooking_StatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES)
                .stream()
                .map(assignment -> assignment.getBooking())
                .filter(booking -> !booking.getId().equals(targetBooking.getId()))
                .filter(booking -> overlaps(targetStart, targetEnd, booking.getScheduledAt(), endAt(booking)))
                .map(this::endAt)
                .min(Instant::compareTo);

        Optional<Instant> legacyBookingBusyUntil = bookingRepository.findByAssignedStaffAndStatusIn(staff, ACTIVE_ASSIGNMENT_STATUSES)
                .stream()
                .filter(booking -> !booking.getId().equals(targetBooking.getId()))
                .filter(booking -> overlaps(targetStart, targetEnd, booking.getScheduledAt(), endAt(booking)))
                .map(this::endAt)
                .min(Instant::compareTo);

        return List.of(sessionBusyUntil, multiSessionBusyUntil, bookingBusyUntil, legacyBookingBusyUntil)
                .stream()
                .flatMap(Optional::stream)
                .min(Instant::compareTo);
    }

    private Instant endAt(Booking booking) {
        int durationMinutes = booking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum();
        return booking.getScheduledAt().plusSeconds((long) durationMinutes * 60);
    }

    private boolean overlaps(Instant leftStart, Instant leftEnd, Instant rightStart, Instant rightEnd) {
        return leftStart.isBefore(rightEnd) && rightStart.isBefore(leftEnd);
    }

    private BookingDraft buildDraftBooking(BookingStaffOptionsRequest request) {
        LocalTime bookingTime = LocalTime.parse(request.bookingTime());
        Booking booking = new Booking(
                resolveDraftBookingId(request.bookingId()),
                currentUserService.getCurrentUser(),
                null,
                request.bookingDate().atTime(bookingTime).atZone(ZoneId.systemDefault()).toInstant()
        );

        String serviceName;
        if (request.packageId() != null && !request.packageId().isBlank()) {
            Package pkg = catalogService.requireActivePackage(request.packageId());
            serviceName = pkg.getName();
            booking.addDetail(BookingDetail.builder()
                    .itemType(BookingItemType.PACKAGE)
                    .refId(pkg.getId())
                    .snapshotName(pkg.getName())
                    .snapshotPrice(pkg.getBasePrice())
                    .subtotal(pkg.getBasePrice())
                    .durationMinutes(pkg.getDurationMinutes())
                    .build());
            catalogService.requireActivePackageOptions(pkg, request.options()).forEach(option -> booking.addDetail(
                    BookingDetail.builder()
                            .itemType(BookingItemType.ADDON)
                            .refId(option.optionId())
                            .snapshotName(option.name())
                            .snapshotPrice(option.price())
                            .subtotal(option.price())
                            .durationMinutes(option.durationMinutes())
                            .build()
            ));
        } else {
            Combo combo = catalogService.requireActiveCombo(request.comboId());
            serviceName = combo.getName();
            booking.addDetail(BookingDetail.builder()
                    .itemType(BookingItemType.COMBO)
                    .refId(combo.getId())
                    .snapshotName(combo.getName())
                    .snapshotPrice(0)
                    .subtotal(0)
                    .durationMinutes(combo.getDurationMinutes())
                    .build());
            catalogService.requireActiveComboOptions(combo, request.options()).forEach(option -> booking.addDetail(
                    BookingDetail.builder()
                            .itemType(BookingItemType.ADDON)
                            .refId(option.optionId())
                            .snapshotName(option.name())
                            .snapshotPrice(option.price())
                            .subtotal(option.price())
                            .durationMinutes(option.durationMinutes())
                            .build()
            ));
        }

        return new BookingDraft(booking, serviceName);
    }

    private UUID resolveDraftBookingId(String bookingId) {
        if (bookingId == null || bookingId.isBlank()) {
            return UUID.randomUUID();
        }
        try {
            return UUID.fromString(bookingId.trim());
        } catch (IllegalArgumentException exception) {
            return UUID.randomUUID();
        }
    }

    private record BookingDraft(Booking booking, String serviceName) {
    }
}
