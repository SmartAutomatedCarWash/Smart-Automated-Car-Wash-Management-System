package com.autowash.service.impl;

import com.autowash.dto.AdminDashboardFullResponse;
import com.autowash.dto.AdminDashboardFullResponse.*;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.UserVoucherStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.repository.SlotHoldRepository;
import com.autowash.repository.TierConfigRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.UserVoucherRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.AdminDashboardFullService;
import com.autowash.service.ReviewService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminDashboardFullServiceImpl implements AdminDashboardFullService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final UserVoucherRepository userVoucherRepository;
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
            UserVoucherRepository userVoucherRepository,
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
        this.userVoucherRepository = userVoucherRepository;
        this.washSessionRepository = washSessionRepository;
        this.slotHoldRepository = slotHoldRepository;
        this.tierConfigRepository = tierConfigRepository;
        this.packageRepository = packageRepository;
        this.comboRepository = comboRepository;
        this.reviewService = reviewService;
    }

    @Override
    public AdminDashboardFullResponse getDashboardFull() {
        // Load bookings once and reuse across sections to reduce DB round-trips
        List<Booking> allBookings = bookingRepository.findAll();
        Map<UUID, String> serviceNameMap = buildServiceNameMap(allBookings);
        Map<String, String> tierByCustomerId = buildTierByCustomerIdMap();

        return new AdminDashboardFullResponse(
                buildKpis(allBookings),
                buildBookingTrend(allBookings),
                buildBookingStatusDist(allBookings),
                buildPeakHours(allBookings),
                buildRealTimeOps(),
                buildLoyaltyTierDist(tierByCustomerId),
                buildVoucherStats(),
                buildTopServices(allBookings, serviceNameMap),
                buildCustomerInsights(allBookings, tierByCustomerId),
                buildNoShowAlerts(allBookings, tierByCustomerId),
                buildRecentBookings(allBookings, serviceNameMap, tierByCustomerId),
                buildReviewSummary()
        );
    }

    // -------------------------------------------------------------------------
    // Helper: build service name map from packageId / comboId
    // -------------------------------------------------------------------------
    private Map<UUID, String> buildServiceNameMap(List<Booking> bookings) {
        List<UUID> packageIds = bookings.stream()
                .map(Booking::getPackageId).filter(Objects::nonNull).distinct().toList();
        List<UUID> comboIds = bookings.stream()
                .map(Booking::getComboId).filter(Objects::nonNull).distinct().toList();
        Map<UUID, String> names = new HashMap<>();
        packageRepository.findAllById(packageIds).forEach(p -> names.put(p.getId(), p.getName()));
        comboRepository.findAllById(comboIds).forEach(c -> names.put(c.getId(), c.getName()));
        return names;
    }

    // -------------------------------------------------------------------------
    // Helper: tier map by customerId string
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
        return b.getPackageId() != null ? b.getPackageId() : b.getComboId();
    }

    // -------------------------------------------------------------------------
    // Section 1 — KPIs
    // -------------------------------------------------------------------------
    private Kpis buildKpis(List<Booking> allBookings) {
        ZoneId zone = ZoneId.systemDefault();
        Instant todayStart = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant todayEnd = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant();
        Instant yesterdayStart = LocalDate.now(zone).minusDays(1).atStartOfDay(zone).toInstant();

        long todayBookings = allBookings.stream()
                .filter(b -> !b.getStatus().equals(BookingStatus.CANCELLED)
                        && !b.getStatus().equals(BookingStatus.NO_SHOW)
                        && b.getScheduledAt().isAfter(todayStart)
                        && b.getScheduledAt().isBefore(todayEnd))
                .count();

        long yesterdayBookings = allBookings.stream()
                .filter(b -> !b.getStatus().equals(BookingStatus.CANCELLED)
                        && !b.getStatus().equals(BookingStatus.NO_SHOW)
                        && b.getScheduledAt().isAfter(yesterdayStart)
                        && b.getScheduledAt().isBefore(todayStart))
                .count();

        long delta = todayBookings - yesterdayBookings;

        long completedToday = allBookings.stream()
                .filter(b -> b.getStatus().equals(BookingStatus.COMPLETED)
                        && b.getUpdatedAt().isAfter(todayStart))
                .count();

        long activeCustomers = userRepository
                .findByRoleAndStatusOrderByFullNameAsc(UserRole.CUSTOMER, UserStatus.ACTIVE).size();

        long totalBookings = allBookings.size();
        long noShows = allBookings.stream()
                .filter(b -> b.getStatus().equals(BookingStatus.NO_SHOW)).count();
        double noShowRate = totalBookings > 0 ? (double) noShows / totalBookings * 100.0 : 0.0;

        long loyaltyMembers = loyaltyAccountRepository.count();

        long totalVouchers = userVoucherRepository.count();
        long usedVouchers = userVoucherRepository.countByStatus(UserVoucherStatus.USED);
        double voucherRedemptionRate = totalVouchers > 0
                ? (double) usedVouchers / totalVouchers * 100.0 : 0.0;

        long totalRevenue = allBookings.stream()
                .filter(b -> b.getStatus().equals(BookingStatus.COMPLETED))
                .mapToLong(Booking::getFinalAmount).sum();

        return new Kpis(todayBookings, delta, completedToday, activeCustomers,
                noShowRate, loyaltyMembers, voucherRedemptionRate, totalRevenue);
    }

    // -------------------------------------------------------------------------
    // Section 2 — Booking trend (last 7 days)
    // -------------------------------------------------------------------------
    private BookingTrend buildBookingTrend(List<Booking> allBookings) {
        ZoneId zone = ZoneId.systemDefault();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/dd").withZone(zone);
        List<BookingTrend.TrendPoint> points = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now(zone).minusDays(i);
            Instant start = date.atStartOfDay(zone).toInstant();
            Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
            long count = allBookings.stream()
                    .filter(b -> b.getScheduledAt().isAfter(start) && b.getScheduledAt().isBefore(end))
                    .count();
            points.add(new BookingTrend.TrendPoint(fmt.format(start), count));
        }
        return new BookingTrend(points);
    }

    // -------------------------------------------------------------------------
    // Section 2 — Booking status distribution
    // -------------------------------------------------------------------------
    private BookingStatusDist buildBookingStatusDist(List<Booking> allBookings) {
        Map<BookingStatus, Long> byStatus = allBookings.stream()
                .collect(Collectors.groupingBy(Booking::getStatus, Collectors.counting()));
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
    // Section 3 — Peak hours (last 30 days, 08–20)
    // -------------------------------------------------------------------------
    private PeakHourData buildPeakHours(List<Booking> allBookings) {
        ZoneId zone = ZoneId.systemDefault();
        Instant from = LocalDate.now(zone).minusDays(30).atStartOfDay(zone).toInstant();
        List<Booking> recent = allBookings.stream()
                .filter(b -> b.getScheduledAt().isAfter(from))
                .toList();

        List<PeakHourData.HourSlot> slots = new ArrayList<>();
        for (int hour = 8; hour <= 20; hour++) {
            final int h = hour;
            long count = recent.stream()
                    .filter(b -> b.getScheduledAt().atZone(zone).getHour() == h)
                    .count();
            slots.add(new PeakHourData.HourSlot(String.format("%02d:00", h), count));
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
        long issued = userVoucherRepository.count();
        long redeemed = userVoucherRepository.countByStatus(UserVoucherStatus.USED);
        long expired = userVoucherRepository.countByStatus(UserVoucherStatus.EXPIRED);
        long revoked = userVoucherRepository.countByStatus(UserVoucherStatus.FORFEITED);
        return new VoucherStats(issued, redeemed, expired, revoked);
    }

    // -------------------------------------------------------------------------
    // Section 5 — Top services
    // -------------------------------------------------------------------------
    private TopServices buildTopServices(List<Booking> allBookings, Map<UUID, String> serviceNameMap) {
        long total = allBookings.size();
        Map<String, Long> countByName = allBookings.stream()
                .collect(Collectors.groupingBy(
                        b -> {
                            UUID sid = serviceId(b);
                            return sid != null ? serviceNameMap.getOrDefault(sid, "Unknown") : "Unknown";
                        },
                        Collectors.counting()
                ));

        List<TopServices.ServiceItem> items = countByName.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new TopServices.ServiceItem(
                        null, e.getKey(), e.getValue(),
                        total > 0 ? (double) e.getValue() / total * 100.0 : 0.0))
                .collect(Collectors.toList());
        return new TopServices(items);
    }

    // -------------------------------------------------------------------------
    // Section 5 — Customer insights
    // -------------------------------------------------------------------------
    private CustomerInsights buildCustomerInsights(List<Booking> allBookings, Map<String, String> tierByCustomerId) {
        ZoneId zone = ZoneId.systemDefault();
        Instant monthStart = LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant();

        long newThisMonth = userRepository.findByRoleOrderByFullNameAsc(UserRole.CUSTOMER).stream()
                .filter(u -> u.getCreatedAt().isAfter(monthStart))
                .count();

        // Returning: customers with >1 completed booking
        long returning = allBookings.stream()
                .filter(b -> b.getStatus().equals(BookingStatus.COMPLETED))
                .collect(Collectors.groupingBy(b -> b.getCustomer().getId(), Collectors.counting()))
                .values().stream().filter(cnt -> cnt > 1).count();

        // VIP: GOLD or higher
        long vip = tierByCustomerId.values().stream()
                .filter(t -> t.contains("GOLD") || t.contains("PLATINUM") || t.contains("DIAMOND"))
                .count();

        long inactive = userRepository
                .findByRoleAndStatusOrderByFullNameAsc(UserRole.CUSTOMER, UserStatus.INACTIVE).size();

        return new CustomerInsights(newThisMonth, returning, vip, inactive);
    }

    // -------------------------------------------------------------------------
    // Section 6 — No-show alerts
    // -------------------------------------------------------------------------
    private List<NoShowAlert> buildNoShowAlerts(List<Booking> allBookings, Map<String, String> tierByCustomerId) {
        Map<UUID, Long> noShowCount = allBookings.stream()
                .filter(b -> b.getStatus().equals(BookingStatus.NO_SHOW))
                .collect(Collectors.groupingBy(b -> b.getCustomer().getId(), Collectors.counting()));

        Map<UUID, Booking> lastNoShowByCustomer = new HashMap<>();
        for (Booking b : allBookings) {
            if (b.getStatus().equals(BookingStatus.NO_SHOW)) {
                lastNoShowByCustomer.merge(b.getCustomer().getId(), b,
                        (existing, newer) -> newer.getCreatedAt().isAfter(existing.getCreatedAt()) ? newer : existing);
            }
        }

        return noShowCount.entrySet().stream()
                .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Booking sample = lastNoShowByCustomer.get(e.getKey());
                    return new NoShowAlert(
                            e.getKey().toString(),
                            sample.getCustomer().getFullName(),
                            sample.getCustomer().getPhone(),
                            e.getValue(),
                            tierByCustomerId.getOrDefault(e.getKey().toString(), "BRONZE")
                    );
                })
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Section 6 — Recent bookings (latest 10)
    // -------------------------------------------------------------------------
    private List<RecentBooking> buildRecentBookings(
            List<Booking> allBookings, Map<UUID, String> serviceNameMap, Map<String, String> tierByCustomerId) {
        return allBookings.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(10)
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
