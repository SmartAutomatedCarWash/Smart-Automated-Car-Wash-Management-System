package com.autowash.service.impl;

import com.autowash.assembler.BookingResponseAssembler;
import com.autowash.entity.WashSession;
import com.autowash.entity.BookingStaffAssignment;
import com.autowash.entity.WashSessionStaffAssignment;

import com.autowash.service.LoyaltyService;

import com.autowash.entity.TierConfig;

import com.autowash.entity.BookingDetail;

import com.autowash.entity.enums.BookingItemType;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.dto.UpdateAdminCustomerRoleResponse;

import com.autowash.dto.BookingDetailDto;

import com.autowash.dto.BookingDetailResponse;

import com.autowash.dto.StaffKpiItem;



import java.util.List;

import java.util.function.ToLongFunction;

import java.util.Comparator;

import java.time.format.DateTimeFormatter;

import java.time.ZoneOffset;

import java.time.DayOfWeek;

import java.time.LocalDate;

import java.time.Instant;

import java.time.ZoneId;

import java.util.ArrayList;

import java.util.Arrays;

import java.util.UUID;

import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;


import com.autowash.dto.AdminBookingResponse;
import com.autowash.dto.AdminBookingSummaryResponse;
import com.autowash.dto.AdminBusinessHealthReportResponse;
import com.autowash.dto.AdminAccountResponse;
import com.autowash.dto.AdminCustomerDetailResponse;
import com.autowash.dto.AdminCustomerVehicleResponse;
import com.autowash.dto.AdminOperationsDashboardResponse;
import com.autowash.dto.AdminStaffWorkloadResponse;
import com.autowash.dto.CreateAdminStaffRequest;
import com.autowash.dto.UpdateAdminStaffRequest;
import com.autowash.dto.AdminTierHistoryResponse;
import com.autowash.dto.AdminWashHistoryResponse;
import com.autowash.dto.AdjustTotalEarnedPointsResponse;
import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingStaffAssignmentRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.entity.PointTransaction;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.service.AdminReportingService;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionStaffAssignmentRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.repository.VehicleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Month;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autowash.repository.ReviewRepository;
import com.autowash.entity.Review;
import com.autowash.entity.BookingDetail;
import com.autowash.repository.BookingStatusHistoryRepository;
import com.autowash.entity.BookingStatusHistory;
import com.autowash.dto.BookingStatusHistoryItem;

@Service
public class AdminReportingServiceImpl implements AdminReportingService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final EnumSet<BookingStatus> REVENUE_STATUSES = EnumSet.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED
    );

    private final BookingRepository bookingRepository;
    private final WashSessionRepository washSessionRepository;
    private final UserRepository UserRepository;
    private final PackageRepository PackageRepository;
    private final ComboRepository ComboRepository;
    private final LoyaltyService loyaltyService;
    private final PointTransactionRepository pointTransactionRepository;
    private final VehicleRepository VehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PaymentRepository paymentRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository;
    private final BookingResponseAssembler bookingResponseAssembler;
    private final ReviewRepository reviewRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;

    public AdminReportingServiceImpl(
            BookingRepository bookingRepository,
            WashSessionRepository washSessionRepository,
            UserRepository UserRepository,
            PackageRepository PackageRepository,
            ComboRepository ComboRepository,
            LoyaltyService loyaltyService,
            PointTransactionRepository pointTransactionRepository,
            VehicleRepository VehicleRepository,
            PasswordEncoder passwordEncoder,
            PaymentRepository paymentRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            BookingStaffAssignmentRepository bookingStaffAssignmentRepository,
            WashSessionStaffAssignmentRepository washSessionStaffAssignmentRepository,
            BookingResponseAssembler bookingResponseAssembler,
            ReviewRepository reviewRepository,
            BookingStatusHistoryRepository bookingStatusHistoryRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.UserRepository = UserRepository;
        this.PackageRepository = PackageRepository;
        this.ComboRepository = ComboRepository;
        this.loyaltyService = loyaltyService;
        this.pointTransactionRepository = pointTransactionRepository;
        this.VehicleRepository = VehicleRepository;
        this.passwordEncoder = passwordEncoder;
        this.paymentRepository = paymentRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.bookingStaffAssignmentRepository = bookingStaffAssignmentRepository;
        this.washSessionStaffAssignmentRepository = washSessionStaffAssignmentRepository;
        this.bookingResponseAssembler = bookingResponseAssembler;
        this.reviewRepository = reviewRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
    }

    @Transactional
    public AdminAccountResponse createStaff(CreateAdminStaffRequest request) {
        if (UserRepository.existsByPhone(request.phone())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already registered", ErrorCode.DUPLICATE_PHONE);
        }
        if (UserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered", ErrorCode.DUPLICATE_EMAIL);
        }
        
        UserRole assignedRole = UserRole.STAFF;
        if (request.role() != null && !request.role().isBlank()) {
            try {
                assignedRole = UserRole.valueOf(request.role().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid role", ErrorCode.VALIDATION_ERROR);
            }
        }

        User staff = User.builder()
                .id(UUID.randomUUID())
                .fullName(request.fullName())
                .phone(request.phone())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(assignedRole)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        User saved = UserRepository.save(staff);
        return toAccountResponse(saved);
    }

    @Transactional
    public AdminAccountResponse updateStaff(UUID staffId, UpdateAdminStaffRequest request) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            staff.setFullName(request.fullName().trim());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            if (UserRepository.existsByPhoneAndIdNot(request.phone(), staffId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Phone number already registered", ErrorCode.DUPLICATE_PHONE);
            }
            staff.setPhone(request.phone().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            if (UserRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), staffId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Email already registered", ErrorCode.DUPLICATE_EMAIL);
            }
            staff.setEmail(request.email().trim());
        }
        if (request.password() != null && !request.password().isBlank()) {
            staff.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.status() != null) {
            staff.updateStatus(request.status());
        }
        staff.setUpdatedAt(Instant.now());
        return toAccountResponse(UserRepository.save(staff));
    }

    @Transactional(readOnly = true)
    public List<AdminAccountResponse> listStaff() {
        return UserRepository.findByRoleOrderByFullNameAsc(UserRole.STAFF).stream()
                .map(this::toAccountResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountPage listStaffPage(int page, int limit) {
        PageRequest pageRequest = PageRequest.of(Math.max(0, page - 1), Math.max(1, limit));
        Page<User> staffPage = UserRepository.findByRoleOrderByFullNameAsc(UserRole.STAFF, pageRequest);
        
        List<AdminAccountResponse> items = staffPage.stream()
                .map(this::toAccountResponse)
                .toList();

        return new AccountPage(
                items,
                new PaginationMeta(
                        pageRequest.getPageNumber() + 1,
                        pageRequest.getPageSize(),
                        staffPage.getTotalElements(),
                        staffPage.getTotalPages(),
                        staffPage.hasNext()
                )
        );
    }

    @Transactional
    public AdminAccountResponse updateStaffStatus(UUID staffId, String status) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        staff.updateStatus(UserStatus.valueOf(status.toUpperCase()));
        return toAccountResponse(UserRepository.save(staff));
    }

    @Transactional
    public AdminAccountResponse deleteStaff(UUID staffId) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        staff.updateStatus(UserStatus.INACTIVE);
        return toAccountResponse(UserRepository.save(staff));
    }

    @Transactional(readOnly = true)
    public StaffKpiPage listStaffKpiPage(String range, UUID staffId, int page, int limit) {
        ZoneId zone = ZoneId.systemDefault();
        Instant rangeStart = resolveRangeStart(range, zone);

        Set<WashSessionStatus> ACTIVE_SESSION_STATUSES = Set.of(
                WashSessionStatus.PENDING,
                WashSessionStatus.QUEUED,
                WashSessionStatus.CHECKED_IN,
                WashSessionStatus.IN_PROGRESS
        );

        List<Booking> allBookings = bookingRepository.findAll();
        List<Booking> rangeBookings = allBookings.stream()
                .filter(b -> !b.getCreatedAt().isBefore(rangeStart) && b.getCreatedAt().isBefore(Instant.now().plus(1, ChronoUnit.MINUTES)))
                .toList();
        List<WashSession> allSessions = washSessionRepository.findAllByOrderByCreatedAtDesc();
        List<WashSession> rangeSessions = allSessions.stream()
                .filter(s -> !s.getCreatedAt().isBefore(rangeStart) && s.getCreatedAt().isBefore(Instant.now().plus(1, ChronoUnit.MINUTES)))
                .toList();

        PageRequest pageRequest = PageRequest.of(Math.max(0, page - 1), Math.max(1, limit));
        Page<User> staffPage = UserRepository.findByRoleOrderByFullNameAsc(UserRole.STAFF, pageRequest);

        long KPI_TARGET = 5_000_000L;
        List<StaffKpiItem> items = staffPage.stream()
                .filter(staff -> staffId == null || staff.getId().equals(staffId))
                .map(staff -> {
                    long completedBookings = rangeSessions.stream()
                            .filter(s -> s.getStatus() == WashSessionStatus.COMPLETED && s.getAssignedStaff() != null && s.getAssignedStaff().getId().equals(staff.getId()))
                            .count();
                    long completedRevenue = rangeBookings.stream()
                            .filter(b -> b.getStatus() == BookingStatus.COMPLETED && b.getAssignedStaff() != null && b.getAssignedStaff().getId().equals(staff.getId()))
                            .mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L)
                            .sum();
                    long activeSessions = allSessions.stream()
                            .filter(s -> ACTIVE_SESSION_STATUSES.contains(s.getStatus()) && s.getAssignedStaff() != null && s.getAssignedStaff().getId().equals(staff.getId()))
                            .count();
                    long totalAssignedBookings = rangeBookings.stream()
                            .filter(b -> b.getAssignedStaff() != null && b.getAssignedStaff().getId().equals(staff.getId()))
                            .count();
                    int progress = (int) Math.min(100L, Math.round(((double) completedRevenue / Math.max(1, KPI_TARGET)) * 100));
                    boolean isOnline = staff.getStatus() == UserStatus.ACTIVE;
                    return new StaffKpiItem(
                            staff.getId(),
                            staff.getFullName(),
                            staff.getStatus().name(),
                            completedBookings,
                            completedRevenue,
                            activeSessions,
                            totalAssignedBookings,
                            progress,
                            KPI_TARGET,
                            isOnline
                    );
                })
                .toList();

        return new StaffKpiPage(
                items,
                new PaginationMeta(
                        pageRequest.getPageNumber() + 1,
                        pageRequest.getPageSize(),
                        staffPage.getTotalElements(),
                        staffPage.getTotalPages(),
                        staffPage.hasNext()
                )
        );
    }

    @Transactional(readOnly = true)
    public List<StaffKpiItem> listStaffKpi(String range) {
        return listStaffKpiPage(range, null, 1, Integer.MAX_VALUE).items();
    }

    @Transactional(readOnly = true)
    public ServiceQualityPage listServiceQuality(String range, int page, int limit) {
        ZoneId zone = ZoneId.systemDefault();
        Instant rangeStart = resolveRangeStart(range, zone);

        List<Booking> bookings = bookingRepository.findAll().stream()
                .filter(b -> !b.getCreatedAt().isBefore(rangeStart) && b.getCreatedAt().isBefore(Instant.now().plus(1, ChronoUnit.MINUTES)))
                .toList();
        Map<UUID, String> serviceNames = serviceNames(bookings);
        List<UUID> bookingIds = bookings.stream().map(Booking::getId).toList();
        
        List<Review> reviews = bookingIds.isEmpty() ? List.of() : reviewRepository.findByBookingIdIn(bookingIds);
        Map<UUID, List<Review>> reviewsByService = reviews.stream()
                .collect(Collectors.groupingBy(r -> serviceId(r.getBooking())));

        Map<String, List<Booking>> grouped = bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .collect(Collectors.groupingBy(b -> serviceId(b) == null ? "" : serviceId(b).toString()));

        List<ServiceQualityItem> allItems = grouped.entrySet().stream()
                .map(entry -> {
                    long revenue = entry.getValue().stream().mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L).sum();
                    UUID sId = entry.getKey().isBlank() ? null : UUID.fromString(entry.getKey());
                    String label = serviceNames.getOrDefault(sId, entry.getKey());
                    
                    List<Review> sReviews = sId != null ? reviewsByService.getOrDefault(sId, List.of()) : List.of();
                    Double rating = sReviews.isEmpty() ? null : sReviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
                    
                    return new ServiceQualityItem(label, entry.getValue().size(), revenue, rating);
                })
                .sorted(Comparator.comparingLong(ServiceQualityItem::bookings).reversed())
                .toList();

        int fromIndex = Math.min(Math.max(0, (page - 1) * limit), allItems.size());
        int toIndex = Math.min(fromIndex + limit, allItems.size());
        List<ServiceQualityItem> pageItems = allItems.subList(fromIndex, toIndex);

        PaginationMeta meta = new PaginationMeta(
                page,
                limit,
                allItems.size(),
                (int) Math.ceil((double) allItems.size() / limit),
                toIndex < allItems.size()
        );

        return new ServiceQualityPage(pageItems, meta);
    }

    private Instant resolveRangeStart(String range, ZoneId zone) {
        return switch (range == null ? "TODAY" : range.toUpperCase()) {
            case "WEEK" -> LocalDate.now(zone).with(DayOfWeek.MONDAY).atStartOfDay(zone).toInstant();
            case "MONTH" -> LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant();
            default -> LocalDate.now(zone).atStartOfDay(zone).toInstant(); // TODAY
        };
    }

    @Transactional(readOnly = true)
    public AdminStaffWorkloadResponse getStaffWorkload(UUID staffId) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Staff not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        long activeBookings = bookingRepository.countByAssignedStaffAndStatusIn(staff, REVENUE_STATUSES);
        long activeSessions = washSessionRepository.countByAssignedStaffAndStatusIn(staff, Set.of(
                WashSessionStatus.PENDING,
                WashSessionStatus.QUEUED,
                WashSessionStatus.CHECKED_IN,
                WashSessionStatus.IN_PROGRESS
        ));
        long completedSessions = washSessionRepository.countByAssignedStaffAndStatus(staff, WashSessionStatus.COMPLETED);
        long completedRevenue = bookingRepository.sumFinalAmountByAssignedStaffAndStatus(staff, BookingStatus.COMPLETED);
        return new AdminStaffWorkloadResponse(staff.getId(), staff.getFullName(), activeBookings, activeSessions, completedSessions, completedRevenue);
    }

    @Transactional
    public AdminAccountResponse updateCustomerStatus(UUID customerId, String status) {
        User customer = UserRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        customer.updateStatus(UserStatus.valueOf(status.toUpperCase()));
        return toAccountResponse(UserRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public AdminOperationsDashboardResponse getOperationsDashboard() {
        long pending = washSessionRepository.countByStatus(WashSessionStatus.PENDING)
                + washSessionRepository.countByStatus(WashSessionStatus.QUEUED);
        long checkedIn = washSessionRepository.countByStatus(WashSessionStatus.CHECKED_IN);
        long inProgress = washSessionRepository.countByStatus(WashSessionStatus.IN_PROGRESS);
        long completed = washSessionRepository.countByStatus(WashSessionStatus.COMPLETED);
        return new AdminOperationsDashboardResponse(
                pending + checkedIn + inProgress + completed,
                pending,
                checkedIn,
                inProgress,
                completed,
                UserRepository.countByRole(UserRole.STAFF)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingSummaryResponse getBookingSummary() {
        long total = bookingRepository.count();
        
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        Instant startOfToday = today.atStartOfDay(BUSINESS_ZONE).toInstant();
        Instant startOfTomorrow = today.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();
        long todayBookings = bookingRepository.countByScheduledAtBetween(startOfToday, startOfTomorrow);
        
        long inProgress = bookingRepository.countByStatus(BookingStatus.IN_PROGRESS);
        long completedCombo = bookingRepository.countCompletedComboBookings();
        
        return new AdminBookingSummaryResponse(total, todayBookings, inProgress, completedCombo);
    }

    @Transactional(readOnly = true)
    public AccountPage listAccounts(String role, String status, String searchQuery, int page, int limit) {
        UserRole parsedRole = parseRole(role);
        UserStatus parsedStatus = parseUserStatus(status);
        String normalizedSearch = normalizeSearch(searchQuery);
        String searchLike = normalizedSearch == null ? null : "%" + normalizedSearch.toLowerCase() + "%";

        Page<User> accounts = UserRepository.searchAccounts(
                parsedRole,
                parsedStatus,
                searchLike,
                PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending())
        );

        List<AdminAccountResponse> items = accounts.getContent().stream()
                .map(this::toAccountResponse)
                .toList();
        return new AccountPage(items, pagination(accounts));
    }

    @Transactional(readOnly = true)
    public AdminAccountResponse getAccountDetail(UUID accountId) {
        User account = UserRepository.findById(accountId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", ErrorCode.RESOURCE_NOT_FOUND));
        return toAccountResponse(account);
    }

    @Transactional(readOnly = true)
    public AdminBusinessHealthReportResponse getBusinessHealthReport(
            String range,
            String analysisGroup,
            LocalDate customDateFrom,
            LocalDate customDateTo
    ) {
        ReportWindow window = ReportWindow.resolve(range, customDateFrom, customDateTo);
        validateDateRange(window.currentFrom(), window.currentTo());
        validateDateRange(window.previousFrom(), window.previousTo());

        List<Booking> allBookings = bookingRepository.findAll();
        List<WashSession> allSessions = washSessionRepository.findAllByOrderByCreatedAtDesc();

        List<Booking> currentBookings = filterBookingsByDate(allBookings, window.currentFrom(), window.currentTo());
        List<Booking> previousBookings = filterBookingsByDate(allBookings, window.previousFrom(), window.previousTo());
        List<WashSession> currentCompletedSessions = filterCompletedSessionsByDate(allSessions, window.currentFrom(), window.currentTo());
        List<WashSession> previousCompletedSessions = filterCompletedSessionsByDate(allSessions, window.previousFrom(), window.previousTo());

        Map<UUID, String> serviceNames = serviceNames(allBookings);
        long currentRevenue = sumRevenue(currentBookings);
        long previousRevenue = sumRevenue(previousBookings);
        long completedBookings = currentCompletedSessions.size();
        long previousCompletedBookings = previousCompletedSessions.size();
        long averageBookingValue = currentBookings.isEmpty() ? 0 : Math.round((double) currentRevenue / currentBookings.size());
        double cancellationRate = percentage(countCancelled(currentBookings), currentBookings.size());
        long discountAssistedRevenue = currentBookings.stream()
                .filter(this::isDiscountAssisted)
                .mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L)
                .sum();

        AdminBusinessHealthReportResponse.Kpis kpis = AdminBusinessHealthReportResponse.Kpis.builder()
                .revenueThisPeriod(currentRevenue)
                .revenuePreviousPeriod(previousRevenue)
                .revenueGrowthRate(growthRate(currentRevenue, previousRevenue))
                .completedBookings(completedBookings)
                .completedBookingsGrowthRate(growthRate(completedBookings, previousCompletedBookings))
                .averageBookingValue(averageBookingValue)
                .cancellationRate(cancellationRate)
                .discountAssistedRevenue(discountAssistedRevenue)
                .build();

        AdminBusinessHealthReportResponse.Trends trends = AdminBusinessHealthReportResponse.Trends.builder()
                .revenue(buildRevenueTrend(currentBookings, previousBookings, window))
                .completedBookings(buildCompletedBookingsTrend(currentCompletedSessions, previousCompletedSessions, window))
                .build();

        AdminBusinessHealthReportResponse.Breakdowns breakdowns = AdminBusinessHealthReportResponse.Breakdowns.builder()
                .revenue(buildRevenueBreakdown(currentBookings, currentRevenue))
                .service(buildServiceBreakdown(currentBookings, currentRevenue, serviceNames))
                .discount(buildDiscountBreakdown(currentBookings, currentRevenue))
                .channel(AdminBusinessHealthReportResponse.Breakdown.builder()
                        .available(false)
                        .items(List.of())
                        .message("Channel data is unavailable in the current data model.")
                        .build())
                .build();

        List<AdminBusinessHealthReportResponse.Insight> insights = buildInsights(
                currentBookings,
                previousBookings,
                currentRevenue,
                previousRevenue,
                cancellationRate,
                percentage(countCancelled(previousBookings), previousBookings.size()),
                breakdowns.service().items()
        );

        List<AdminBusinessHealthReportResponse.BreakdownItem> topServices = breakdowns.service().items().stream()
                .limit(5)
                .toList();

        return AdminBusinessHealthReportResponse.builder()
                .period(AdminBusinessHealthReportResponse.Period.builder()
                        .key(window.key())
                        .label(window.label())
                        .dateFrom(window.currentFrom().toString())
                        .dateTo(window.currentTo().toString())
                        .build())
                .previousPeriod(AdminBusinessHealthReportResponse.Period.builder()
                        .key("PREVIOUS")
                        .label("Previous period")
                        .dateFrom(window.previousFrom().toString())
                        .dateTo(window.previousTo().toString())
                        .build())
                .kpis(kpis)
                .trends(trends)
                .breakdowns(breakdowns)
                .insights(insights)
                .topItems(AdminBusinessHealthReportResponse.TopItems.builder()
                        .services(topServices)
                        .build())
                .capabilities(AdminBusinessHealthReportResponse.Capabilities.builder()
                        .channelAvailable(false)
                        .discountAttributionExact(false)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public BookingPage listBookings(
            String status,
            LocalDate dateFrom,
            LocalDate dateTo,
            UUID customerId,
            String searchQuery,
            int page,
            int limit
    ) {
        validateDateRange(dateFrom, dateTo);
        List<BookingStatus> statuses = parseStatuses(status);
        String normalizedSearch = normalizeSearch(searchQuery);
        String searchLike = normalizedSearch == null ? null : "%" + normalizedSearch.toLowerCase() + "%";
        Page<Booking> bookings = bookingRepository.searchAdmin(
                statuses,
                !statuses.isEmpty(),
                customerId,
                dateFrom,
                dateTo,
                searchLike,
                PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending())
        );

        Map<UUID, WashSessionRepository.SessionSummary> sessionsByBookingId = sessionSummariesByBookingId(bookings.getContent());
        Map<UUID, String> serviceNames = serviceNames(bookings.getContent());
        
        List<UUID> bookingIds = bookings.getContent().stream().map(Booking::getId).toList();
        List<Review> reviews = reviewRepository.findByBookingIdIn(bookingIds);
        Map<UUID, Integer> ratingsByBookingId = reviews.stream()
                .collect(Collectors.toMap(r -> r.getBooking().getId(), Review::getRating, (r1, r2) -> r1));

        List<AdminBookingResponse> items = bookings.getContent().stream()
                .map(booking -> toBookingResponse(booking, sessionsByBookingId.get(booking.getId()), serviceNames, ratingsByBookingId))
                .toList();
        return new BookingPage(items, pagination(bookings));
    }

    @Transactional(readOnly = true)
    public BookingDetailResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(UUID.fromString(bookingId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
        
        String packageName = primaryServiceName(booking);

        var washSession = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElse(null);

        List<BookingDetailDto> mappedDetails = booking.getDetails().stream().map(d -> new BookingDetailDto(d.getId(), d.getItemType().name(), d.getRefId(), d.getSnapshotName(), d.getSnapshotPrice(), d.getQuantity(), d.getSubtotal(), d.getDurationMinutes())).toList();

        PaymentInfo payment = resolvePaymentInfo(booking);
        List<BookingDetailResponse.StaffAssignment> assignedStaff = assignedStaffForBookingDetail(booking, washSession);
        String staffName = firstStaffName(assignedStaff, booking.getAssignedStaff());

        List<BookingStatusHistoryItem> statusHistory = bookingStatusHistoryRepository.findByBooking_IdOrderByChangedAtAsc(booking.getId())
                .stream()
                .map(h -> new BookingStatusHistoryItem(
                        h.getOldStatus(),
                        h.getNewStatus(),
                        h.getChangedBy() != null ? h.getChangedBy().getFullName() : "System",
                        h.getReason(),
                        h.getChangedAt()
                ))
                .toList();

        Review reviewEntity = reviewRepository.findByBookingId(booking.getId()).orElse(null);
        BookingDetailResponse.ReviewInfo review = reviewEntity == null ? null : new BookingDetailResponse.ReviewInfo(
                (double) reviewEntity.getRating(),
                reviewEntity.getComment(),
                reviewEntity.getCreatedAt()
        );

        return new BookingDetailResponse(
                booking.getId().toString(),
                booking.getId().toString(),
                booking.getCustomer().getId().toString(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getConfirmationEmail(),
                booking.getVehicle().getId().toString(),
                booking.getVehicle().getPlate(),
                booking.getVehicle().getBrand(),
                booking.getVehicle().getModel(),
                packageName,
                mappedDetails,
                new BookingDetailResponse.Pricing(
                        booking.getPricing() != null ? booking.getPricing().getSubtotal() : 0L,
                        booking.getPricing() != null ? booking.getPricing().getDiscountRefSnapshot() : null,
                        booking.getPricing() != null ? booking.getPricing().getDiscountAmount() : 0L,
                        booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L,
                        "VND"
                ),
                new BookingDetailResponse.Scheduling(
                        booking.getBookingDate(),
                        booking.getBookingTime().toString(),
                        booking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum(),
                        booking.getBookingTime().plusMinutes(booking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum()).format(DateTimeFormatter.ofPattern("HH:mm"))
                ),
                bookingResponseAssembler.toPaymentResponse(
                        booking,
                        new BookingResponseAssembler.PaymentInfo(
                                PaymentMethod.valueOf(payment.method()),
                                PaymentStatus.valueOf(payment.status()),
                                payment.amount(),
                                payment.transactionRef(),
                                payment.paidAt()
                        )
                ),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                booking.getConfirmationExpiresAt(),
                washSession == null ? null : washSession.getId().toString(),
                staffName,
                assignedStaff,
                washSession == null ? null : washSession.getStatus().name(),
                washSession == null ? null : washSession.getNotes(),
                booking.getCreatedAt(),
                null,
                statusHistory,
                review
        );
    }

    @Transactional
    public AdminCustomerDetailResponse getCustomerDetail(UUID customerId) {
        User customer = requireCustomer(customerId);
        LoyaltyAccountResponse loyalty = loyaltyService.getAccount(customerId);
        Booking lastBooking = bookingRepository.findFirstByCustomerOrderByCreatedAtDesc(customer).orElse(null);

        long totalPointsEarned = sumPoints(customer, PointTransactionType.EARN);
        long totalPointsSpent = Math.abs(sumPoints(customer, PointTransactionType.REDEEM))
                + Math.abs(sumPoints(customer, PointTransactionType.EXPIRE));
        AdminCustomerDetailResponse.CustomerProfile profile = new AdminCustomerDetailResponse.CustomerProfile(
                customer.getFullName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getRole().name(),
                customer.getStatus().name(),
                loyalty.tier(),
                customer.getCreatedAt()
        );
        AdminCustomerDetailResponse.CustomerLoyalty loyaltySummary = new AdminCustomerDetailResponse.CustomerLoyalty(
                loyalty.currentPoints(),
                loyalty.tier(),
                loyalty.updatedAt()
        );
        AdminCustomerDetailResponse.CustomerSummary summary = new AdminCustomerDetailResponse.CustomerSummary(
                bookingRepository.countByCustomer(customer),
                bookingRepository.countByCustomerAndStatus(customer, BookingStatus.COMPLETED),
                bookingRepository.countByCustomerAndStatus(customer, BookingStatus.CANCELLED),
                washSessionRepository.countByBookingCustomerAndStatus(customer, WashSessionStatus.COMPLETED),
                bookingRepository.sumFinalAmountByCustomerAndStatus(customer, BookingStatus.COMPLETED),
                totalPointsEarned,
                totalPointsSpent,
                lastBooking == null ? null : lastBooking.getCreatedAt(),
                lastBooking == null ? null : lastBooking.getPricing() != null ? lastBooking.getPricing().getFinalAmount() : 0L
        );
        return new AdminCustomerDetailResponse(customer.getId(), profile, loyaltySummary, summary);
    }

    @Transactional
    public UpdateAdminCustomerRoleResponse updateCustomerRole(UUID customerId, String role) {
        User customer = requireCustomer(customerId);
        UserRole nextRole = parseRole(role);
        customer.updateRole(nextRole);
        User savedCustomer = UserRepository.save(customer);
        return new UpdateAdminCustomerRoleResponse(
                savedCustomer.getId(),
                savedCustomer.getRole().name(),
                savedCustomer.getUpdatedAt()
        );
    }

    @Transactional
    public UpdateAdminCustomerRoleResponse updateCustomerTier(UUID customerId, String tier) {
        requireCustomer(customerId);
        String newTier = TierConfig.normalizeTier(tier);
        loyaltyService.updateCustomerTierByAdmin(customerId, newTier);
        return new UpdateAdminCustomerRoleResponse(
                customerId,
                newTier,
                Instant.now()
        );
    }

    @Transactional
    public void adjustActivePoints(UUID customerId, int points, String reason) {
        requireCustomer(customerId);
        loyaltyService.adjustActivePoints(customerId, points, reason);
    }

    @Transactional
    public AdjustTotalEarnedPointsResponse adjustTotalEarnedPoints(UUID customerId, int pointsDelta, String reason) {
        requireCustomer(customerId);
        return loyaltyService.adjustTotalEarnedPoints(customerId, pointsDelta, reason);
    }

    @Transactional(readOnly = true)
    public WashHistoryPage getWashHistory(UUID customerId, Instant dateFrom, Instant dateTo, int page, int limit) {
        validateDateRange(dateFrom, dateTo);
        User customer = requireCustomer(customerId);
        Page<WashSession> sessions = washSessionRepository.searchCustomerSessions(
                customer,
                dateFrom,
                dateTo,
                PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending())
        );
        Map<UUID, String> serviceNames = serviceNames(sessions.getContent().stream().map(WashSession::getBooking).toList());
        List<AdminWashHistoryResponse> items = sessions.getContent().stream()
                .map(session -> toWashHistoryResponse(session, serviceNames))
                .toList();
        return new WashHistoryPage(items, pagination(sessions));
    }

    @Transactional(readOnly = true)
    public LoyaltyService.TransactionPage getPointHistory(
            UUID customerId,
            String type,
            Instant dateFrom,
            Instant dateTo,
            int page,
            int limit
    ) {
        validateDateRange(dateFrom, dateTo);
        requireCustomer(customerId);
        return loyaltyService.getTransactionHistory(customerId, type, dateFrom, dateTo, page, limit);
    }

    @Transactional(readOnly = true)
    public CustomerVehiclePage getCustomerVehicles(UUID customerId, int page, int limit) {
        User customer = requireCustomer(customerId);
        Page<Vehicle> vehicles = VehicleRepository.findByOwnerAndStatusOrderByCreatedAtAsc(
                customer,
                VehicleStatus.ACTIVE,
                PageRequest.of(Math.max(page - 1, 0), limit)
        );
        List<AdminCustomerVehicleResponse> items = vehicles.getContent().stream()
                .map(this::toCustomerVehicleResponse)
                .toList();
        return new CustomerVehiclePage(items, pagination(vehicles));
    }

    @Transactional(readOnly = true)
    public TierHistoryPage getTierHistory(UUID customerId, int page, int limit) {
        User customer = requireCustomer(customerId);
        Page<PointTransaction> transactions = pointTransactionRepository.search(
                customer,
                PointTransactionType.ADJUST,
                null,
                null,
                PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending())
        );
        List<AdminTierHistoryResponse> items = transactions.getContent().stream()
                .map(transaction -> toTierHistoryResponse(customer, transaction))
                .toList();
        return new TierHistoryPage(items, pagination(transactions));
    }

    private User requireCustomer(UUID customerId) {
        User customer = UserRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        return customer;
    }

    private List<BookingStatus> parseStatuses(String status) {
        if (status == null || status.isBlank()) {
            return List.of();
        }
        return Arrays.stream(status.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::parseStatus)
                .distinct()
                .toList();
    }

    private BookingStatus parseStatus(String value) {
        try {
            return BookingStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid status. Valid values: " + Arrays.toString(BookingStatus.values()),
                    ErrorCode.VALIDATION_ERROR
            );
        }
    }

    private UserRole parseRole(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UserRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid role. Valid values: " + Arrays.toString(UserRole.values()),
                    ErrorCode.VALIDATION_ERROR
            );
        }
    }

    private UserStatus parseUserStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UserStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid status. Valid values: " + Arrays.toString(UserStatus.values()),
                    ErrorCode.VALIDATION_ERROR
            );
        }
    }

    private void validateDateRange(LocalDate dateFrom, LocalDate dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "dateFrom must be before or equal to dateTo", ErrorCode.VALIDATION_ERROR);
        }
    }

    private void validateDateRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "dateFrom must be before or equal to dateTo", ErrorCode.VALIDATION_ERROR);
        }
    }

    private String normalizeSearch(String searchQuery) {
        return searchQuery == null || searchQuery.isBlank() ? null : searchQuery.trim();
    }

    private Map<UUID, WashSessionRepository.SessionSummary> sessionSummariesByBookingId(List<Booking> bookings) {
        List<UUID> bookingIds = bookings.stream().map(Booking::getId).toList();
        if (bookingIds.isEmpty()) {
            return Map.of();
        }
        return washSessionRepository.findLatestSummariesByBookingIds(bookingIds).stream()
                .collect(Collectors.toMap(WashSessionRepository.SessionSummary::getBookingId, Function.identity(), (first, second) -> first));
    }

    private Map<UUID, String> serviceNames(Collection<Booking> bookings) {
        List<UUID> packageIds = bookings.stream()
                .map(b -> firstDetailRefId(b, BookingItemType.PACKAGE))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<UUID> comboIds = bookings.stream()
                .map(b -> firstDetailRefId(b, BookingItemType.COMBO))
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, String> names = new HashMap<>();
        PackageRepository.findAllById(packageIds)
                .forEach(pkg -> names.put(pkg.getId(), pkg.getName()));
        ComboRepository.findAllById(comboIds)
                .forEach(combo -> names.put(combo.getId(), combo.getName()));
        return names;
    }

    private AdminBookingResponse toBookingResponse(
            Booking booking,
            WashSessionRepository.SessionSummary session,
            Map<UUID, String> serviceNames,
            Map<UUID, Integer> ratingsByBookingId
    ) {
        List<BookingDetailResponse.StaffAssignment> assignedStaff = bookingStaffAssignments(booking);
        String staffName = firstStaffName(assignedStaff, booking.getAssignedStaff());
        PaymentInfo payment = resolvePaymentInfo(booking);
        
        int durationMinutes = booking.getDetails() != null ? booking.getDetails().stream().mapToInt(BookingDetail::getDurationMinutes).sum() : 0;
        
        String sessionNote = session != null ? session.getNotes() : null;
        if (sessionNote == null) {
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                sessionNote = booking.getCancelReason() != null ? booking.getCancelReason() : "Customer cancelled";
            } else {
                sessionNote = booking.getNote();
            }
        }
        
        Integer rating = ratingsByBookingId.get(booking.getId());

        return new AdminBookingResponse(
                booking.getId().toString(),
                booking.getId().toString(),
                booking.getCustomer().getId(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getId(),
                booking.getVehicle().getPlate(),
                serviceNames.get(serviceId(booking)),
                booking.getBookingDate(),
                booking.getBookingTime(),
                (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L),
                payment.method(),
                payment.status(),
                booking.getStatus().name(),
                session == null ? null : session.getId(),
                session == null ? null : session.getStatus(),
                booking.getCreatedAt(),
                staffName,
                assignedStaff,
                rating,
                durationMinutes,
                sessionNote
        );
    }

    private List<BookingDetailResponse.StaffAssignment> assignedStaffForBookingDetail(Booking booking, WashSession washSession) {
        if (washSession != null) {
            List<BookingDetailResponse.StaffAssignment> sessionAssignments = sessionStaffAssignments(washSession);
            if (!sessionAssignments.isEmpty()) {
                return sessionAssignments;
            }
        }
        return bookingStaffAssignments(booking);
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

    private String firstStaffName(List<BookingDetailResponse.StaffAssignment> assignments, User fallback) {
        if (!assignments.isEmpty()) {
            return assignments.get(0).staffName();
        }
        return fallback == null ? null : fallback.getFullName();
    }

    private AdminAccountResponse toAccountResponse(User user) {
        String tier = "BRONZE";
        if (user.getRole() == UserRole.CUSTOMER) {
            tier = loyaltyAccountRepository.findByCustomerId(user.getId())
                    .map(a -> a.getTier())
                    .orElse("BRONZE");
        }
        return new AdminAccountResponse(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                tier,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private AdminWashHistoryResponse toWashHistoryResponse(WashSession session, Map<UUID, String> serviceNames) {
        Booking booking = session.getBooking();
        UUID serviceId = serviceId(booking);
        return AdminWashHistoryResponse.builder()
                .sessionId(session.getId())
                .bookingId(booking.getId().toString())
                .vehiclePlate(booking.getVehicle().getPlate())
                .Package(AdminWashHistoryResponse.ServicePackageSummary.builder()
                        .id(serviceId == null ? null : serviceId.toString())
                        .name(serviceNames.get(serviceId))
                        .build())
                .status(session.getStatus().name())
                .bookingDate(booking.getBookingDate())
                .bookingTime(booking.getBookingTime())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .fee(AdminWashHistoryResponse.Fee.builder().amount(session.getFeeAmount()).build())
                .pointsAwarded(session.getAwardedLoyaltyPoints())
                .build();
    }

    private AdminCustomerVehicleResponse toCustomerVehicleResponse(Vehicle vehicle) {
        return new AdminCustomerVehicleResponse(
                vehicle.getId(),
                vehicle.getPlate(),
                vehicle.getType().name(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getColor(),
                vehicle.getStatus().name(),
                vehicle.isPrimary(),
                washSessionRepository.findLastCompletedAtByVehicle(vehicle, WashSessionStatus.COMPLETED),
                washSessionRepository.countByBookingVehicleAndStatus(vehicle, WashSessionStatus.COMPLETED)
        );
    }

    private AdminTierHistoryResponse toTierHistoryResponse(User customer, PointTransaction transaction) {
        TierChange tierChange = parseTierChange(transaction.getReason(), "BRONZE");
        return new AdminTierHistoryResponse(
                transaction.getId(),
                tierChange.fromTier(),
                tierChange.toTier(),
                transaction.getReason(),
                transaction.getBalanceAfter(),
                transaction.getCreatedAt()
        );
    }

    private TierChange parseTierChange(String reason, String fallbackTier) {
        String prefix = "Tier upgraded from ";
        String separator = " to ";
        if (reason != null && reason.startsWith(prefix) && reason.contains(separator)) {
            String payload = reason.substring(prefix.length());
            String[] parts = payload.split(separator, 2);
            if (parts.length == 2) {
                return new TierChange(parts[0], parts[1]);
            }
        }
        return new TierChange(null, fallbackTier);
    }

    private UUID serviceId(Booking booking) {
        UUID packageId = firstDetailRefId(booking, BookingItemType.PACKAGE);
        return packageId != null ? packageId : firstDetailRefId(booking, BookingItemType.COMBO);
    }

    private String primaryServiceName(Booking booking) {
        UUID packageId = firstDetailRefId(booking, BookingItemType.PACKAGE);
        if (packageId != null) {
            return PackageRepository.findById(packageId)
                    .map(com.autowash.entity.Package::getName)
                    .orElse(packageId.toString());
        }
        UUID comboId = firstDetailRefId(booking, BookingItemType.COMBO);
        if (comboId != null) {
            return ComboRepository.findById(comboId)
                    .map(com.autowash.entity.Combo::getName)
                    .orElse(comboId.toString());
        }
        return null;
    }

    private UUID firstDetailRefId(Booking booking, BookingItemType itemType) {
        return booking.getDetails().stream()
                .filter(detail -> detail.getItemType() == itemType)
                .map(BookingDetail::getRefId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private long sumPoints(User customer, PointTransactionType type) {
        return pointTransactionRepository.sumPointsByCustomerAndType(customer, type);
    }

    private PaginationMeta pagination(Page<?> page) {
        return new PaginationMeta(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages(), page.hasNext());
    }

    private List<Booking> filterBookingsByDate(List<Booking> bookings, LocalDate dateFrom, LocalDate dateTo) {
        return bookings.stream()
                .filter(booking -> !booking.getBookingDate().isBefore(dateFrom))
                .filter(booking -> !booking.getBookingDate().isAfter(dateTo))
                .toList();
    }

    private List<WashSession> filterCompletedSessionsByDate(List<WashSession> sessions, LocalDate dateFrom, LocalDate dateTo) {
        return sessions.stream()
                .filter(session -> session.getCompletedAt() != null)
                .filter(session -> session.getCompletedAt().atZone(ZoneOffset.UTC).toLocalDate().compareTo(dateFrom) >= 0)
                .filter(session -> session.getCompletedAt().atZone(ZoneOffset.UTC).toLocalDate().compareTo(dateTo) <= 0)
                .toList();
    }

    private long sumRevenue(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L)
                .sum();
    }

    private long countCancelled(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CANCELLED)
                .count();
    }

    private boolean isDiscountAssisted(Booking booking) {
        return (booking.getPricing() != null ? booking.getPricing().getDiscountAmount() : 0L) > 0 || (booking.getPricing() != null ? booking.getPricing().getDiscountRefSnapshot() : null) != null;
    }

    private double growthRate(long current, long previous) {
        if (previous == 0) {
            return current == 0 ? 0 : 100;
        }
        return roundTwoDecimals(((double) (current - previous) / previous) * 100);
    }

    private double percentage(long part, long total) {
        if (total == 0) {
            return 0;
        }
        return roundTwoDecimals(((double) part / total) * 100);
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private AdminBusinessHealthReportResponse.Series buildRevenueTrend(
            List<Booking> currentBookings,
            List<Booking> previousBookings,
            ReportWindow window
    ) {
        return new AdminBusinessHealthReportResponse.Series(
                buildDailyPoints(currentBookings, window.currentFrom(), window.currentTo(), booking -> REVENUE_STATUSES.contains(booking.getStatus()) ? (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L) : 0),
                buildDailyPoints(previousBookings, window.previousFrom(), window.previousTo(), booking -> REVENUE_STATUSES.contains(booking.getStatus()) ? (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L) : 0)
        );
    }

    private AdminBusinessHealthReportResponse.Series buildCompletedBookingsTrend(
            List<WashSession> currentSessions,
            List<WashSession> previousSessions,
            ReportWindow window
    ) {
        return new AdminBusinessHealthReportResponse.Series(
                buildDailySessionPoints(currentSessions, window.currentFrom(), window.currentTo()),
                buildDailySessionPoints(previousSessions, window.previousFrom(), window.previousTo())
        );
    }

    private List<AdminBusinessHealthReportResponse.Point> buildDailyPoints(
            List<Booking> bookings,
            LocalDate dateFrom,
            LocalDate dateTo,
            ToLongFunction<Booking> mapper
    ) {
        List<AdminBusinessHealthReportResponse.Point> points = new ArrayList<>();
        for (LocalDate cursor = dateFrom; !cursor.isAfter(dateTo); cursor = cursor.plusDays(1)) {
            LocalDate current = cursor;
            long value = bookings.stream()
                    .filter(booking -> booking.getBookingDate().isEqual(current))
                    .mapToLong(mapper)
                    .sum();
            points.add(new AdminBusinessHealthReportResponse.Point(shortDateLabel(current), value));
        }
        return points;
    }

    private List<AdminBusinessHealthReportResponse.Point> buildDailySessionPoints(
            List<WashSession> sessions,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        List<AdminBusinessHealthReportResponse.Point> points = new ArrayList<>();
        for (LocalDate cursor = dateFrom; !cursor.isAfter(dateTo); cursor = cursor.plusDays(1)) {
            LocalDate current = cursor;
            long value = sessions.stream()
                    .filter(session -> session.getCompletedAt() != null)
                    .filter(session -> session.getCompletedAt().atZone(ZoneOffset.UTC).toLocalDate().isEqual(current))
                    .count();
            points.add(new AdminBusinessHealthReportResponse.Point(shortDateLabel(current), value));
        }
        return points;
    }

    private String shortDateLabel(LocalDate date) {
        return date.getMonthValue() + "/" + date.getDayOfMonth();
    }

    private AdminBusinessHealthReportResponse.Breakdown buildRevenueBreakdown(List<Booking> bookings, long totalRevenue) {
        long discountRevenue = bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .filter(this::isDiscountAssisted)
                .mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L)
                .sum();
        long fullPriceRevenue = Math.max(totalRevenue - discountRevenue, 0);

        return new AdminBusinessHealthReportResponse.Breakdown(
                true,
                List.of(
                        new AdminBusinessHealthReportResponse.BreakdownItem(
                                "full-price",
                                "Full price",
                                fullPriceRevenue,
                                bookings.stream().filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()) && !isDiscountAssisted(booking)).count(),
                                percentage(fullPriceRevenue, totalRevenue)
                        ),
                        new AdminBusinessHealthReportResponse.BreakdownItem(
                                "discount-assisted",
                                "Discount-assisted",
                                discountRevenue,
                                bookings.stream().filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()) && isDiscountAssisted(booking)).count(),
                                percentage(discountRevenue, totalRevenue)
                        )
                ),
                null
        );
    }

    private AdminBusinessHealthReportResponse.Breakdown buildServiceBreakdown(
            List<Booking> bookings,
            long totalRevenue,
            Map<UUID, String> serviceNames
    ) {
        Map<String, List<Booking>> grouped = bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .collect(Collectors.groupingBy(b -> serviceId(b) == null ? "" : serviceId(b).toString()));

        List<AdminBusinessHealthReportResponse.BreakdownItem> items = grouped.entrySet().stream()
                .map(entry -> {
                    long revenue = entry.getValue().stream().mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L).sum();
                    return new AdminBusinessHealthReportResponse.BreakdownItem(
                            entry.getKey(),
                            serviceNames.getOrDefault(entry.getKey().isBlank() ? null : UUID.fromString(entry.getKey()), entry.getKey()),
                            revenue,
                            entry.getValue().size(),
                            percentage(revenue, totalRevenue)
                    );
                })
                .sorted(Comparator.comparingLong(AdminBusinessHealthReportResponse.BreakdownItem::revenue).reversed())
                .toList();

        return new AdminBusinessHealthReportResponse.Breakdown(true, items, null);
    }

    private AdminBusinessHealthReportResponse.Breakdown buildDiscountBreakdown(List<Booking> bookings, long totalRevenue) {
        Map<String, List<Booking>> grouped = bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .filter(this::isDiscountAssisted)
                .collect(Collectors.groupingBy(booking -> (booking.getPricing() != null ? booking.getPricing().getDiscountRefSnapshot() : null) == null ? "DISCOUNT_APPLIED" : (booking.getPricing() != null ? booking.getPricing().getDiscountRefSnapshot() : null)));

        List<AdminBusinessHealthReportResponse.BreakdownItem> items = grouped.entrySet().stream()
                .map(entry -> {
                    long revenue = entry.getValue().stream().mapToLong(b -> b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L).sum();
                    return new AdminBusinessHealthReportResponse.BreakdownItem(
                            entry.getKey(),
                            entry.getKey(),
                            revenue,
                            entry.getValue().size(),
                            percentage(revenue, totalRevenue)
                    );
                })
                .sorted(Comparator.comparingLong(AdminBusinessHealthReportResponse.BreakdownItem::revenue).reversed())
                .toList();

        String message = "Discount contribution is approximated from discount-assisted bookings.";
        return new AdminBusinessHealthReportResponse.Breakdown(true, items, message);
    }

    private List<AdminBusinessHealthReportResponse.Insight> buildInsights(
            List<Booking> currentBookings,
            List<Booking> previousBookings,
            long currentRevenue,
            long previousRevenue,
            double currentCancellationRate,
            double previousCancellationRate,
            List<AdminBusinessHealthReportResponse.BreakdownItem> serviceItems
    ) {
        List<AdminBusinessHealthReportResponse.Insight> insights = new ArrayList<>();

        double revenueGrowth = growthRate(currentRevenue, previousRevenue);
        String revenueTone = revenueGrowth > 0 ? "positive" : revenueGrowth < 0 ? "negative" : "neutral";
        insights.add(new AdminBusinessHealthReportResponse.Insight(
                revenueTone,
                "Revenue momentum",
                revenueGrowth >= 0
                        ? "Revenue is up " + revenueGrowth + "% compared with the previous period."
                        : "Revenue is down " + Math.abs(revenueGrowth) + "% compared with the previous period."
        ));

        if (!serviceItems.isEmpty()) {
            AdminBusinessHealthReportResponse.BreakdownItem topService = serviceItems.getFirst();
            insights.add(new AdminBusinessHealthReportResponse.Insight(
                    "neutral",
                    "Top service contributor",
                    topService.label() + " is leading revenue contribution with " + topService.bookings() + " bookings in the selected period."
            ));
        }

        double cancellationDelta = roundTwoDecimals(currentCancellationRate - previousCancellationRate);
        String cancellationTone = cancellationDelta > 0 ? "negative" : cancellationDelta < 0 ? "positive" : "neutral";
        insights.add(new AdminBusinessHealthReportResponse.Insight(
                cancellationTone,
                "Cancellation pressure",
                cancellationDelta > 0
                        ? "Cancellation rate increased by " + cancellationDelta + " percentage points versus the previous period."
                        : cancellationDelta < 0
                        ? "Cancellation rate improved by " + Math.abs(cancellationDelta) + " percentage points versus the previous period."
                        : "Cancellation rate is stable versus the previous period."
        ));

        long discountAssistedBookings = currentBookings.stream().filter(this::isDiscountAssisted).count();
        if (discountAssistedBookings > 0) {
            insights.add(new AdminBusinessHealthReportResponse.Insight(
                    "neutral",
                    "Discount visibility",
                    "Discount-assisted bookings are tracked, but exact campaign attribution remains limited by the current data model."
            ));
        }

        return insights;
    }

    private record ReportWindow(
            String key,
            String label,
            LocalDate currentFrom,
            LocalDate currentTo,
            LocalDate previousFrom,
            LocalDate previousTo
    ) {
        private static ReportWindow resolve(String range, LocalDate customDateFrom, LocalDate customDateTo) {
            LocalDate today = LocalDate.now();
            String normalizedRange = range == null ? "LAST_30_DAYS" : range.trim().toUpperCase();
            return switch (normalizedRange) {
                case "LAST_7_DAYS" -> rollingWindow("LAST_7_DAYS", "Last 7 days", today.minusDays(6), today);
                case "THIS_MONTH" -> {
                    LocalDate start = today.withDayOfMonth(1);
                    yield windowWithEquivalentPrevious("THIS_MONTH", "This month", start, today);
                }
                case "THIS_QUARTER" -> {
                    LocalDate start = startOfQuarter(today);
                    yield windowWithEquivalentPrevious("THIS_QUARTER", "This quarter", start, today);
                }
                case "CUSTOM" -> {
                    if (customDateFrom == null || customDateTo == null) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Custom range requires dateFrom and dateTo", ErrorCode.VALIDATION_ERROR);
                    }
                    yield windowWithEquivalentPrevious("CUSTOM", "Custom range", customDateFrom, customDateTo);
                }
                default -> rollingWindow("LAST_30_DAYS", "Last 30 days", today.minusDays(29), today);
            };
        }

        private static ReportWindow rollingWindow(String key, String label, LocalDate currentFrom, LocalDate currentTo) {
            long days = ChronoUnit.DAYS.between(currentFrom, currentTo) + 1;
            LocalDate previousTo = currentFrom.minusDays(1);
            LocalDate previousFrom = previousTo.minusDays(days - 1);
            return new ReportWindow(key, label, currentFrom, currentTo, previousFrom, previousTo);
        }

        private static ReportWindow windowWithEquivalentPrevious(String key, String label, LocalDate currentFrom, LocalDate currentTo) {
            long days = ChronoUnit.DAYS.between(currentFrom, currentTo) + 1;
            LocalDate previousTo = currentFrom.minusDays(1);
            LocalDate previousFrom = previousTo.minusDays(days - 1);
            return new ReportWindow(key, label, currentFrom, currentTo, previousFrom, previousTo);
        }

        private static LocalDate startOfQuarter(LocalDate date) {
            Month firstMonthOfQuarter = Month.of(((date.getMonthValue() - 1) / 3) * 3 + 1);
            return LocalDate.of(date.getYear(), firstMonthOfQuarter, 1).with(TemporalAdjusters.firstDayOfMonth());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public com.autowash.dto.AdminVehicleDetailResponse getVehicleDetail(String vehicleId) {
        UUID parsedId;
        try {
            parsedId = UUID.fromString(vehicleId);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid vehicle id", ErrorCode.VALIDATION_ERROR);
        }

        var vehicle = VehicleRepository.findById(parsedId)
                .orElseGet(() -> bookingRepository.findWithVehicleById(parsedId)
                        .map(Booking::getVehicle)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Vehicle not found", ErrorCode.RESOURCE_NOT_FOUND)));

        List<Booking> bookings = bookingRepository.findByVehicleIdOrderByScheduledAtDesc(vehicle.getId());

        List<com.autowash.dto.AdminVehicleDetailResponse.VehicleBookingHistoryItem> bookingHistory = bookings.stream()
                .map(b -> {
                    String packageName = primaryServiceName(b);
                    return new com.autowash.dto.AdminVehicleDetailResponse.VehicleBookingHistoryItem(
                            b.getId().toString(),
                            b.getId().toString(),
                            b.getBookingDate(),
                            b.getBookingTime().toString(),
                            packageName,
                            b.getPricing() != null ? b.getPricing().getFinalAmount() : 0L,
                            b.getStatus().name()
                    );
                })
                .toList();

        return new com.autowash.dto.AdminVehicleDetailResponse(
                vehicle.getId().toString(),
                vehicle.getPlate(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getColor(),
                vehicle.getOwner().getFullName(),
                vehicle.getOwner().getPhone(),
                bookingHistory
        );
    }

    private PaymentInfo resolvePaymentInfo(Booking booking) {
        return paymentRepository.findLatestSummaryByBookingId(booking.getId())
                .map(payment -> new PaymentInfo(
                        defaultString(payment.getMethod(), PaymentMethod.CASH_AT_COUNTER.name()),
                        defaultString(payment.getStatus(), PaymentStatus.UNPAID.name()),
                        payment.getAmount(),
                        payment.getTransactionRef(),
                        payment.getPaidAt()
                ))
                .orElseGet(() -> new PaymentInfo(PaymentMethod.CASH_AT_COUNTER.name(), PaymentStatus.UNPAID.name(), 0L, null, null));
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record TierChange(String fromTier, String toTier) {
    }

    private record PaymentInfo(
            String method,
            String status,
            long amount,
            String transactionRef,
            Instant paidAt
    ) {
    }
}

