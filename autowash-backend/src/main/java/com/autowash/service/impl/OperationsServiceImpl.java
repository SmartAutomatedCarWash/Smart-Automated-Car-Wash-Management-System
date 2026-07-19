package com.autowash.service.impl;

import com.autowash.dto.CancelWashSessionResponse;
import com.autowash.dto.CheckInWashSessionResponse;
import com.autowash.dto.CompleteWashSessionResponse;
import com.autowash.dto.CreateWashSessionRequest;
import com.autowash.dto.CreateWashSessionResponse;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.QueueWashSessionResponse;
import com.autowash.dto.StartWashSessionResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.dto.StaffSessionHistoryResponse;
import com.autowash.dto.StaffTodayResponse;
import com.autowash.dto.TransferWashSessionResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.Notification;
import com.autowash.entity.Review;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.CancelFaultType;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.LoyaltyService;
import com.autowash.service.OperationsService;
import com.autowash.service.StaffAssignmentService;
import com.autowash.service.TierConfigService;
import com.autowash.service.WashSessionLifecycle;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.data.domain.PageRequest;
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
    private final LoyaltyService loyaltyService;
    private final CurrentUserService currentUserService;
    private final StaffAssignmentService staffAssignmentService;
    private final TierConfigService tierConfigService;
    private final NotificationRepository notificationRepository;
    private final ReviewRepository reviewRepository;
    private final String currency;

    public OperationsServiceImpl(
            BookingService bookingService,
            BookingRepository BookingRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyService loyaltyService,
            CurrentUserService currentUserService,
            StaffAssignmentService staffAssignmentService,
            TierConfigService tierConfigService,
            NotificationRepository notificationRepository,
            ReviewRepository reviewRepository,
            @Value("${autowash.currency}") String currency
    ) {
        this.bookingService = bookingService;
        this.BookingRepository = BookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyService = loyaltyService;
        this.currentUserService = currentUserService;
        this.staffAssignmentService = staffAssignmentService;
        this.tierConfigService = tierConfigService;
        this.notificationRepository = notificationRepository;
        this.reviewRepository = reviewRepository;
        this.currency = currency;
    }

    @Transactional
    public CreateWashSessionResponse createSession(CreateWashSessionRequest request) {
        Booking booking = bookingService.requireBookingForOperations(request.bookingId());
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking must be CONFIRMED or PENDING to create a wash session",
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

    @Transactional(readOnly = true)
    public List<EligibleSessionBookingResponse> listEligibleSessionBookings(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        User currentUser = currentUserService.getCurrentUser();
        List<Booking> bookings = currentUser.getRole() == UserRole.STAFF
                ? BookingRepository.findEligibleForAssignedStaffOperationsSession(
                        currentUser,
                        ELIGIBLE_BOOKING_STATUSES,
                        ACTIVE_SESSION_STATUSES,
                        PageRequest.of(0, safeLimit))
                : BookingRepository.findEligibleForOperationsSession(
                        ELIGIBLE_BOOKING_STATUSES,
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
                .queuedAt(session.getCreatedAt())
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
        session.checkIn(checkedInAt, (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L), currency, projectedPoints);
        bookingService.updateStatus(booking, BookingStatus.CHECKED_IN);
        
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(booking.getCustomer())
                .title("Xe đang được rửa")
                .message("Phiên rửa xe của bạn đã bắt đầu (" + session.getBooking().getVehicle().getPlate() + ").")
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
        bookingService.markBookingPaidForOperations(session.getBooking().getId().toString(), null);
        
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(session.getBooking().getCustomer())
                .title("Rửa xe hoàn tất")
                .message("Phiên rửa xe của bạn đã hoàn tất. Cảm ơn bạn đã sử dụng dịch vụ!")
                .type(NotificationType.WASH_COMPLETED)
                .read(false)
                .createdAt(Instant.now())
                .build());
        markCustomerAsNotNew(session.getBooking().getCustomer());
        return CompleteWashSessionResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .completedAt(session.getCompletedAt())
                .awardedLoyaltyPoints(earnResult.pointsAwarded())
                .build();
    }

    @Transactional
    public TransferWashSessionResponse transferSession(UUID sessionId, UUID toStaffId, String reason) {
        WashSession session = requireSessionForCurrentUser(sessionId);
        if (session.getStatus() == WashSessionStatus.COMPLETED || session.getStatus() == WashSessionStatus.CANCELLED) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Completed or cancelled sessions cannot be transferred",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }

        User fromStaff = session.getAssignedStaff();
        User toStaff = staffAssignmentService.requireActiveStaff(toStaffId);
        if (fromStaff != null && fromStaff.getId().equals(toStaff.getId())) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Session is already assigned to this staff member",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }

        String normalizedReason = reason == null || reason.isBlank() ? null : reason.trim();
        session.assignStaff(toStaff);
        session.getBooking().assignStaff(toStaff);

        return TransferWashSessionResponse.builder()
                .auditId(UUID.randomUUID())
                .sessionId(session.getId())
                .bookingId(session.getBooking().getId().toString())
                .fromStaffId(fromStaff == null ? null : fromStaff.getId())
                .fromStaffName(fromStaff == null ? null : fromStaff.getFullName())
                .toStaffId(toStaff.getId())
                .toStaffName(toStaff.getFullName())
                .reason(normalizedReason)
                .transferredAt(Instant.now())
                .build();
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
    public List<EligibleSessionBookingResponse> getEligibleSessionBookings(int limit) {
        return listEligibleSessionBookings(limit);
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

        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(1, Math.min(limit, 100));

        List<WashSession> completedSessions = washSessionRepository
                .findByAssignedStaffAndStatusOrderByCompletedAtDesc(staff, WashSessionStatus.COMPLETED);
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
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);

        return StaffSessionHistoryResponse.Item.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .vehiclePlate(booking.getVehicle().getPlate())
                .packageId(packageId == null ? null : packageId.toString())
                .servicePackage(resolvePrimaryItemName(booking))
                .assignedStaffId(assignedStaff == null ? null : assignedStaff.getId())
                .assignedStaffName(assignedStaff == null ? null : assignedStaff.getFullName())
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

    private User resolveSessionAssigneeForCreate(Booking booking, User actor) {
        User assignedStaff = booking.getAssignedStaff();
        if (actor.getRole() == UserRole.STAFF) {
            if (assignedStaff != null && !assignedStaff.getId().equals(actor.getId())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND);
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
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);
        return OperationsQueueResponse.WashSessionCard.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .vehiclePlate(booking.getVehicle().getPlate())
                .packageId(packageId == null ? null : packageId.toString())
                .servicePackage(resolvePrimaryItemName(booking))
                .assignedStaffId(assignedStaff == null ? null : assignedStaff.getId())
                .assignedStaffName(assignedStaff == null ? null : assignedStaff.getFullName())
                .status(session.getStatus().name())
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime())
                .estimatedDurationMinutes(resolveEstimatedDurationMinutes(booking))
                .feeAmount(session.getFeeAmount())
                .feeCurrency(session.getFeeAmount() == null ? null : currency)
                .projectedLoyaltyPoints(session.getProjectedLoyaltyPoints())
                .awardedLoyaltyPoints(session.getAwardedLoyaltyPoints())
                .queuedAt(session.getStatus() == WashSessionStatus.QUEUED ? session.getCreatedAt() : null)
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
        UUID packageId = resolveBookingDetailRefId(booking, BookingItemType.PACKAGE);
        UUID comboId = resolveBookingDetailRefId(booking, BookingItemType.COMBO);
        return new EligibleSessionBookingResponse(
                booking.getId().toString(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getPlate(),
                packageId == null ? null : packageId.toString(),
                comboId == null ? null : comboId.toString(),
                booking.getBookingDate(),
                booking.getBookingTime(),
                (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L),
                resolveEstimatedDurationMinutes(booking),
                assignedStaff == null ? null : assignedStaff.getId().toString(),
                assignedStaff == null ? null : assignedStaff.getFullName(),
                customerTier,
                customerPriorityScore
        );
    }

    private String resolvePrimaryItemName(Booking booking) {
        return booking.getDetails().stream()
                .filter(detail -> detail.getItemType() == BookingItemType.PACKAGE || detail.getItemType() == BookingItemType.COMBO)
                .findFirst()
                .map(BookingDetail::getSnapshotName)
                .orElse(null);
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
}

