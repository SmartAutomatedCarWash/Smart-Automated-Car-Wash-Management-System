package com.autowash.service.impl;

import com.autowash.dto.CancelWashSessionResponse;
import com.autowash.dto.CheckInWashSessionResponse;
import com.autowash.dto.CompleteWashSessionResponse;
import com.autowash.dto.CreateWashSessionRequest;
import com.autowash.dto.CreateWashSessionResponse;
import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.ManagerCheckInRecommendationResponse;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.QueueWashSessionResponse;
import com.autowash.dto.StartWashSessionResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffWorkloadItemResponse;
import com.autowash.dto.StaffWorkloadResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.dto.StaffSessionHistoryResponse;
import com.autowash.dto.StaffTodayResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.BookingStaffAssignment;
import com.autowash.entity.Notification;
import com.autowash.entity.Review;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.WashSessionStaffAssignment;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.CancelFaultType;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionStaffAssignmentRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.LoyaltyService;
import com.autowash.service.OperationsService;
import com.autowash.service.StaffAssignmentService;
import com.autowash.service.TierConfigService;
import com.autowash.service.WashSessionLifecycle;
import com.autowash.event.WebSocketEventPublisher;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.autowash.shared.dto.PaginatedResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperationsServiceImpl implements OperationsService {

    private static final Set<BookingStatus> ELIGIBLE_BOOKING_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
    );

    private static final Set<WashSessionStatus> ACTIVE_SESSION_STATUSES = Set.of(
            WashSessionStatus.PENDING,
            WashSessionStatus.QUEUED,
            WashSessionStatus.CHECKED_IN,
            WashSessionStatus.IN_PROGRESS
    );

    private final BookingService bookingService;
    private final BookingRepository BookingRepository;
    private final WashSessionRepository washSessionRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository;
    private final UserRepository userRepository;
    private final LoyaltyService loyaltyService;
    private final CurrentUserService currentUserService;
    private final StaffAssignmentService staffAssignmentService;
    private final TierConfigService tierConfigService;
    private final NotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;
    private final ReviewRepository reviewRepository;
    private final WebSocketEventPublisher webSocketEventPublisher;
    private final String currency;

    public OperationsServiceImpl(
            BookingService bookingService,
            BookingRepository BookingRepository,
            WashSessionRepository washSessionRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository,
            UserRepository userRepository,
            LoyaltyService loyaltyService,
            CurrentUserService currentUserService,
            StaffAssignmentService staffAssignmentService,
            TierConfigService tierConfigService,
            NotificationRepository notificationRepository,
            PaymentRepository paymentRepository,
            ReviewRepository reviewRepository,
            WebSocketEventPublisher webSocketEventPublisher,
            @Value("${autowash.currency}") String currency
    ) {
        this.bookingService = bookingService;
        this.BookingRepository = BookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.washSessionStaffAssignmentRepository = washSessionStaffAssignmentRepository;
        this.userRepository = userRepository;
        this.loyaltyService = loyaltyService;
        this.currentUserService = currentUserService;
        this.staffAssignmentService = staffAssignmentService;
        this.tierConfigService = tierConfigService;
        this.notificationRepository = notificationRepository;
        this.paymentRepository = paymentRepository;
        this.reviewRepository = reviewRepository;
        this.webSocketEventPublisher = webSocketEventPublisher;
        this.currency = currency;
    }

    @Transactional
    public CreateWashSessionResponse createSession(CreateWashSessionRequest request) {
        Booking booking = bookingService.reconcilePaidOwnedComboBooking(request.bookingId());
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking must be CONFIRMED to create a wash session",
                    ErrorCode.BUSINESS_RULE_VIOLATION
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
        User assignedStaff = resolveSessionAssigneeForCreate(booking, actor, request.preferredStaffId());
        WashSession session = washSessionRepository.save(WashSession.create(booking, request.notes(), assignedStaff));
        List<BookingDetailResponse.StaffAssignment> assignedStaffList = copyBookingStaffAssignmentsToSession(booking, session);
        CreateWashSessionResponse createResponse = CreateWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .bookingId(booking.getId().toString())
                .assignedStaffId(assignedStaff == null ? null : assignedStaff.getId())
                .assignedStaffName(assignedStaff == null ? null : assignedStaff.getFullName())
                .assignedStaff(assignedStaffList)
                .createdAt(session.getCreatedAt())
                .build();
        webSocketEventPublisher.publishWashSessionUpdate(session.getId().toString(), session.getStatus().name());
        return createResponse;
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
                        () -> new EnumMap<>(WashSessionStatus.class),
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

    @Transactional
    public PaginatedResponse<EligibleSessionBookingResponse> listEligibleSessionBookings(int page, int limit) {
        return listEligibleSessionBookings(page, limit, null);
    }

    @Transactional
    public PaginatedResponse<EligibleSessionBookingResponse> listEligibleSessionBookings(int page, int limit, LocalDate date) {
        int safePage = Math.max(1, page);
        int safeLimit = Math.max(1, Math.min(limit, 50));
        User currentUser = currentUserService.getCurrentUser();
        Page<Booking> bookingsPage;
        if (date != null) {
            Instant dayStart = date.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant dayEnd = date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            bookingsPage = currentUser.getRole() == UserRole.STAFF
                    ? BookingRepository.findEligibleForAssignedStaffOperationsSessionOnDate(
                            currentUser,
                            ELIGIBLE_BOOKING_STATUSES,
                            ACTIVE_SESSION_STATUSES,
                            dayStart,
                            dayEnd,
                            PageRequest.of(safePage - 1, safeLimit))
                    : BookingRepository.findEligibleForOperationsSessionOnDate(
                            ELIGIBLE_BOOKING_STATUSES,
                            ACTIVE_SESSION_STATUSES,
                            dayStart,
                            dayEnd,
                            PageRequest.of(safePage - 1, safeLimit));
        } else {
            bookingsPage = currentUser.getRole() == UserRole.STAFF
                    ? BookingRepository.findEligibleForAssignedStaffOperationsSession(
                            currentUser,
                            ELIGIBLE_BOOKING_STATUSES,
                            ACTIVE_SESSION_STATUSES,
                            PageRequest.of(safePage - 1, safeLimit))
                    : BookingRepository.findEligibleForOperationsSession(
                            ELIGIBLE_BOOKING_STATUSES,
                            ACTIVE_SESSION_STATUSES,
                            PageRequest.of(safePage - 1, safeLimit));
        }
        List<EligibleSessionBookingResponse> data = bookingsPage.getContent()
                .stream()
                .map(booking -> bookingService.reconcilePaidOwnedComboBooking(booking.getId().toString()))
                .map(this::toEligibleBooking)
                .toList();
        return new PaginatedResponse<>(data, bookingsPage.getTotalPages(), bookingsPage.getTotalElements());
    }

    @Override
    @Transactional
    public ManagerCheckInRecommendationResponse previewManagerCheckInRecommendation(String bookingId) {
        Booking booking = bookingService.reconcilePaidOwnedComboBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED && !canCollectCashAtCounterForCheckIn(booking)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking must be CONFIRMED or cash-at-counter pending to check in",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }

        List<BookingStaffAssignment> currentAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        User currentStaff = currentAssignments.isEmpty() ? booking.getAssignedStaff() : currentAssignments.get(0).getStaff();
        boolean currentAvailable = currentStaff != null && staffAssignmentService.isStaffAvailableForBooking(currentStaff, booking);
        List<ManagerCheckInRecommendationResponse.ManagerCheckInRecommendationItem> candidates = staffAssignmentService.rankActiveStaffForBooking(booking)
                .stream()
                .map(staff -> toCheckInRecommendationItem(staff, booking))
                .toList();
        String currentStaffStatus = currentStaff == null ? "UNASSIGNED" : currentAvailable ? "AVAILABLE" : "BUSY";
        boolean needsReassignment = currentStaff == null || !currentAvailable;

        return new ManagerCheckInRecommendationResponse(
                booking.getId().toString(),
                currentStaff == null ? null : currentStaff.getId().toString(),
                currentStaff == null ? null : currentStaff.getFullName(),
                currentStaffStatus,
                needsReassignment,
                needsReassignment
                        ? "Assigned staff is not available for this booking time. Review an available recommendation before check-in."
                        : "Assigned staff is available for this booking time.",
                candidates
        );
    }

    private boolean canCollectCashAtCounterForCheckIn(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            return false;
        }
        return paymentRepository.findFirstByBookingOrderByCreatedAtDesc(booking)
                .map(payment -> payment.getMethod() == PaymentMethod.CASH_AT_COUNTER
                        && payment.getStatus() != PaymentStatus.PAID
                        && payment.getAmount() > 0)
                .orElse(false);
    }

    @Transactional
    public QueueWashSessionResponse queueSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.QUEUED);
        session.queue(Instant.now());
        QueueWashSessionResponse queueResponse = QueueWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .queuedAt(session.getCreatedAt())
                .build();
        webSocketEventPublisher.publishWashSessionUpdate(session.getId().toString(), session.getStatus().name());
        return queueResponse;
    }

    @Transactional
    public CheckInWashSessionResponse checkInSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        Booking booking = session.getBooking();
        ensureSessionAssigneeForCheckIn(session);
        bookingService.ensureBookingPaymentReadyForCheckIn(booking.getId().toString());
        int projectedPoints = loyaltyService.calculateEarnPoints(sessionId);

        Instant checkedInAt = Instant.now();
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.CHECKED_IN);
        session.checkIn(checkedInAt, (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L), currency, projectedPoints);
        bookingService.updateStatus(booking, BookingStatus.CHECKED_IN);
        
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(booking.getCustomer())
                .title("Car Wash in Progress")
                .message("Your car wash session has started (" + session.getBooking().getVehicle().getPlate() + ").")
                .type(NotificationType.WASH_CHECKED_IN)
                .read(false)
                .createdAt(Instant.now())
                .build());
        return CheckInWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .checkedInAt(session.getCheckedInAt())
                .fee(new CheckInWashSessionResponse.Fee(session.getFeeAmount() == null ? 0L : session.getFeeAmount(), currency))
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
        StartWashSessionResponse startResponse = StartWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .build();
        webSocketEventPublisher.publishWashSessionUpdate(session.getId().toString(), session.getStatus().name());
        return startResponse;
    }

    @Transactional
    public CompleteWashSessionResponse completeSession(UUID sessionId) {
        WashSession session = requireSessionForCurrentUser(sessionId);

        Instant completedAt = Instant.now();
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.COMPLETED);
        session.complete(completedAt);
        bookingService.updateStatus(session.getBooking(), BookingStatus.COMPLETED);
        bookingService.markBookingPaidForOperations(session.getBooking().getId().toString(), null);

        EarnPointsResponse earnResult = loyaltyService.postEarnTransaction(
                session.getBooking().getCustomer().getId(),
                sessionId
        );
        session.recordAwardedPoints(earnResult.pointsAwarded());
        
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(session.getBooking().getCustomer())
                .title("Car Wash Completed")
                .message("Your car wash session is complete. Thank you for using our service!")
                .type(NotificationType.WASH_COMPLETED)
                .read(false)
                .createdAt(Instant.now())
                .build());
        markCustomerAsNotNew(session.getBooking().getCustomer());
        CompleteWashSessionResponse completeResponse = CompleteWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .completedAt(session.getCompletedAt())
                .awardedLoyaltyPoints(earnResult.pointsAwarded())
                .build();
        webSocketEventPublisher.publishWashSessionUpdate(session.getId().toString(), session.getStatus().name());
        return completeResponse;
    }

    @Transactional
    public CancelWashSessionResponse cancelSession(UUID sessionId, String reason, String faultType) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.CANCELLED);
        String normalizedReason = normalizeCancelReason(reason);
        Instant cancelledAt = Instant.now();

        WashSessionStatus currentStatus = session.getStatus();
        boolean alreadyCheckedIn = (currentStatus == WashSessionStatus.CHECKED_IN
                || currentStatus == WashSessionStatus.IN_PROGRESS);

        CancelFaultType resolvedFault = null;
        BookingStatus targetBookingStatus;

        if (alreadyCheckedIn) {
            resolvedFault = parseFaultType(faultType);
            targetBookingStatus = (resolvedFault == CancelFaultType.CARWASH_FAULT) 
                    ? BookingStatus.CONFIRMED 
                    : BookingStatus.CANCELLED;
        } else {
            targetBookingStatus = BookingStatus.CONFIRMED;
        }

        session.cancel(cancelledAt, normalizedReason, resolvedFault);

        Booking booking = session.getBooking();
        if (targetBookingStatus == BookingStatus.CANCELLED) {
            bookingService.updateStatus(booking, targetBookingStatus);
            booking.cancel(normalizedReason);
        } else {
            bookingService.updateStatus(booking, targetBookingStatus);
        }

        return CancelWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .bookingId(booking.getId().toString())
                .bookingStatus(booking.getStatus().name())
                .reason(session.getCancelReason())
                .faultType(resolvedFault == null ? null : resolvedFault.name())
                .cancelledAt(session.getCancelledAt())
                .build();
    }

    @Transactional(readOnly = true)
    public StaffDashboardSummaryResponse getStaffSummary() {
        User staff = currentUserService.getCurrentUser();
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Staff role required", ErrorCode.FORBIDDEN);
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
    public PaginatedResponse<EligibleSessionBookingResponse> getEligibleSessionBookings(int page, int limit) {
        return listEligibleSessionBookings(page, limit);
    }

    @Transactional(readOnly = true)
    public StaffDashboardSummaryResponse getMyStaffSummary() {
        return getStaffSummary();
    }

    @Transactional(readOnly = true)
    public StaffTodayResponse getMySessionsToday(LocalDate date) {
        User staff = currentUserService.getCurrentUser();
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Staff role required", ErrorCode.FORBIDDEN);
        }

        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();
        Instant dayStart = targetDate.atStartOfDay(zone).toInstant();
        Instant dayEnd = targetDate.plusDays(1).atStartOfDay(zone).toInstant();

        // All wash sessions assigned to this staff today
        List<WashSession> sessions = washSessionRepository
                .findByAssignedStaffAndBookingDate(staff, dayStart, dayEnd);

        // All bookings assigned to this staff today (to catch bookings with no session yet)
        List<Booking> allBookings = BookingRepository
                .findTodayBookingsByAssignedStaff(staff, dayStart, dayEnd);

        // Build a set of bookingIds that already have a session
        Set<UUID> bookingIdsWithSession = sessions.stream()
                .map(s -> s.getBooking().getId())
                .collect(Collectors.toSet());

        // Metrics from sessions
        int checkedInCount  = (int) sessions.stream().filter(s -> s.getStatus() == WashSessionStatus.CHECKED_IN).count();
        int inProgressCount = (int) sessions.stream().filter(s -> s.getStatus() == WashSessionStatus.IN_PROGRESS).count();
        int completedCount  = (int) sessions.stream().filter(s -> s.getStatus() == WashSessionStatus.COMPLETED).count();
        int totalCount      = allBookings.size();

        StaffTodayResponse.Metrics metrics = StaffTodayResponse.Metrics.builder()
                .checkedInCount(checkedInCount)
                .inProgressCount(inProgressCount)
                .completedTodayCount(completedCount)
                .totalTodayCount(totalCount)
                .build();

        // waitingToStart = CHECKED_IN sessions
        List<StaffTodayResponse.SessionItem> waitingToStart = sessions.stream()
                .filter(s -> s.getStatus() == WashSessionStatus.CHECKED_IN)
                .map(s -> toSessionItem(s, staff))
                .toList();

        // inProgress = IN_PROGRESS sessions
        List<StaffTodayResponse.SessionItem> inProgressItems = sessions.stream()
                .filter(s -> s.getStatus() == WashSessionStatus.IN_PROGRESS)
                .map(s -> toSessionItem(s, staff))
                .toList();

        // todaySchedule = all bookings today, merged with session data where available
        List<StaffTodayResponse.SessionItem> scheduleItems = new ArrayList<>();

        // Add items for bookings that have sessions
        for (WashSession session : sessions) {
            scheduleItems.add(toSessionItem(session, staff));
        }

        // Add items for bookings without sessions yet
        for (Booking booking : allBookings) {
            if (!bookingIdsWithSession.contains(booking.getId())) {
                scheduleItems.add(toBookingOnlyItem(booking));
            }
        }

        // Sort by booking time
        scheduleItems.sort(Comparator.comparing(item -> item.bookingTime()));

        return StaffTodayResponse.builder()
                .staff(StaffTodayResponse.StaffInfo.builder()
                        .staffId(staff.getId().toString())
                        .staffName(staff.getFullName())
                        .build())
                .date(targetDate)
                .autoRefreshSeconds(15)
                .metrics(metrics)
                .waitingToStart(waitingToStart)
                .inProgress(inProgressItems)
                .todaySchedule(scheduleItems)
                .build();
    }

    @Transactional(readOnly = true)
    public StaffSessionHistoryResponse getMySessionHistory(
            int page,
            int limit,
            String period,
            LocalDate date,
            String servicePackage,
            String rating,
            String search,
            String sort
    ) {
        User staff = currentUserService.getCurrentUser();
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Staff role required", ErrorCode.FORBIDDEN);
        }

        List<WashSession> completedSessions = washSessionRepository
                .findByAssignedStaffAndStatusOrderByCompletedAtDesc(staff, WashSessionStatus.COMPLETED);
        return buildSessionHistoryResponse(completedSessions, page, limit, period, date, servicePackage, rating, search, sort);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffSessionHistoryResponse getManagerSessionHistory(
            int page,
            int limit,
            String period,
            LocalDate date,
            String servicePackage,
            String rating,
            String search,
            String sort,
            UUID staffId
    ) {
        List<WashSession> completedSessions = washSessionRepository
                .findByStatusOrderByCompletedAtDesc(WashSessionStatus.COMPLETED)
                .stream()
                .filter(session -> staffId == null || hasAssignedStaff(session, staffId))
                .toList();
        return buildSessionHistoryResponse(completedSessions, page, limit, period, date, servicePackage, rating, search, sort);
    }

    private StaffSessionHistoryResponse buildSessionHistoryResponse(
            List<WashSession> completedSessions,
            int page,
            int limit,
            String period,
            LocalDate date,
            String servicePackage,
            String rating,
            String search,
            String sort
    ) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        Map<UUID, Review> reviewsByBookingId = reviewsByBookingId(completedSessions);

        List<WashSession> filteredSessions = completedSessions.stream()
                .filter(session -> matchesHistoryPeriod(session, period, date))
                .filter(session -> matchesHistoryService(session, servicePackage))
                .filter(session -> matchesHistoryRating(reviewsByBookingId.get(session.getBooking().getId()), rating))
                .filter(session -> matchesHistorySearch(session, search))
                .sorted(historyComparator(sort, reviewsByBookingId))
                .toList();

        int fromIndex = Math.min((safePage - 1) * safeLimit, filteredSessions.size());
        int toIndex = Math.min(fromIndex + safeLimit, filteredSessions.size());
        List<StaffSessionHistoryResponse.Item> items = filteredSessions.subList(fromIndex, toIndex).stream()
                .map(session -> toHistoryItem(session, reviewsByBookingId.get(session.getBooking().getId())))
                .toList();

        int totalPages = filteredSessions.isEmpty()
                ? 0
                : (int) Math.ceil(filteredSessions.size() / (double) safeLimit);

        return StaffSessionHistoryResponse.builder()
                .summary(buildHistorySummary(filteredSessions, completedSessions, reviewsByBookingId))
                .items(items)
                .pagination(StaffSessionHistoryResponse.Pagination.builder()
                        .page(safePage)
                        .limit(safeLimit)
                        .totalItems(filteredSessions.size())
                        .totalPages(totalPages)
                        .build())
                .build();
    }

    private void markCustomerAsNotNew(User customer) {
        if (customer.isNewCustomer()) {
            customer.markNotNewCustomer();
        }
    }

    private Map<UUID, Review> reviewsByBookingId(List<WashSession> sessions) {
        Set<UUID> bookingIds = sessions.stream()
                .map(session -> session.getBooking().getId())
                .collect(Collectors.toSet());
        if (bookingIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Review> reviews = new HashMap<>();
        reviewRepository.findByBookingIdIn(bookingIds)
                .forEach(review -> reviews.put(review.getBooking().getId(), review));
        return reviews;
    }

    private StaffSessionHistoryResponse.Summary buildHistorySummary(
            List<WashSession> filteredSessions,
            List<WashSession> allCompletedSessions,
            Map<UUID, Review> reviewsByBookingId
    ) {
        LocalDate today = LocalDate.now();
        int completedToday = (int) allCompletedSessions.stream()
                .filter(session -> session.getCompletedAt() != null)
                .filter(session -> session.getCompletedAt().atZone(ZoneId.systemDefault()).toLocalDate().equals(today))
                .count();
        List<Integer> durations = filteredSessions.stream()
                .map(this::durationMinutes)
                .filter(duration -> duration != null && duration > 0)
                .toList();
        Integer averageDuration = durations.isEmpty()
                ? null
                : (int) Math.round(durations.stream().mapToInt(Integer::intValue).average().orElse(0));
        List<Integer> ratings = filteredSessions.stream()
                .map(session -> reviewsByBookingId.get(session.getBooking().getId()))
                .filter(review -> review != null)
                .map(Review::getRating)
                .toList();
        Double averageRating = ratings.isEmpty()
                ? null
                : Math.round(ratings.stream().mapToInt(Integer::intValue).average().orElse(0.0) * 10.0) / 10.0;

        return StaffSessionHistoryResponse.Summary.builder()
                .completedTotal(filteredSessions.size())
                .completedToday(completedToday)
                .averageDurationMinutes(averageDuration)
                .averageRating(averageRating)
                .reviewedCount(ratings.size())
                .unreviewedCount(filteredSessions.size() - ratings.size())
                .build();
    }

    private StaffSessionHistoryResponse.Item toHistoryItem(WashSession session, Review review) {
        Booking booking = session.getBooking();
        User assignedStaff = session.getAssignedStaff();
        List<BookingDetailResponse.StaffAssignment> assignedStaffList = sessionStaffAssignments(session);
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);

        List<com.autowash.dto.BookingDetailDto> services = session.getBooking().getDetails().stream()
                .map(detail -> new com.autowash.dto.BookingDetailDto(
                        detail.getId(),
                        detail.getItemType().name(),
                        detail.getRefId(),
                        detail.getSnapshotName(),
                        detail.getSnapshotPrice(),
                        detail.getQuantity(),
                        detail.getSubtotal(),
                        detail.getDurationMinutes()
                ))
                .toList();

        Long totalPrice = session.getBooking().getPricing() != null ? session.getBooking().getPricing().getFinalAmount() : null;

        return StaffSessionHistoryResponse.Item.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .vehiclePlate(booking.getVehicle().getPlate())
                .packageId(packageId == null ? null : packageId.toString())
                .servicePackage(resolvePrimaryItemName(booking))
                .assignedStaffId(primaryStaffId(assignedStaffList, assignedStaff))
                .assignedStaffName(primaryStaffName(assignedStaffList, assignedStaff))
                .assignedStaff(assignedStaffList)
                .status(session.getStatus().name())
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime() == null ? null : booking.getBookingTime().toString().substring(0, 5))
                .checkedInAt(session.getCheckedInAt())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .durationMinutes(durationMinutes(session))
                .managerNotes(session.getNotes())
                .customerNotes(booking.getNote())
                .review(toHistoryReview(review))
                .totalPrice(totalPrice)
                .services(services)
                .build();
    }

    private StaffSessionHistoryResponse.Review toHistoryReview(Review review) {
        if (review == null) {
            return StaffSessionHistoryResponse.Review.builder()
                    .hasReview(false)
                    .build();
        }

        return StaffSessionHistoryResponse.Review.builder()
                .hasReview(true)
                .id(review.getId().toString())
                .rating(review.getRating())
                .comment(review.getComment())
                .beforeImageUrl(review.getBeforeImageUrl())
                .afterImageUrl(review.getAfterImageUrl())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private boolean matchesHistoryPeriod(WashSession session, String period, LocalDate date) {
        if (session.getCompletedAt() == null) {
            return false;
        }
        String normalizedPeriod = normalizeFilter(period, "ALL");
        LocalDate completedDate = session.getCompletedAt().atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate today = LocalDate.now();

        return switch (normalizedPeriod) {
            case "TODAY" -> completedDate.equals(today);
            case "LAST_7_DAYS", "7_DAYS" -> !completedDate.isBefore(today.minusDays(7)) && !completedDate.isAfter(today);
            case "THIS_MONTH", "MONTH" -> completedDate.getYear() == today.getYear() && completedDate.getMonth() == today.getMonth();
            case "CUSTOM_DATE", "DATE" -> date == null || completedDate.equals(date);
            default -> true;
        };
    }

    private boolean matchesHistoryService(WashSession session, String servicePackage) {
        String normalizedService = normalizeNullable(servicePackage);
        if (normalizedService == null || "ALL".equalsIgnoreCase(normalizedService)) {
            return true;
        }
        String serviceName = resolvePrimaryItemName(session.getBooking());
        return serviceName != null && serviceName.equalsIgnoreCase(normalizedService);
    }

    private boolean matchesHistoryRating(Review review, String rating) {
        String normalizedRating = normalizeFilter(rating, "ALL");
        Integer value = review == null ? null : review.getRating();

        return switch (normalizedRating) {
            case "5", "FIVE" -> value != null && value == 5;
            case "4", "FOUR" -> value != null && value == 4;
            case "LOW", "BELOW_4" -> value != null && value < 4;
            case "NONE", "UNREVIEWED" -> value == null;
            default -> true;
        };
    }

    private boolean matchesHistorySearch(WashSession session, String search) {
        String normalizedSearch = normalizeNullable(search);
        if (normalizedSearch == null) {
            return true;
        }
        Booking booking = session.getBooking();
        String needle = normalizedSearch.toLowerCase();
        return containsIgnoreCase(booking.getVehicle().getPlate(), needle)
                || containsIgnoreCase(booking.getCustomer().getFullName(), needle)
                || containsIgnoreCase(booking.getCustomer().getPhone(), needle)
                || containsIgnoreCase(assignedStaffNames(sessionStaffAssignments(session)), needle)
                || booking.getId().toString().toLowerCase().contains(needle)
                || session.getId().toString().toLowerCase().contains(needle);
    }

    private Comparator<WashSession> historyComparator(String sort, Map<UUID, Review> reviewsByBookingId) {
        String normalizedSort = normalizeFilter(sort, "COMPLETED_DESC");
        Comparator<WashSession> completedAtComparator = Comparator.comparing(
                WashSession::getCompletedAt,
                Comparator.nullsLast(Comparator.naturalOrder())
        );

        return switch (normalizedSort) {
            case "COMPLETED_ASC", "OLDEST" -> completedAtComparator;
            case "RATING_ASC", "LOWEST_RATING" -> Comparator
                    .comparing((WashSession session) -> {
                        Review review = reviewsByBookingId.get(session.getBooking().getId());
                        return review == null ? 99 : review.getRating();
                    })
                    .thenComparing(completedAtComparator.reversed());
            case "DURATION_DESC", "LONGEST" -> Comparator
                    .comparing((WashSession session) -> durationMinutes(session) == null ? 0 : durationMinutes(session))
                    .reversed()
                    .thenComparing(completedAtComparator.reversed());
            default -> completedAtComparator.reversed();
        };
    }

    private Integer durationMinutes(WashSession session) {
        if (session.getStartedAt() == null || session.getCompletedAt() == null) {
            return null;
        }
        long minutes = ChronoUnit.MINUTES.between(session.getStartedAt(), session.getCompletedAt());
        return minutes > 0 ? (int) minutes : null;
    }

    private String normalizeFilter(String value, String fallback) {
        String normalized = normalizeNullable(value);
        return normalized == null ? fallback : normalized.toUpperCase().replace('-', '_');
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private boolean containsIgnoreCase(String value, String normalizedNeedle) {
        return value != null && value.toLowerCase().contains(normalizedNeedle);
    }

    private StaffTodayResponse.SessionItem toSessionItem(WashSession session, User staff) {
        Booking booking = session.getBooking();
        String bookingTimeStr = booking.getBookingTime() != null
                ? booking.getBookingTime().toString().substring(0, 5)
                : null;

        Integer elapsed = null;
        if (session.getStartedAt() != null && session.getStatus() == WashSessionStatus.IN_PROGRESS) {
            elapsed = (int) java.time.Duration.between(session.getStartedAt(), Instant.now()).toMinutes();
        }

        return StaffTodayResponse.SessionItem.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .bookingStatus(booking.getStatus().name())
                .sessionStatus(session.getStatus().name())
                .vehiclePlate(booking.getVehicle().getPlate())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .serviceName(resolvePrimaryItemName(booking))
                .bayCode(null)
                .bookingTime(bookingTimeStr)
                .checkedInAt(session.getCheckedInAt())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .estimatedDurationMinutes(resolveEstimatedDurationMinutes(booking))
                .elapsedMinutes(elapsed)
                .customerNote(booking.getNote())
                .managerNote(session.getNotes())
                .services(toBookingDetailDtos(booking))
                .build();
    }

    private StaffTodayResponse.SessionItem toBookingOnlyItem(Booking booking) {
        String bookingTimeStr = booking.getBookingTime() != null
                ? booking.getBookingTime().toString().substring(0, 5)
                : null;

        return StaffTodayResponse.SessionItem.builder()
                .sessionId(null)
                .bookingId(booking.getId().toString())
                .bookingStatus(booking.getStatus().name())
                .sessionStatus(null)
                .vehiclePlate(booking.getVehicle().getPlate())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .serviceName(resolvePrimaryItemName(booking))
                .bayCode(null)
                .bookingTime(bookingTimeStr)
                .checkedInAt(null)
                .startedAt(null)
                .completedAt(null)
                .estimatedDurationMinutes(resolveEstimatedDurationMinutes(booking))
                .elapsedMinutes(null)
                .customerNote(booking.getNote())
                .managerNote(null)
                .services(toBookingDetailDtos(booking))
                .build();
    }

    private WashSession requireSession(UUID sessionId) {
        return washSessionRepository.findWithBookingById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    private WashSession requireSessionForCurrentUser(UUID sessionId) {
        WashSession session = requireSession(sessionId);
        User currentUser = currentUserService.getCurrentUser();
        if (currentUser.getRole() != UserRole.STAFF) {
            return session;
        }
        User assignedStaff = session.getAssignedStaff();
        if (assignedStaff == null || !assignedStaff.getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        return session;
    }

    private User resolveSessionAssigneeForCreate(Booking booking, User actor, UUID preferredStaffId) {
        ensureBookingStaffAssignments(booking);
        User assignedStaff = booking.getAssignedStaff();
        if (actor.getRole() == UserRole.STAFF) {
            if (preferredStaffId != null && !preferredStaffId.equals(actor.getId())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND);
            }
            if (assignedStaff != null && !assignedStaff.getId().equals(actor.getId())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND);
            }
        }

        if (preferredStaffId != null) {
            User preferredStaff = staffAssignmentService.requireActiveStaff(preferredStaffId);
            if (!staffAssignmentService.isStaffAvailableForBooking(preferredStaff, booking)) {
                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Selected staff is busy during this booking time",
                        ErrorCode.BUSINESS_RULE_VIOLATION
                );
            }
            normalizeSingleBookingStaffAssignment(booking, preferredStaff);
            return preferredStaff;
        }

        if (assignedStaff == null || !staffAssignmentService.isStaffAvailableForBooking(assignedStaff, booking)) {
            assignedStaff = staffAssignmentService.pickLeastLoadedActiveStaffForBooking(booking);
            booking.assignStaff(assignedStaff);
        }
        return assignedStaff;
    }

    private void ensureBookingStaffAssignments(Booking booking) {
        List<BookingStaffAssignment> existingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        if (!existingAssignments.isEmpty()) {
            normalizeSingleBookingStaffAssignment(booking, existingAssignments.get(0).getStaff());
            return;
        }

        List<UUID> preferredStaffIds = booking.getAssignedStaff() == null ? List.of() : List.of(booking.getAssignedStaff().getId());
        User staff = staffAssignmentService.pickStaffGroupForBooking(booking, preferredStaffIds, 1).get(0);
        normalizeSingleBookingStaffAssignment(booking, staff);
    }

    private void normalizeSingleBookingStaffAssignment(Booking booking, User staff) {
        bookingStaffAssignmentRepository.deleteByBooking(booking);
        bookingStaffAssignmentRepository.flush();
        bookingStaffAssignmentRepository.save(new BookingStaffAssignment(booking, staff, 1));
        booking.assignStaff(staff);
    }

    private List<BookingDetailResponse.StaffAssignment> copyBookingStaffAssignmentsToSession(Booking booking, WashSession session) {
        washSessionStaffAssignmentRepository.deleteBySession(session);
        List<BookingStaffAssignment> bookingAssignments = bookingStaffAssignmentRepository.findByBookingOrderBySortOrderAsc(booking);
        List<BookingDetailResponse.StaffAssignment> response = new ArrayList<>();
        for (BookingStaffAssignment assignment : bookingAssignments) {
            washSessionStaffAssignmentRepository.save(new WashSessionStaffAssignment(session, assignment.getStaff(), assignment.getSortOrder()));
            response.add(new BookingDetailResponse.StaffAssignment(
                    assignment.getStaff().getId().toString(),
                    assignment.getStaff().getFullName(),
                    assignment.getSortOrder()
            ));
        }
        return response;
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
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        if (normalized.length() > 500) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cancel reason must be at most 500 characters",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        return normalized;
    }

    private CancelFaultType parseFaultType(String faultType) {
        if (faultType == null || faultType.isBlank()) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Fault type is required when cancelling a checked-in or in-progress session",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        try {
            return CancelFaultType.valueOf(faultType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid fault type. Must be CUSTOMER_FAULT or CARWASH_FAULT",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
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
        List<OperationsQueueResponse.WashSessionCard> sessions = Arrays.stream(includedStatuses)
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
        List<BookingDetailResponse.StaffAssignment> assignedStaffList = sessionStaffAssignments(session);
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);
        String customerTier = loyaltyService.getAccount(booking.getCustomer().getId()).tier();
        PaymentRepository.PaymentSummary payment = paymentRepository.findLatestSummaryByBookingId(booking.getId()).orElse(null);
        return OperationsQueueResponse.WashSessionCard.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .customerTier(customerTier)
                .vehiclePlate(booking.getVehicle().getPlate())
                .packageId(packageId == null ? null : packageId.toString())
                .servicePackage(resolvePrimaryItemName(booking))
                .assignedStaffId(primaryStaffId(assignedStaffList, assignedStaff))
                .assignedStaffName(primaryStaffName(assignedStaffList, assignedStaff))
                .assignedStaff(assignedStaffList)
                .status(session.getStatus().name())
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime())
                .estimatedDurationMinutes(resolveEstimatedDurationMinutes(booking))
                .feeAmount(session.getFeeAmount())
                .feeCurrency(session.getFeeAmount() == null ? null : currency)
                .paymentMethod(payment == null ? null : payment.getMethod())
                .paymentStatus(payment == null ? null : payment.getStatus())
                .projectedLoyaltyPoints(session.getProjectedLoyaltyPoints())
                .awardedLoyaltyPoints(session.getAwardedLoyaltyPoints())
                .queuedAt(session.getStatus() == WashSessionStatus.QUEUED ? session.getCreatedAt() : null)
                .checkedInAt(session.getCheckedInAt())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .notes(session.getNotes())
                .customerNotes(booking.getNote())
                .build();
    }

    private EligibleSessionBookingResponse toEligibleBooking(Booking booking) {
        User assignedStaff = booking.getAssignedStaff();
        List<BookingDetailResponse.StaffAssignment> assignedStaffList = bookingStaffAssignments(booking);
        String customerTier = loyaltyService.getAccount(booking.getCustomer().getId()).tier();
        int customerPriorityScore = tierConfigService.getConfig(customerTier).priorityScore();
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);
        UUID comboId = resolveBookingDetailRefId(booking, BookingItemType.COMBO);
        PaymentRepository.PaymentSummary payment = paymentRepository.findLatestSummaryByBookingId(booking.getId()).orElse(null);
        return new EligibleSessionBookingResponse(
                booking.getId().toString(),
                booking.getStatus().name(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getPlate(),
                packageId == null ? null : packageId.toString(),
                comboId == null ? null : comboId.toString(),
                booking.getBookingDate(),
                booking.getBookingTime(),
                (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L),
                payment == null ? null : payment.getMethod(),
                payment == null ? null : payment.getStatus(),
                resolveEstimatedDurationMinutes(booking),
                primaryStaffId(assignedStaffList, assignedStaff) == null ? null : primaryStaffId(assignedStaffList, assignedStaff).toString(),
                primaryStaffName(assignedStaffList, assignedStaff),
                assignedStaffList,
                customerTier,
                customerPriorityScore,
                booking.getNote()
        );
    }

    private ManagerCheckInRecommendationResponse.ManagerCheckInRecommendationItem toCheckInRecommendationItem(User staff, Booking booking) {
        boolean available = staffAssignmentService.isStaffAvailableForBooking(staff, booking);
        long waitingCount = washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.PENDING)
                + washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.QUEUED)
                + washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.CHECKED_IN);
        long activeCount = washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.IN_PROGRESS);
        long openCount = waitingCount + activeCount + bookingStaffAssignmentRepository.countByStaffAndBooking_StatusIn(staff, ELIGIBLE_BOOKING_STATUSES);
        Instant monthStart = YearMonth.now(ZoneId.systemDefault())
                .atDay(1)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();
        Instant monthEnd = YearMonth.now(ZoneId.systemDefault())
                .plusMonths(1)
                .atDay(1)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();
        long monthlyKpiRevenue = BookingRepository.sumCompletedRevenueForStaffKpiRange(staff, monthStart, monthEnd);

        return new ManagerCheckInRecommendationResponse.ManagerCheckInRecommendationItem(
                staff.getId(),
                staff.getFullName(),
                available ? "AVAILABLE" : "BUSY",
                Math.toIntExact(activeCount),
                Math.toIntExact(waitingCount),
                0,
                Math.toIntExact(openCount),
                monthlyKpiRevenue,
                0,
                available,
                available ? "Available for this booking time" : "Busy during this booking time",
                available
        );
    }

    private List<BookingDetailResponse.StaffAssignment> bookingStaffAssignments(Booking booking) {
        List<BookingDetailResponse.StaffAssignment> assignments = bookingStaffAssignmentRepository
                .findByBookingOrderBySortOrderAsc(booking)
                .stream()
                .map(this::toStaffAssignment)
                .toList();
        if (!assignments.isEmpty() || booking.getAssignedStaff() == null) {
            return assignments;
        }
        return List.of(toStaffAssignment(booking.getAssignedStaff(), 1));
    }

    private List<BookingDetailResponse.StaffAssignment> sessionStaffAssignments(WashSession session) {
        List<BookingDetailResponse.StaffAssignment> assignments = washSessionStaffAssignmentRepository
                .findBySessionOrderBySortOrderAsc(session)
                .stream()
                .map(this::toStaffAssignment)
                .toList();
        if (!assignments.isEmpty() || session.getAssignedStaff() == null) {
            return assignments;
        }
        return List.of(toStaffAssignment(session.getAssignedStaff(), 1));
    }

    private BookingDetailResponse.StaffAssignment toStaffAssignment(BookingStaffAssignment assignment) {
        return toStaffAssignment(assignment.getStaff(), assignment.getSortOrder());
    }

    private BookingDetailResponse.StaffAssignment toStaffAssignment(WashSessionStaffAssignment assignment) {
        return toStaffAssignment(assignment.getStaff(), assignment.getSortOrder());
    }

    private BookingDetailResponse.StaffAssignment toStaffAssignment(User staff, int sortOrder) {
        return new BookingDetailResponse.StaffAssignment(
                staff.getId().toString(),
                staff.getFullName(),
                sortOrder
        );
    }

    private UUID primaryStaffId(List<BookingDetailResponse.StaffAssignment> assignments, User fallback) {
        if (!assignments.isEmpty()) {
            return UUID.fromString(assignments.get(0).staffId());
        }
        return fallback == null ? null : fallback.getId();
    }

    private String primaryStaffName(List<BookingDetailResponse.StaffAssignment> assignments, User fallback) {
        if (!assignments.isEmpty()) {
            return assignments.get(0).staffName();
        }
        return fallback == null ? null : fallback.getFullName();
    }

    private String assignedStaffNames(List<BookingDetailResponse.StaffAssignment> assignments) {
        return assignments.stream()
                .map(BookingDetailResponse.StaffAssignment::staffName)
                .collect(Collectors.joining(" "));
    }

    private boolean hasAssignedStaff(WashSession session, UUID staffId) {
        return sessionStaffAssignments(session).stream()
                .anyMatch(staff -> staffId.toString().equals(staff.staffId()));
    }

    private String resolvePrimaryItemName(Booking booking) {
        return booking.getDetails().stream()
                .filter(detail -> detail.getItemType() == BookingItemType.PACKAGE || detail.getItemType() == BookingItemType.COMBO)
                .findFirst()
                .map(BookingDetail::getSnapshotName)
                .orElse(null);
    }

    private List<com.autowash.dto.BookingDetailDto> toBookingDetailDtos(Booking booking) {
        return booking.getDetails().stream()
                .map(detail -> new com.autowash.dto.BookingDetailDto(
                        detail.getId(),
                        detail.getItemType().name(),
                        detail.getRefId(),
                        detail.getSnapshotName(),
                        detail.getSnapshotPrice(),
                        detail.getQuantity(),
                        detail.getSubtotal(),
                        detail.getDurationMinutes()
                ))
                .toList();
    }

    private UUID resolveBookingDetailRefId(Booking booking, BookingItemType itemType) {
        return booking.getDetails().stream()
                .filter(detail -> detail.getItemType() == itemType)
                .map(BookingDetail::getRefId)
                .findFirst()
                .orElse(null);
    }

    private int resolveEstimatedDurationMinutes(Booking booking) {
        return booking.getDetails().stream()
                .mapToInt(BookingDetail::getDurationMinutes)
                .sum();
    }

    private int count(List<WashSession> sessions, WashSessionStatus status) {
        return (int) sessions.stream()
                .filter(session -> session.getStatus() == status)
                .count();
    }

    @Override
    public StaffWorkloadResponse getStaffWorkloads(int page, int limit, LocalDate date) {
        int safePage = Math.max(1, page);
        int safeLimit = Math.max(1, Math.min(limit, 50));
        User currentUser = currentUserService.getCurrentUser();

        List<WashSession> sessions = currentUser.getRole() == UserRole.STAFF
                ? washSessionRepository.findByAssignedStaffOrderByCreatedAtDesc(currentUser)
                : washSessionRepository.findAllByOrderByCreatedAtDesc();

        List<WashSession> sessionsForDate = sessions.stream()
                .filter(session -> date == null || date.equals(session.getBooking().getBookingDate()))
                .toList();

        List<Booking> eligibleBookings = listEligibleSessionBookings(1, 1000, date).data().stream()
                .map(item -> BookingRepository.findById(UUID.fromString(item.bookingId())).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();

        List<User> activeStaff = userRepository.findByRoleAndStatusOrderByFullNameAsc(UserRole.STAFF, UserStatus.ACTIVE);
        List<StaffWorkloadItemResponse> workload = activeStaff.stream()
                .map(staff -> toStaffWorkloadItem(staff, sessionsForDate, eligibleBookings))
                .sorted(Comparator
                        .comparingInt((StaffWorkloadItemResponse item) -> workloadStatusRank(item.status()))
                        .thenComparing(Comparator.comparingInt(StaffWorkloadItemResponse::openCount).reversed())
                        .thenComparing(StaffWorkloadItemResponse::staffName))
                .toList();

        int totalElements = workload.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeLimit);
        int startIndex = Math.min((safePage - 1) * safeLimit, totalElements);
        int endIndex = Math.min(startIndex + safeLimit, totalElements);
        List<StaffWorkloadItemResponse> pageData = workload.subList(startIndex, endIndex);
        return new StaffWorkloadResponse(pageData, totalPages, totalElements);
    }

    private StaffWorkloadItemResponse toStaffWorkloadItem(User staff, List<WashSession> sessions, List<Booking> eligibleBookings) {
        int waitingBookings = (int) eligibleBookings.stream()
                .filter(booking -> bookingHasStaff(booking, staff.getId()))
                .count();
        int waitingSessions = (int) sessions.stream()
                .filter(session -> hasAssignedStaff(session, staff.getId()))
                .filter(session -> session.getStatus() == WashSessionStatus.PENDING
                        || session.getStatus() == WashSessionStatus.QUEUED
                        || session.getStatus() == WashSessionStatus.CHECKED_IN)
                .count();
        int activeCount = (int) sessions.stream()
                .filter(session -> hasAssignedStaff(session, staff.getId()))
                .filter(session -> session.getStatus() == WashSessionStatus.IN_PROGRESS)
                .count();
        int completedCount = (int) sessions.stream()
                .filter(session -> hasAssignedStaff(session, staff.getId()))
                .filter(session -> session.getStatus() == WashSessionStatus.COMPLETED)
                .count();
        int delayedCount = (int) sessions.stream()
                .filter(session -> hasAssignedStaff(session, staff.getId()))
                .filter(this::isDelayedForStaffWorkload)
                .count();
        int openCount = waitingBookings + waitingSessions + activeCount;
        String status = openCount >= 4 || waitingBookings + waitingSessions >= 3 || delayedCount >= 2
                ? "OVERLOADED"
                : openCount > 0
                ? "BUSY"
                : "AVAILABLE";

        return new StaffWorkloadItemResponse(
                staff.getId(),
                staff.getFullName(),
                activeCount,
                waitingBookings + waitingSessions,
                completedCount,
                delayedCount,
                openCount,
                status
        );
    }

    private int workloadStatusRank(String status) {
        return switch (status) {
            case "OVERLOADED" -> 0;
            case "BUSY" -> 1;
            default -> 2;
        };
    }

    private boolean bookingHasStaff(Booking booking, UUID staffId) {
        return bookingStaffAssignments(booking).stream()
                .anyMatch(staff -> staffId.toString().equals(staff.staffId()));
    }

    private boolean isDelayedForStaffWorkload(WashSession session) {
        Instant now = Instant.now();
        if (session.getStatus() == WashSessionStatus.CHECKED_IN && session.getCheckedInAt() != null) {
            return session.getCheckedInAt().plus(12, ChronoUnit.MINUTES).isBefore(now);
        }
        if (session.getStatus() == WashSessionStatus.IN_PROGRESS && session.getStartedAt() != null) {
            long expectedMinutes = resolveEstimatedDurationMinutes(session.getBooking()) + 10L;
            return session.getStartedAt().plus(expectedMinutes, ChronoUnit.MINUTES).isBefore(now);
        }
        if ((session.getStatus() == WashSessionStatus.PENDING || session.getStatus() == WashSessionStatus.QUEUED)
                && session.getBooking().getScheduledAt() != null) {
            return session.getBooking().getScheduledAt().plus(15, ChronoUnit.MINUTES).isBefore(now);
        }
        return false;
    }
}

