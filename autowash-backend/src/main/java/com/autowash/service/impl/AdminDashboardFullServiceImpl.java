package com.autowash.service.impl;

import com.autowash.entity.enums.BookingItemType;

import com.autowash.dto.AdminDashboardFullResponse;
import com.autowash.dto.AdminDashboardFullResponse.BookingTrend;
import com.autowash.dto.AdminDashboardFullResponse.BookingStatusDist;
import com.autowash.dto.AdminDashboardFullResponse.CustomerInsights;
import com.autowash.dto.AdminDashboardFullResponse.Kpis;
import com.autowash.dto.AdminDashboardFullResponse.LoyaltyTierDist;
import com.autowash.dto.AdminDashboardFullResponse.NoShowAlert;
import com.autowash.dto.AdminDashboardFullResponse.PeakHourData;
import com.autowash.dto.AdminDashboardFullResponse.RealTimeOps;
import com.autowash.dto.AdminDashboardFullResponse.RecentBooking;
import com.autowash.dto.AdminDashboardFullResponse.ReviewSummary;
import com.autowash.dto.AdminDashboardFullResponse.TopServices;
import com.autowash.dto.AdminDashboardFullResponse.VoucherStats;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingDetail;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.UserDiscountStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.SlotHoldRepository;
import com.autowash.repository.TierConfigRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.UserDiscountRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.AdminDashboardFullService;
import com.autowash.service.ReviewService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminDashboardFullServiceImpl implements AdminDashboardFullService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final UserDiscountRepository userDiscountRepository;
    private final WashSessionRepository washSessionRepository;
    private final SlotHoldRepository slotHoldRepository;
    private final TierConfigRepository tierConfigRepository;
    private final PackageRepository packageRepository;
    private final ComboRepository comboRepository;
    private final ReviewService reviewService;

    public AdminDashboardFullServiceImpl(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            UserDiscountRepository userDiscountRepository,
            WashSessionRepository washSessionRepository,
            SlotHoldRepository slotHoldRepository,
            TierConfigRepository tierConfigRepository,
            PackageRepository packageRepository,
            ComboRepository comboRepository,
            ReviewService reviewService
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.userDiscountRepository = userDiscountRepository;
        this.washSessionRepository = washSessionRepository;
        this.slotHoldRepository = slotHoldRepository;
        this.tierConfigRepository = tierConfigRepository;
        this.packageRepository = packageRepository;
        this.comboRepository = comboRepository;
        this.reviewService = reviewService;
    }

    @Override
    public AdminDashboardFullResponse getDashboardFull() {
        // Tier map: only used for recentBookings, noShowAlerts, customerInsights (VIP calc via SQL now)
        Map<String, String> tierByCustomerId = buildTierByCustomerIdMap();

        // Recent bookings: fetches only 10 rows with necessary joins
        List<Booking> recentBookings = bookingRepository.findTop10ByOrderByCreatedAtDesc(PageRequest.of(0, 10));
        Map<UUID, String> serviceNameMap = buildServiceNameMapFromBookings(recentBookings);

        return new AdminDashboardFullResponse(
                buildKpis(),
                buildBookingTrend(),
                buildBookingStatusDist(),
                buildPeakHours(),
                buildRealTimeOps(),
                buildLoyaltyTierDist(tierByCustomerId),
                buildVoucherStats(),
                buildTopServices(),
                buildCustomerInsights(tierByCustomerId),
                buildNoShowAlerts(tierByCustomerId),
                buildRecentBookings(recentBookings, serviceNameMap, tierByCustomerId),
                buildReviewSummary()
        );
    }

    // -------------------------------------------------------------------------
    // Helper: build service name map from a small list of bookings
    // -------------------------------------------------------------------------
    private Map<UUID, String> buildServiceNameMapFromBookings(List<Booking> bookings) {
        List<UUID> packageIds = bookings.stream()
                .map(b -> firstDetailRefId(b, BookingItemType.PACKAGE))
                .filter(Objects::nonNull).distinct().toList();
        List<UUID> comboIds = bookings.stream()
                .map(b -> firstDetailRefId(b, BookingItemType.COMBO))
                .filter(Objects::nonNull).distinct().toList();
        Map<UUID, String> names = new HashMap<>();
        if (!packageIds.isEmpty()) packageRepository.findAllById(packageIds).forEach(p -> names.put(p.getId(), p.getName()));
        if (!comboIds.isEmpty()) comboRepository.findAllById(comboIds).forEach(c -> names.put(c.getId(), c.getName()));
        return names;
    }

    // -------------------------------------------------------------------------
    // Helper: tier map by customerId string (needed for noShowAlerts + recentBookings)
    // -------------------------------------------------------------------------
    private Map<String, String> buildTierByCustomerIdMap() {
        return loyaltyAccountRepository.findAll().stream()
                .collect(Collectors.toMap(
                        la -> la.getCustomer().getId().toString(),
                        la -> la.getTier(),
                        (a, b) -> a
                ));
    }

    // -------------------------------------------------------------------------
    // Helper: resolve service ID from booking
    // -------------------------------------------------------------------------
    private UUID serviceId(Booking b) {
        UUID pkgId = firstDetailRefId(b, BookingItemType.PACKAGE);
        return pkgId != null ? pkgId : firstDetailRefId(b, BookingItemType.COMBO);
    }

    private UUID firstDetailRefId(Booking booking, BookingItemType itemType) {
        return booking.getDetails().stream()
                .filter(detail -> detail.getItemType() == itemType)
                .map(BookingDetail::getRefId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    // -------------------------------------------------------------------------
    // Section 1 — KPIs (all via SQL aggregates)
    // -------------------------------------------------------------------------
    private Kpis buildKpis() {
        ZoneId zone = ZoneId.systemDefault();
        Instant todayStart = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant todayEnd = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant();
        Instant yesterdayStart = LocalDate.now(zone).minusDays(1).atStartOfDay(zone).toInstant();

        List<BookingStatus> excluded = List.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW);
        long todayBookings = bookingRepository.countByScheduledAtBetweenAndStatusNotIn(todayStart, todayEnd, excluded);
        long yesterdayBookings = bookingRepository.countByScheduledAtBetweenAndStatusNotIn(yesterdayStart, todayStart, excluded);
        long delta = todayBookings - yesterdayBookings;

        long completedToday = bookingRepository.countByStatusAndUpdatedAtAfter(BookingStatus.COMPLETED, todayStart);

        long activeCustomers = userRepository.countByRoleAndStatus(UserRole.CUSTOMER, UserStatus.ACTIVE);

        long totalBookings = bookingRepository.count();
        long noShows = bookingRepository.countByStatusEnum(BookingStatus.NO_SHOW);
        double noShowRate = totalBookings > 0 ? (double) noShows / totalBookings * 100.0 : 0.0;

        long loyaltyMembers = loyaltyAccountRepository.count();

        long totalVouchers = userDiscountRepository.count();
        long usedVouchers = userDiscountRepository.countByStatus(UserDiscountStatus.USED);
        double voucherRedemptionRate = totalVouchers > 0
                ? (double) usedVouchers / totalVouchers * 100.0 : 0.0;

        long totalRevenue = bookingRepository.sumTotalRevenue();

        return new Kpis(todayBookings, delta, completedToday, activeCustomers,
                noShowRate, loyaltyMembers, voucherRedemptionRate, totalRevenue);
    }

    // -------------------------------------------------------------------------
    // Section 2 — Booking trend (last 7 days, 7 count queries)
    // -------------------------------------------------------------------------
    private BookingTrend buildBookingTrend() {
        ZoneId zone = ZoneId.systemDefault();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/dd").withZone(zone);
        List<BookingTrend.TrendPoint> points = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now(zone).minusDays(i);
            Instant start = date.atStartOfDay(zone).toInstant();
            Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
            long count = bookingRepository.countByScheduledAtBetween(start, end);
            points.add(new BookingTrend.TrendPoint(fmt.format(start), count));
        }
        return new BookingTrend(points);
    }

    // -------------------------------------------------------------------------
    // Section 2 — Booking status distribution (single GROUP BY query)
    // -------------------------------------------------------------------------
    private BookingStatusDist buildBookingStatusDist() {
        Map<BookingStatus, Long> byStatus = new HashMap<>();
        for (Object[] row : bookingRepository.countGroupByStatus()) {
            byStatus.put((BookingStatus) row[0], (Long) row[1]);
        }
        return new BookingStatusDist(
                byStatus.getOrDefault(BookingStatus.PENDING, 0L),
                byStatus.getOrDefault(BookingStatus.CONFIRMED, 0L),
                byStatus.getOrDefault(BookingStatus.CHECKED_IN, 0L),
                byStatus.getOrDefault(BookingStatus.IN_PROGRESS, 0L),
                byStatus.getOrDefault(BookingStatus.COMPLETED, 0L),
                byStatus.getOrDefault(BookingStatus.CANCELLED, 0L),
                byStatus.getOrDefault(BookingStatus.NO_SHOW, 0L)
        );
    }

    // -------------------------------------------------------------------------
    // Section 3 — Peak hours (last 30 days — only fetches scheduledAt timestamps)
    // -------------------------------------------------------------------------
    private PeakHourData buildPeakHours() {
        ZoneId zone = ZoneId.systemDefault();
        Instant from = LocalDate.now(zone).minusDays(30).atStartOfDay(zone).toInstant();

        // Only fetch the scheduledAt timestamps — not full booking objects
        List<Instant> scheduledAts = bookingRepository.findScheduledAtAfter(from);

        // Count by hour in memory (minimal data: just Instant values)
        Map<Integer, Long> countByHour = scheduledAts.stream()
                .collect(Collectors.groupingBy(
                        ts -> ts.atZone(zone).getHour(),
                        Collectors.counting()
                ));

        List<PeakHourData.HourSlot> slots = new ArrayList<>();
        for (int hour = 8; hour <= 20; hour++) {
            slots.add(new PeakHourData.HourSlot(String.format("%02d:00", hour), countByHour.getOrDefault(hour, 0L)));
        }
        return new PeakHourData(slots);
    }

    // -------------------------------------------------------------------------
    // Section 3 — Real-time operations
    // -------------------------------------------------------------------------
    private RealTimeOps buildRealTimeOps() {
        long heldSlots = slotHoldRepository.countActiveHolds(Instant.now());
        long waitingCars = washSessionRepository.countByStatus(WashSessionStatus.QUEUED)
                + washSessionRepository.countByStatus(WashSessionStatus.PENDING);
        long carsBeingWashed = washSessionRepository.countByStatus(WashSessionStatus.IN_PROGRESS)
                + washSessionRepository.countByStatus(WashSessionStatus.CHECKED_IN);
        long completedToday = washSessionRepository.countByStatus(WashSessionStatus.COMPLETED);
        long total = washSessionRepository.count();
        return new RealTimeOps(heldSlots, waitingCars, carsBeingWashed, completedToday, total);
    }

    // -------------------------------------------------------------------------
    // Section 4 — Loyalty tier distribution
    // -------------------------------------------------------------------------
    private LoyaltyTierDist buildLoyaltyTierDist(Map<String, String> tierByCustomerId) {
        long total = tierByCustomerId.size();
        Map<String, Long> countByTier = tierByCustomerId.values().stream()
                .collect(Collectors.groupingBy(t -> t.toUpperCase(), Collectors.counting()));

        var tierConfigs = tierConfigRepository.findByActiveTrueOrderByRankOrderAsc();
        List<LoyaltyTierDist.TierBucket> buckets = new ArrayList<>();
        for (var config : tierConfigs) {
            long count = countByTier.getOrDefault(config.getTier().toUpperCase(), 0L);
            double pct = total > 0 ? (double) count / total * 100.0 : 0.0;
            buckets.add(new LoyaltyTierDist.TierBucket(config.getTier(), config.getDisplayName(), count, pct));
        }
        return new LoyaltyTierDist(buckets);
    }

    // -------------------------------------------------------------------------
    // Section 4 — Voucher statistics
    // -------------------------------------------------------------------------
    private VoucherStats buildVoucherStats() {
        long issued = userDiscountRepository.count();
        long redeemed = userDiscountRepository.countByStatus(UserDiscountStatus.USED);
        long expired = userDiscountRepository.countByStatus(UserDiscountStatus.EXPIRED);
        long revoked = userDiscountRepository.countByStatus(UserDiscountStatus.FORFEITED);
        return new VoucherStats(issued, redeemed, expired, revoked);
    }

    // -------------------------------------------------------------------------
    // Section 5 — Top services (via GROUP BY on BookingDetail)
    // -------------------------------------------------------------------------
    private TopServices buildTopServices() {
        List<Object[]> rows = bookingRepository.countGroupByRefIdAndItemType();
        long totalBookings = bookingRepository.count();

        // Collect package / combo IDs referenced
        List<UUID> packageIds = new ArrayList<>();
        List<UUID> comboIds = new ArrayList<>();
        for (Object[] row : rows) {
            UUID refId = (UUID) row[0];
            BookingItemType type = (BookingItemType) row[1];
            if (refId == null) continue;
            if (type == BookingItemType.PACKAGE) packageIds.add(refId);
            else if (type == BookingItemType.COMBO) comboIds.add(refId);
        }

        Map<UUID, String> names = new HashMap<>();
        if (!packageIds.isEmpty()) packageRepository.findAllById(packageIds).forEach(p -> names.put(p.getId(), p.getName()));
        if (!comboIds.isEmpty()) comboRepository.findAllById(comboIds).forEach(c -> names.put(c.getId(), c.getName()));

        // Aggregate by service name (multiple details may map to same package)
        Map<String, Long> countByName = new HashMap<>();
        for (Object[] row : rows) {
            UUID refId = (UUID) row[0];
            Long cnt = (Long) row[2];
            if (refId == null || cnt == null) continue;
            String name = names.getOrDefault(refId, "Unknown");
            countByName.merge(name, cnt, Long::sum);
        }

        List<TopServices.ServiceItem> items = countByName.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new TopServices.ServiceItem(
                        null, e.getKey(), e.getValue(),
                        totalBookings > 0 ? (double) e.getValue() / totalBookings * 100.0 : 0.0))
                .collect(Collectors.toList());
        return new TopServices(items);
    }

    // -------------------------------------------------------------------------
    // Section 5 — Customer insights (all SQL counts)
    // -------------------------------------------------------------------------
    private CustomerInsights buildCustomerInsights(Map<String, String> tierByCustomerId) {
        ZoneId zone = ZoneId.systemDefault();
        Instant monthStart = LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant();

        long newThisMonth = userRepository.countByRoleAndCreatedAtAfter(UserRole.CUSTOMER, monthStart);
        long returning = bookingRepository.countReturningCustomers();

        // VIP: count loyalty accounts with GOLD/PLATINUM/DIAMOND tier
        long vip = tierByCustomerId.values().stream()
                .filter(t -> t.contains("GOLD") || t.contains("PLATINUM") || t.contains("DIAMOND"))
                .count();

        long inactive = userRepository.countByRoleAndStatus(UserRole.CUSTOMER, UserStatus.INACTIVE);

        return new CustomerInsights(newThisMonth, returning, vip, inactive);
    }

    // -------------------------------------------------------------------------
    // Section 6 — No-show alerts (SQL GROUP BY, fetch only top 10)
    // -------------------------------------------------------------------------
    private List<NoShowAlert> buildNoShowAlerts(Map<String, String> tierByCustomerId) {
        List<Object[]> topRows = bookingRepository.findTopNoShowCustomers();
        return topRows.stream()
                .map(row -> {
                    UUID customerId = (UUID) row[0];
                    String fullName = (String) row[1];
                    String phone = (String) row[2];
                    Long count = (Long) row[3];
                    String tier = tierByCustomerId.getOrDefault(customerId.toString(), "BRONZE");
                    return new NoShowAlert(customerId.toString(), fullName, phone, count, tier);
                })
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Section 6 — Recent bookings (latest 10 via indexed query)
    // -------------------------------------------------------------------------
    private List<RecentBooking> buildRecentBookings(
            List<Booking> recentBookings, Map<UUID, String> serviceNameMap, Map<String, String> tierByCustomerId) {
        return recentBookings.stream()
                .map(b -> {
                    UUID sid = serviceId(b);
                    String serviceName = sid != null ? serviceNameMap.getOrDefault(sid, "Unknown") : "Unknown";
                    return new RecentBooking(
                            b.getId().toString(),
                            b.getCustomer().getFullName(),
                            serviceName,
                            b.getScheduledAt().toString(),
                            b.getStatus().name(),
                            tierByCustomerId.getOrDefault(b.getCustomer().getId().toString(), "BRONZE")
                    );
                })
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Review summary
    // -------------------------------------------------------------------------
    private ReviewSummary buildReviewSummary() {
        var stats = reviewService.getReviewStats();
        long positive = stats.ratingDistribution().getOrDefault(4, 0L)
                + stats.ratingDistribution().getOrDefault(5, 0L);
        double positiveRate = stats.totalReviews() > 0
                ? (double) positive / stats.totalReviews() * 100.0 : 0.0;
        return new ReviewSummary(
                stats.averageRating(),
                stats.totalReviews(),
                stats.ratingDistribution(),
                positive,
                positiveRate,
                stats.featuredReviewsCount()
        );
    }
}
