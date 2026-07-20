package com.autowash.controller;

import com.autowash.dto.AdminAccountResponse;
import com.autowash.dto.CreateAdminStaffRequest;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.StaffKpiItem;
import com.autowash.dto.UpdateAdminStaffRequest;
import com.autowash.dto.UpdateUserStatusRequest;
import com.autowash.entity.Review;
import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.ReviewRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.AdminReportingService;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import com.autowash.shared.exception.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/manager/staff")
@Tag(name = "Manager Staff")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerStaffController {

    private static final String DEFAULT_RESET_PASSWORD = "Password123@";

    private final AdminReportingService adminReportingService;
    private final OperationsService operationsService;
    private final UserRepository userRepository;
    private final WashSessionRepository washSessionRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    public ManagerStaffController(
            AdminReportingService adminReportingService,
            OperationsService operationsService,
            UserRepository userRepository,
            WashSessionRepository washSessionRepository,
            ReviewRepository reviewRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.adminReportingService = adminReportingService;
        this.operationsService = operationsService;
        this.userRepository = userRepository;
        this.washSessionRepository = washSessionRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @Operation(summary = "List staff for manager MVP")
    public ApiResponse<ManagerStaffListResponse> listStaff(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "STAFF") String role
    ) {
        List<StaffRowResponse> filtered = adminReportingService.listStaff().stream()
                .filter(account -> matches(search, account.fullName(), account.email(), account.phone()))
                .filter(account -> "ALL".equalsIgnoreCase(status) || account.status().equalsIgnoreCase(status))
                .filter(account -> "ALL".equalsIgnoreCase(role) || account.role().equalsIgnoreCase(role))
                .map(this::toStaffRow)
                .toList();

        int safeSize = Math.max(1, size);
        int fromIndex = Math.min(Math.max(page, 0) * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());
        int totalPages = (int) Math.ceil(filtered.size() / (double) safeSize);

        return ApiResponse.ok(
                "Manager staff retrieved",
                new ManagerStaffListResponse(filtered.subList(fromIndex, toIndex), page, safeSize, filtered.size(), totalPages)
        );
    }

    @GetMapping("/summary")
    public ApiResponse<StaffSummaryResponse> getSummary() {
        List<StaffRowResponse> staff = adminReportingService.listStaff().stream().map(this::toStaffRow).toList();
        long available = staff.stream().filter(item -> "AVAILABLE".equals(item.currentStatus())).count();
        long busy = staff.stream().filter(item -> "BUSY".equals(item.currentStatus())).count();
        long overloaded = staff.stream().filter(item -> "OVERLOADED".equals(item.currentStatus())).count();
        long offline = staff.stream().filter(item -> !"ACTIVE".equals(item.accountStatus())).count();
        return ApiResponse.ok("Manager staff summary retrieved", new StaffSummaryResponse(staff.size(), available, busy, overloaded, offline));
    }

    @GetMapping("/performance")
    public ApiResponse<List<StaffKpiItem>> getPerformance(@RequestParam(defaultValue = "WEEK") String range) {
        return ApiResponse.ok("Manager staff performance retrieved", adminReportingService.listStaffKpi(range.toUpperCase()));
    }

    @GetMapping("/{staffId}/quick-detail")
    public ApiResponse<StaffQuickDetailResponse> getQuickDetail(@PathVariable UUID staffId) {
        StaffRowResponse row = adminReportingService.listStaff().stream()
                .filter(account -> account.accountId().equals(staffId))
                .findFirst()
                .map(this::toStaffRow)
                .orElseThrow();
        return ApiResponse.ok(
                "Manager staff quick detail retrieved",
                new StaffQuickDetailResponse(row.staffId(), row.fullName(), null, row.role(), row.currentStatus(), row.activeBookingCount(), row.averageRating(), row.reviewCount())
        );
    }

    @GetMapping("/{staffId}/active-bookings")
    public ApiResponse<List<ActiveBookingResponse>> getActiveBookings(@PathVariable UUID staffId) {
        List<ActiveBookingResponse> activeBookings = operationsService.getQueue().columns().stream()
                .flatMap(column -> column.sessions().stream())
                .filter(session -> staffId.equals(session.assignedStaffId()))
                .filter(session -> List.of("QUEUED", "CHECKED_IN", "IN_PROGRESS").contains(session.status()))
                .map(session -> new ActiveBookingResponse(session.bookingId(), session.bookingId(), session.servicePackage(), session.vehiclePlate(), session.customerName(), session.status(), session.status(), session.startedAt()))
                .toList();
        return ApiResponse.ok("Manager staff active bookings retrieved", activeBookings);
    }

    @GetMapping("/{staffId}/rating-summary")
    @Transactional(readOnly = true)
    public ApiResponse<RatingSummaryResponse> getRatingSummary(@PathVariable UUID staffId) {
        List<Review> reviews = findStaffReviews(staffId);
        Map<Integer, Long> distribution = reviews.stream()
                .collect(java.util.stream.Collectors.groupingBy(Review::getRating, java.util.stream.Collectors.counting()));
        double average = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        return ApiResponse.ok(
                "Manager staff rating summary retrieved",
                new RatingSummaryResponse(
                        Math.round(average * 10.0) / 10.0,
                        reviews.size(),
                        new RatingDistribution(
                                distribution.getOrDefault(5, 0L).intValue(),
                                distribution.getOrDefault(4, 0L).intValue(),
                                distribution.getOrDefault(3, 0L).intValue(),
                                distribution.getOrDefault(2, 0L).intValue(),
                                distribution.getOrDefault(1, 0L).intValue()
                        )
                )
        );
    }

    @GetMapping("/{staffId}/reviews")
    @Transactional(readOnly = true)
    public ApiResponse<List<ReviewRowResponse>> getReviews(@PathVariable UUID staffId, @RequestParam(defaultValue = "3") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        List<ReviewRowResponse> reviews = findStaffReviews(staffId).stream()
                .sorted(Comparator.comparing(Review::getCreatedAt).reversed())
                .limit(safeLimit)
                .map(review -> new ReviewRowResponse(
                        review.getId(),
                        review.getBooking().getId().toString(),
                        review.getBooking().getId().toString(),
                        review.getCustomer().getFullName(),
                        review.getRating(),
                        review.getComment(),
                        review.getCreatedAt(),
                        review.isFeatured() ? "FEATURED" : "PUBLISHED"
                ))
                .toList();
        return ApiResponse.ok("Manager staff reviews retrieved", reviews);
    }

    @PostMapping
    public ApiResponse<AdminAccountResponse> createStaff(@Valid @RequestBody CreateAdminStaffRequest request) {
        return ApiResponse.ok("Manager staff created", adminReportingService.createStaff(request));
    }

    @PutMapping("/{staffId}")
    public ApiResponse<AdminAccountResponse> updateStaff(@PathVariable UUID staffId, @Valid @RequestBody UpdateAdminStaffRequest request) {
        return ApiResponse.ok("Manager staff updated", adminReportingService.updateStaff(staffId, request));
    }

    @PatchMapping("/{staffId}/status")
    public ApiResponse<AdminAccountResponse> updateStaffStatus(@PathVariable UUID staffId, @Valid @RequestBody UpdateUserStatusRequest request) {
        return ApiResponse.ok("Manager staff status updated", adminReportingService.updateStaffStatus(staffId, request.status()));
    }

    @PostMapping("/{staffId}/reset-password")
    @Transactional
    public ApiResponse<ResetPasswordResponse> resetPassword(@PathVariable UUID staffId) {
        User staff = requireStaff(staffId);
        staff.setPasswordHash(passwordEncoder.encode(DEFAULT_RESET_PASSWORD));
        userRepository.save(staff);
        return ApiResponse.ok("Manager staff password reset", new ResetPasswordResponse(staffId, "Password reset to " + DEFAULT_RESET_PASSWORD));
    }

    private StaffRowResponse toStaffRow(AdminAccountResponse account) {
        long activeCount = activeCount(account.accountId());
        String currentStatus = !"ACTIVE".equals(account.status()) ? "OFFLINE" : activeCount >= 3 ? "OVERLOADED" : activeCount > 0 ? "BUSY" : "AVAILABLE";
        ReviewStats reviewStats = reviewStats(account.accountId(), account.role());
        return new StaffRowResponse(
                account.accountId(),
                account.fullName(),
                null,
                account.email(),
                account.phone(),
                account.role(),
                currentStatus,
                activeCount,
                0,
                reviewStats.averageRating(),
                reviewStats.reviewCount(),
                account.status()
        );
    }

    private long activeCount(UUID staffId) {
        return operationsService.getQueue().columns().stream()
                .flatMap(column -> column.sessions().stream())
                .filter(session -> staffId.equals(session.assignedStaffId()))
                .filter(session -> List.of("QUEUED", "CHECKED_IN", "IN_PROGRESS").contains(session.status()))
                .count();
    }

    private boolean matches(String search, String... values) {
        if (search == null || search.isBlank()) return true;
        String normalizedSearch = search.toLowerCase();
        for (String value : values) {
            if (value != null && value.toLowerCase().contains(normalizedSearch)) return true;
        }
        return false;
    }

    private User requireStaff(UUID staffId) {
        User staff = userRepository.findById(staffId).orElseThrow(() -> ApiException.notFound("Staff not found"));
        if (staff.getRole() != UserRole.STAFF) {
            throw ApiException.businessRule("User is not a staff account");
        }
        return staff;
    }

    private List<Review> findStaffReviews(UUID staffId) {
        User staff = requireStaff(staffId);
        List<UUID> bookingIds = washSessionRepository.findByAssignedStaffOrderByCreatedAtDesc(staff).stream()
                .map(WashSession::getBooking)
                .map(booking -> booking.getId())
                .toList();
        if (bookingIds.isEmpty()) {
            return List.of();
        }
        return reviewRepository.findByBookingIdIn(bookingIds);
    }

    private ReviewStats reviewStats(UUID staffId, String role) {
        if (!UserRole.STAFF.name().equalsIgnoreCase(role)) {
            return new ReviewStats(0.0, 0);
        }
        List<Review> reviews = findStaffReviews(staffId);
        double average = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        return new ReviewStats(Math.round(average * 10.0) / 10.0, reviews.size());
    }

    public record ManagerStaffListResponse(List<StaffRowResponse> items, int page, int size, int totalItems, int totalPages) {}
    public record StaffSummaryResponse(long totalStaff, long available, long busy, long overloaded, long offline) {}
    public record StaffRowResponse(UUID staffId, String fullName, String avatarUrl, String email, String phone, String role, String currentStatus, long activeBookingCount, int weeklyKpiPercent, double averageRating, int reviewCount, String accountStatus) {}
    public record StaffQuickDetailResponse(UUID staffId, String fullName, String avatarUrl, String title, String currentStatus, long activeBookingCount, double averageRating, int reviewCount) {}
    public record ActiveBookingResponse(String bookingId, String bookingCode, String vehicleName, String vehiclePlate, String customerName, String sessionStatus, String statusLabel, java.time.Instant startedAt) {}
    public record RatingSummaryResponse(double averageRating, int reviewCount, RatingDistribution distribution) {}
    public record RatingDistribution(int five, int four, int three, int two, int one) {}
    public record ReviewRowResponse(UUID reviewId, String bookingId, String bookingCode, String customerName, int rating, String comment, java.time.Instant reviewedAt, String status) {}
    public record ResetPasswordResponse(UUID staffId, String message) {}
    private record ReviewStats(double averageRating, int reviewCount) {}
}
