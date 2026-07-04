package com.autowash.service.impl;

import com.autowash.service.*;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.Booking;
import com.autowash.repository.BookingRepository;
import com.autowash.service.BookingService;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.service.LoyaltyService;
import com.autowash.dto.CancelWashSessionResponse;
import com.autowash.dto.CheckInWashSessionResponse;
import com.autowash.dto.CompleteWashSessionResponse;
import com.autowash.dto.CreateWashSessionRequest;
import com.autowash.dto.CreateWashSessionResponse;
import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.QueueWashSessionResponse;
import com.autowash.dto.StartWashSessionResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionRepository;
import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.shared.exception.ApiException;
import com.autowash.service.CurrentUserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperationsServiceImpl implements OperationsService {

    private static final Set<WashSessionStatus> ACTIVE_SESSION_STATUSES = Set.of(
            WashSessionStatus.PENDING,
            WashSessionStatus.QUEUED,
            WashSessionStatus.CHECKED_IN,
            WashSessionStatus.IN_PROGRESS
    );

    private final BookingService bookingService;
    private final BookingRepository BookingRepository;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyService loyaltyService;
    private final CurrentUserService currentUserService;
    private final StaffAssignmentService staffAssignmentService;
    private final TierConfigService tierConfigService;
    private final String currency;

    public OperationsServiceImpl(
            BookingService bookingService,
            BookingRepository BookingRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyService loyaltyService,
            CurrentUserService currentUserService,
            StaffAssignmentService staffAssignmentService,
            TierConfigService tierConfigService,
            @Value("${autowash.currency}") String currency
    ) {
        this.bookingService = bookingService;
        this.BookingRepository = BookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyService = loyaltyService;
        this.currentUserService = currentUserService;
        this.staffAssignmentService = staffAssignmentService;
        this.tierConfigService = tierConfigService;
        this.currency = currency;
    }

    @Transactional
    public CreateWashSessionResponse createSession(CreateWashSessionRequest request) {
        Booking booking = bookingService.requireBookingForOperations(request.bookingId());
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking must be CONFIRMED to create a wash session",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        if (washSessionRepository.existsByBooking_IdAndStatusIn(booking.getId(), ACTIVE_SESSION_STATUSES)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking already has an active wash session",
                    "DUPLICATE_ACTIVE_SESSION"
            );
        }

        User actor = currentUserService.getCurrentUser();
        User assignedStaff = resolveSessionAssigneeForCreate(booking, actor);
        WashSession session = washSessionRepository.save(WashSession.create(booking, request.notes(), assignedStaff));
        return CreateWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .bookingId(booking.getId().toString())
                .assignedStaffId(assignedStaff == null ? null : assignedStaff.getId())
                .assignedStaffName(assignedStaff == null ? null : assignedStaff.getFullName())
                .createdAt(session.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public OperationsQueueResponse getQueue() {
        User currentUser = currentUserService.getCurrentUser();
        List<WashSession> sessions = currentUser.getRole() == UserRole.STAFF
                ? washSessionRepository.findByAssignedStaffOrderByCreatedAtDesc(currentUser)
                : washSessionRepository.findAllByOrderByCreatedAtDesc();
        Map<WashSessionStatus, List<OperationsQueueResponse.WashSessionCard>> cardsByStatus = sessions.stream()
                .map(this::toQueueCard)
                .collect(Collectors.groupingBy(
                        card -> WashSessionStatus.valueOf(card.status()),
                        () -> new java.util.EnumMap<>(WashSessionStatus.class),
                        Collectors.toCollection(ArrayList::new)
                ));

        List<OperationsQueueResponse.QueueColumn> columns = List.of(
                column("PENDING", "Pending", cardsByStatus, WashSessionStatus.PENDING),
                column(WashSessionStatus.QUEUED, "Queued", cardsByStatus),
                column(WashSessionStatus.CHECKED_IN, "Checked-In", cardsByStatus),
                column(WashSessionStatus.IN_PROGRESS, "In Progress", cardsByStatus),
                column(WashSessionStatus.COMPLETED, "Completed", cardsByStatus)
        );

        return OperationsQueueResponse.builder()
                .summary(OperationsQueueResponse.QueueSummary.builder()
                        .total(sessions.size())
                        .pending(count(sessions, WashSessionStatus.PENDING) + count(sessions, WashSessionStatus.QUEUED))
                        .checkedIn(count(sessions, WashSessionStatus.CHECKED_IN))
                        .inProgress(count(sessions, WashSessionStatus.IN_PROGRESS))
                        .completed(count(sessions, WashSessionStatus.COMPLETED))
                        .build())
                .columns(columns)
                .generatedAt(Instant.now())
                .build();
    }

    @Transactional(readOnly = true)
    public List<EligibleSessionBookingResponse> listEligibleSessionBookings(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        User currentUser = currentUserService.getCurrentUser();
        List<Booking> bookings = currentUser.getRole() == UserRole.STAFF
                ? BookingRepository.findEligibleForAssignedStaffOperationsSession(
                        currentUser,
                        BookingStatus.CONFIRMED,
                        ACTIVE_SESSION_STATUSES,
                        PageRequest.of(0, safeLimit))
                : BookingRepository.findEligibleForOperationsSession(
                        BookingStatus.CONFIRMED,
                        ACTIVE_SESSION_STATUSES,
                        PageRequest.of(0, safeLimit));
        return bookings
                .stream()
                .map(this::toEligibleBooking)
                .toList();
    }

    @Transactional
    public QueueWashSessionResponse queueSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.QUEUED);
        session.queue(Instant.now());
        return QueueWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .build();
    }

    @Transactional
    public CheckInWashSessionResponse checkInSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        Booking booking = session.getBooking();
        ensureSessionAssigneeForCheckIn(session);
        int projectedPoints = loyaltyService.calculateEarnPoints(sessionId);

        Instant checkedInAt = Instant.now();
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.CHECKED_IN);
        session.checkIn(checkedInAt, booking.getFinalAmount(), currency, projectedPoints);
        bookingService.updateStatus(booking, BookingStatus.CHECKED_IN);
        return CheckInWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .checkedInAt(session.getCheckedInAt())
                .projectedLoyaltyPoints(session.getProjectedLoyaltyPoints())
                .build();
    }

    @Transactional
    public StartWashSessionResponse startSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        Instant startedAt = Instant.now();
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.IN_PROGRESS);
        session.start(startedAt);
        bookingService.updateStatus(session.getBooking(), BookingStatus.IN_PROGRESS);
        return StartWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .build();
    }

    @Transactional
    public CompleteWashSessionResponse completeSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        int projectedPoints = loyaltyService.calculateEarnPoints(sessionId);

        Instant completedAt = Instant.now();
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.COMPLETED);
        session.complete(completedAt, projectedPoints);
        EarnPointsResponse earnResult = loyaltyService.postEarnTransaction(
                session.getBooking().getCustomer().getId(),
                sessionId
        );
        bookingService.updateStatus(session.getBooking(), BookingStatus.COMPLETED);
        markCustomerAsNotNew(session.getBooking().getCustomer());
        return CompleteWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .completedAt(session.getCompletedAt())
                .awardedLoyaltyPoints(earnResult.pointsAwarded())
                .build();
    }

    @Transactional
    public CancelWashSessionResponse cancelSession(UUID sessionId, String reason) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.CANCELLED);
        String normalizedReason = normalizeCancelReason(reason);
        Instant cancelledAt = Instant.now();
        session.cancel(cancelledAt, normalizedReason);
        bookingService.updateStatus(session.getBooking(), BookingStatus.CONFIRMED);
        return CancelWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .bookingId(session.getBooking().getId().toString())
                .bookingStatus(session.getBooking().getStatus().name())
                .reason(session.getCancelReason())
                .cancelledAt(session.getCancelledAt())
                .build();
    }

    @Transactional(readOnly = true)
    public StaffDashboardSummaryResponse getStaffSummary() {
        User staff = currentUserService.getCurrentUser();
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Staff role required", "FORBIDDEN");
        }
        long completedRevenue = BookingRepository.sumFinalAmountByAssignedStaffAndStatus(staff, BookingStatus.COMPLETED);
        long kpiTargetRevenue = 5_000_000L;
        int progress = kpiTargetRevenue == 0 ? 100 : (int) Math.min(100, Math.round(completedRevenue * 100.0 / kpiTargetRevenue));
        return new StaffDashboardSummaryResponse(
                staff.getId().toString(),
                staff.getFullName(),
                BookingRepository.countByAssignedStaffAndStatusIn(staff, Set.of(
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN,
                        BookingStatus.IN_PROGRESS
                )),
                BookingRepository.countByAssignedStaffAndStatus(staff, BookingStatus.CONFIRMED),
                washSessionRepository.countByAssignedStaffAndStatusIn(staff, Set.of(
                        WashSessionStatus.PENDING,
                        WashSessionStatus.QUEUED,
                        WashSessionStatus.CHECKED_IN,
                        WashSessionStatus.IN_PROGRESS
                )),
                washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.COMPLETED),
                completedRevenue,
                kpiTargetRevenue,
                progress
        );
    }

    @Transactional(readOnly = true)
    public List<StaffOptionResponse> listActiveStaff() {
        return staffAssignmentService.listActiveStaff().stream()
                .map(staff -> new StaffOptionResponse(staff.getId(), staff.getFullName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public OperationsQueueResponse getOperationsQueue() {
        return getQueue();
    }

    @Transactional(readOnly = true)
    public List<EligibleSessionBookingResponse> getEligibleSessionBookings(int limit) {
        return listEligibleSessionBookings(limit);
    }

    @Transactional(readOnly = true)
    public StaffDashboardSummaryResponse getMyStaffSummary() {
        return getStaffSummary();
    }

    private void markCustomerAsNotNew(User customer) {
        if (customer.isNewCustomer()) {
            customer.markNotNewCustomer();
        }
    }

    private WashSession requireSession(UUID sessionId) {
        return washSessionRepository.findWithBookingById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", "RESOURCE_NOT_FOUND"));
    }

    private WashSession requireSessionForCurrentUser(UUID sessionId) {
        WashSession session = requireSession(sessionId);
        User currentUser = currentUserService.getCurrentUser();
        if (currentUser.getRole() != UserRole.STAFF) {
            return session;
        }
        User assignedStaff = session.getAssignedStaff();
        if (assignedStaff == null || !assignedStaff.getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", "RESOURCE_NOT_FOUND");
        }
        return session;
    }

    private User resolveSessionAssigneeForCreate(Booking booking, User actor) {
        User assignedStaff = booking.getAssignedStaff();
        if (actor.getRole() == UserRole.STAFF) {
            if (assignedStaff != null && !assignedStaff.getId().equals(actor.getId())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND");
            }
        }

        if (assignedStaff == null || !staffAssignmentService.isStaffAvailableForBooking(assignedStaff, booking)) {
            assignedStaff = staffAssignmentService.pickLeastLoadedActiveStaffForBooking(booking);
            booking.assignStaff(assignedStaff);
        }
        return assignedStaff;
    }

    private void ensureSessionAssigneeForCheckIn(WashSession session) {
        Booking booking = session.getBooking();
        User assignedStaff = session.getAssignedStaff();
        if (assignedStaff == null || !staffAssignmentService.isStaffAvailableForBooking(assignedStaff, booking)) {
            assignedStaff = staffAssignmentService.pickLeastLoadedActiveStaffForBooking(booking);
            booking.assignStaff(assignedStaff);
            session.assignStaff(assignedStaff);
        }
    }

    private String normalizeCancelReason(String reason) {
        String normalized = reason == null ? "" : reason.trim();
        if (normalized.isBlank()) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cancel reason is required",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        if (normalized.length() > 500) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cancel reason must be at most 500 characters",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        return normalized;
    }

    private OperationsQueueResponse.QueueColumn column(
            WashSessionStatus status,
            String label,
            Map<WashSessionStatus, List<OperationsQueueResponse.WashSessionCard>> cardsByStatus
    ) {
        return column(status.name(), label, cardsByStatus, status);
    }

    private OperationsQueueResponse.QueueColumn column(
            String status,
            String label,
            Map<WashSessionStatus, List<OperationsQueueResponse.WashSessionCard>> cardsByStatus,
            WashSessionStatus... includedStatuses
    ) {
        List<OperationsQueueResponse.WashSessionCard> sessions = java.util.Arrays.stream(includedStatuses)
                .flatMap(includedStatus -> cardsByStatus.getOrDefault(includedStatus, List.of()).stream())
                .sorted(Comparator.comparing(OperationsQueueResponse.WashSessionCard::bookingDate)
                        .thenComparing(OperationsQueueResponse.WashSessionCard::bookingTime))
                .toList();
        return OperationsQueueResponse.QueueColumn.builder()
                .status(status)
                .label(label)
                .sessions(sessions)
                .build();
    }

    private OperationsQueueResponse.WashSessionCard toQueueCard(WashSession session) {
        Booking booking = session.getBooking();
        User assignedStaff = session.getAssignedStaff();
        return OperationsQueueResponse.WashSessionCard.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .vehiclePlate(booking.getVehicle().getPlate())
                .packageId(booking.getPackageId() == null ? null : booking.getPackageId().toString())
                .assignedStaffId(assignedStaff == null ? null : assignedStaff.getId())
                .assignedStaffName(assignedStaff == null ? null : assignedStaff.getFullName())
                .status(session.getStatus().name())
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime())
                .estimatedDurationMinutes(booking.getEstimatedDurationMinutes())
                .feeAmount(session.getFeeAmount())
                .projectedLoyaltyPoints(session.getProjectedLoyaltyPoints())
                .awardedLoyaltyPoints(session.getAwardedLoyaltyPoints())
                .checkedInAt(session.getCheckedInAt())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .notes(session.getNotes())
                .build();
    }

    private EligibleSessionBookingResponse toEligibleBooking(Booking booking) {
        User assignedStaff = booking.getAssignedStaff();
        String customerTier = loyaltyService.getAccount(booking.getCustomer().getId()).tier();
        int customerPriorityScore = tierConfigService.getConfig(customerTier).priorityScore();
        return new EligibleSessionBookingResponse(
                booking.getId().toString(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getPlate(),
                booking.getPackageId() == null ? null : booking.getPackageId().toString(),
                booking.getComboId() == null ? null : booking.getComboId().toString(),
                booking.getBookingDate(),
                booking.getBookingTime(),
                booking.getFinalAmount(),
                booking.getEstimatedDurationMinutes(),
                assignedStaff == null ? null : assignedStaff.getId().toString(),
                assignedStaff == null ? null : assignedStaff.getFullName(),
                customerTier,
                customerPriorityScore
        );
    }

    private int count(List<WashSession> sessions, WashSessionStatus status) {
        return (int) sessions.stream()
                .filter(session -> session.getStatus() == status)
                .count();
    }
}

