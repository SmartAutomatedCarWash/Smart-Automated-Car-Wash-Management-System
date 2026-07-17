package com.autowash.service.impl;

import com.autowash.dto.AdminBookingResponse;
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
import com.autowash.dto.UpdateAdminCustomerRoleResponse;
import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.entity.PointTransaction;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.service.LoyaltyService;
import com.autowash.service.AdminReportingService;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.repository.VehicleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminReportingServiceImpl implements AdminReportingService {
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
            LoyaltyAccountRepository loyaltyAccountRepository
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
    }

    @Transactional
    public AdminAccountResponse createStaff(CreateAdminStaffRequest request) {
        if (UserRepository.existsByPhone(request.phone())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already registered", "DUPLICATE_PHONE");
        }
        if (UserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered", "DUPLICATE_EMAIL");
        }
        
        UserRole assignedRole = UserRole.STAFF;
        if (request.role() != null && !request.role().isBlank()) {
            try {
                assignedRole = UserRole.valueOf(request.role().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid role", "VALIDATION_ERROR");
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", "RESOURCE_NOT_FOUND"));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", "BUSINESS_RULE_VIOLATION");
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            staff.setFullName(request.fullName().trim());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            if (UserRepository.existsByPhoneAndIdNot(request.phone(), staffId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Phone number already registered", "DUPLICATE_PHONE");
            }
            staff.setPhone(request.phone().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            if (UserRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), staffId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Email already registered", "DUPLICATE_EMAIL");
            }
            staff.setEmail(request.email().trim());
        }
        if (request.password() != null && !request.password().isBlank()) {
            staff.setPasswordHash(passwordEncoder.encode(request.password()));
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

    @Transactional
    public AdminAccountResponse updateStaffStatus(UUID staffId, String status) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", "RESOURCE_NOT_FOUND"));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", "BUSINESS_RULE_VIOLATION");
        }
        staff.updateStatus(UserStatus.valueOf(status.toUpperCase()));
        return toAccountResponse(UserRepository.save(staff));
    }

    @Transactional
    public AdminAccountResponse deleteStaff(UUID staffId) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", "RESOURCE_NOT_FOUND"));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Target account is not staff", "BUSINESS_RULE_VIOLATION");
        }
        staff.updateStatus(UserStatus.INACTIVE);
        return toAccountResponse(UserRepository.save(staff));
    }

    @Transactional(readOnly = true)
    public List<com.autowash.dto.StaffKpiItem> listStaffKpi(String range) {
        java.time.ZoneId zone = java.time.ZoneId.systemDefault();
        java.time.Instant rangeStart = resolveRangeStart(range, zone);

        Set<WashSessionStatus> ACTIVE_SESSION_STATUSES = Set.of(
                WashSessionStatus.PENDING,
                WashSessionStatus.QUEUED,
                WashSessionStatus.CHECKED_IN,
                WashSessionStatus.IN_PROGRESS
        );
        long KPI_TARGET = 5_000_000L;

        return UserRepository.findByRoleOrderByFullNameAsc(UserRole.STAFF).stream()
                .map(staff -> {
                    // Completed sessions in range
                    long completedInRange = washSessionRepository.countByAssignedStaffAndStatusAndCompletedAtBetween(
                            staff, WashSessionStatus.COMPLETED, rangeStart, java.time.Instant.now());

                    // Revenue from completed bookings in range
                    long revenueInRange = bookingRepository
                            .sumCompletedRevenueByAssignedStaffAndRange(staff, rangeStart, java.time.Instant.now());

                    // Currently active sessions
                    long activeSessions = washSessionRepository.countByAssignedStaffAndStatusIn(staff, ACTIVE_SESSION_STATUSES);

                    // All-time assigned bookings
                    long totalAssigned = bookingRepository.countByAssignedStaffAndStatusIn(staff, REVENUE_STATUSES);

                    int progress = KPI_TARGET == 0 ? 100
                            : (int) Math.min(100, Math.round(revenueInRange * 100.0 / KPI_TARGET));

                    boolean isOnline = activeSessions > 0;

                    return new com.autowash.dto.StaffKpiItem(
                            staff.getId(),
                            staff.getFullName(),
                            staff.getStatus().name(),
                            completedInRange,
                            revenueInRange,
                            activeSessions,
                            totalAssigned,
                            progress,
                            KPI_TARGET,
                            isOnline
                    );
                })
                .sorted(java.util.Comparator.comparingLong(com.autowash.dto.StaffKpiItem::completedBookings).reversed())
                .toList();
    }

    private java.time.Instant resolveRangeStart(String range, java.time.ZoneId zone) {
        return switch (range == null ? "TODAY" : range.toUpperCase()) {
            case "WEEK" -> java.time.LocalDate.now(zone).with(java.time.DayOfWeek.MONDAY).atStartOfDay(zone).toInstant();
            case "MONTH" -> java.time.LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant();
            default -> java.time.LocalDate.now(zone).atStartOfDay(zone).toInstant(); // TODAY
        };
    }

    @Transactional(readOnly = true)
    public AdminStaffWorkloadResponse getStaffWorkload(UUID staffId) {
        User staff = UserRepository.findById(staffId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Staff not found", "RESOURCE_NOT_FOUND"));
        if (staff.getRole() != UserRole.STAFF) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Staff not found", "RESOURCE_NOT_FOUND");
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND"));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND");
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
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
                .mapToLong(Booking::getFinalAmount)
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
                .promotion(buildPromotionBreakdown(currentBookings, currentRevenue))
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
                        .promotionAttributionExact(false)
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

        Map<UUID, WashSession> sessionsByBookingId = sessionsByBookingId(bookings.getContent());
        Map<UUID, String> serviceNames = serviceNames(bookings.getContent());
        List<AdminBookingResponse> items = bookings.getContent().stream()
                .map(booking -> toBookingResponse(booking, sessionsByBookingId.get(booking.getId()), serviceNames))
                .toList();
        return new BookingPage(items, pagination(bookings));
    }

    @Transactional(readOnly = true)
    public com.autowash.dto.BookingDetailResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(UUID.fromString(bookingId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND"));
        
        String packageName = null;
        if (booking.getPackageId() != null) {
            packageName = PackageRepository.findById(booking.getPackageId())
                    .map(com.autowash.entity.Package::getName)
                    .orElse(booking.getPackageId().toString());
        } else if (booking.getComboId() != null) {
            packageName = ComboRepository.findById(booking.getComboId())
                    .map(com.autowash.entity.Combo::getName)
                    .orElse(booking.getComboId().toString());
        }

        var washSession = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElse(null);

        List<com.autowash.dto.BookingOptionResponse> optionSelections = booking.getOptions().stream()
                .map(option -> new com.autowash.dto.BookingOptionResponse(option.getOptionId().toString(), option.getOptionName(), option.getOptionPrice()))
                .toList();

        PaymentInfo payment = resolvePaymentInfo(booking);
        return new com.autowash.dto.BookingDetailResponse(
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
                booking.getPackageId() == null ? null : booking.getPackageId().toString(),
                packageName,
                optionSelections,
                new com.autowash.dto.BookingDetailResponse.Pricing(
                        booking.getBaseAmount(),
                        booking.getOptionsAmount(),
                        booking.getBaseAmount() + booking.getOptionsAmount(),
                        booking.getVoucherId() != null ? booking.getVoucherId().toString() : null,
                        booking.getVoucherDiscount(),
                        booking.getPromotionDiscount(),
                        booking.getFinalAmount(),
                        "VND"
                ),
                new com.autowash.dto.BookingDetailResponse.Scheduling(
                        booking.getBookingDate(),
                        booking.getBookingTime().toString(),
                        booking.getEstimatedDurationMinutes(),
                        booking.getBookingTime().plusMinutes(booking.getEstimatedDurationMinutes()).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))
                ),
                new com.autowash.dto.BookingDetailResponse.Payment(
                        payment.method().name(),
                        payment.status().name(),
                        payment.transactionRef(),
                        payment.paidAt()
                ),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                booking.getConfirmationExpiresAt(),
                washSession == null ? null : washSession.getId().toString(),
                null,
                washSession == null ? null : washSession.getStatus().name(),
                washSession == null ? null : washSession.getNotes(),
                booking.getCreatedAt(),
                null,
                List.of()
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
                lastBooking == null ? null : lastBooking.getFinalAmount()
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
    public com.autowash.dto.UpdateAdminCustomerRoleResponse updateCustomerTier(UUID customerId, String tier) {
        requireCustomer(customerId);
        String newTier = com.autowash.entity.TierConfig.normalizeTier(tier);
        loyaltyService.updateCustomerTierByAdmin(customerId, newTier);
        return new com.autowash.dto.UpdateAdminCustomerRoleResponse(
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND"));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND");
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
                    "VALIDATION_ERROR"
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
                    "VALIDATION_ERROR"
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
                    "VALIDATION_ERROR"
            );
        }
    }

    private void validateDateRange(LocalDate dateFrom, LocalDate dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "dateFrom must be before or equal to dateTo", "VALIDATION_ERROR");
        }
    }

    private void validateDateRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "dateFrom must be before or equal to dateTo", "VALIDATION_ERROR");
        }
    }

    private String normalizeSearch(String searchQuery) {
        return searchQuery == null || searchQuery.isBlank() ? null : searchQuery.trim();
    }

    private Map<UUID, WashSession> sessionsByBookingId(List<Booking> bookings) {
        List<UUID> bookingIds = bookings.stream().map(Booking::getId).toList();
        if (bookingIds.isEmpty()) {
            return Map.of();
        }
        return washSessionRepository.findByBooking_IdIn(bookingIds).stream()
                .collect(Collectors.toMap(session -> session.getBooking().getId(), Function.identity(), (first, second) -> first));
    }

    private Map<UUID, String> serviceNames(Collection<Booking> bookings) {
        List<UUID> packageIds = bookings.stream()
                .map(Booking::getPackageId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<UUID> comboIds = bookings.stream()
                .map(Booking::getComboId)
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

    private AdminBookingResponse toBookingResponse(Booking booking, WashSession session, Map<UUID, String> serviceNames) {
        String staffName = booking.getAssignedStaff() == null ? null : booking.getAssignedStaff().getFullName();
        PaymentInfo payment = resolvePaymentInfo(booking);
        return new AdminBookingResponse(
                booking.getId().toString(),
                booking.getId().toString(),
                booking.getCustomer().getId(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getPlate(),
                serviceId(booking) == null ? null : serviceId(booking).toString(),
                serviceNames.get(serviceId(booking)),
                booking.getBookingDate(),
                booking.getBookingTime(),
                booking.getFinalAmount(),
                payment.method().name(),
                payment.status().name(),
                booking.getStatus().name(),
                session == null ? null : session.getId(),
                session == null ? null : session.getStatus().name(),
                booking.getCreatedAt(),
                staffName
        );
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
        return booking.getPackageId() == null ? booking.getComboId() : booking.getPackageId();
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
                .filter(session -> session.getCompletedAt().atZone(java.time.ZoneOffset.UTC).toLocalDate().compareTo(dateFrom) >= 0)
                .filter(session -> session.getCompletedAt().atZone(java.time.ZoneOffset.UTC).toLocalDate().compareTo(dateTo) <= 0)
                .toList();
    }

    private long sumRevenue(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .mapToLong(Booking::getFinalAmount)
                .sum();
    }

    private long countCancelled(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CANCELLED)
                .count();
    }

    private boolean isDiscountAssisted(Booking booking) {
        return booking.getVoucherDiscount() > 0 || booking.getVoucherCode() != null;
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
                buildDailyPoints(currentBookings, window.currentFrom(), window.currentTo(), booking -> REVENUE_STATUSES.contains(booking.getStatus()) ? booking.getFinalAmount() : 0),
                buildDailyPoints(previousBookings, window.previousFrom(), window.previousTo(), booking -> REVENUE_STATUSES.contains(booking.getStatus()) ? booking.getFinalAmount() : 0)
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
            java.util.function.ToLongFunction<Booking> mapper
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
                    .filter(session -> session.getCompletedAt().atZone(java.time.ZoneOffset.UTC).toLocalDate().isEqual(current))
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
                .mapToLong(Booking::getFinalAmount)
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
                    long revenue = entry.getValue().stream().mapToLong(Booking::getFinalAmount).sum();
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

    private AdminBusinessHealthReportResponse.Breakdown buildPromotionBreakdown(List<Booking> bookings, long totalRevenue) {
        Map<String, List<Booking>> grouped = bookings.stream()
                .filter(booking -> REVENUE_STATUSES.contains(booking.getStatus()))
                .filter(this::isDiscountAssisted)
                .collect(Collectors.groupingBy(booking -> booking.getVoucherCode() == null ? "DISCOUNT_APPLIED" : booking.getVoucherCode()));

        List<AdminBusinessHealthReportResponse.BreakdownItem> items = grouped.entrySet().stream()
                .map(entry -> {
                    long revenue = entry.getValue().stream().mapToLong(Booking::getFinalAmount).sum();
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

        String message = "Promotion contribution is approximated from voucher and discount-assisted bookings.";
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
                    "Promotion visibility",
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
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Custom range requires dateFrom and dateTo", "VALIDATION_ERROR");
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

    private PaymentInfo resolvePaymentInfo(Booking booking) {
        return paymentRepository.findByBooking(booking)
                .map(payment -> new PaymentInfo(
                        payment.getMethod(),
                        payment.getStatus(),
                        payment.getTransactionRef(),
                        payment.getPaidAt()
                ))
                .orElseGet(() -> new PaymentInfo(PaymentMethod.CASH_AT_COUNTER, PaymentStatus.UNPAID, null, null));
    }

    private record TierChange(String fromTier, String toTier) {
    }

    private record PaymentInfo(
            PaymentMethod method,
            PaymentStatus status,
            String transactionRef,
            Instant paidAt
    ) {
    }
}

