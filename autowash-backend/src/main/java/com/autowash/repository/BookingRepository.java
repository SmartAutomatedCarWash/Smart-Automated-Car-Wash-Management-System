package com.autowash.repository;

import com.autowash.entity.Vehicle;

import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.WashSessionStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    @Override
    @EntityGraph(attributePaths = {"customer", "pricing", "details"})
    List<Booking> findAll();

    @Query("SELECT bd.refId FROM BookingDetail bd JOIN bd.booking b WHERE bd.itemType = 'PACKAGE' AND b.status IN ('COMPLETED', 'CONFIRMED') GROUP BY bd.refId ORDER BY COUNT(bd.id) DESC LIMIT 1")
    Optional<UUID> findTopPackageId();

    long countByCustomerAndStatusIn(User customer, Collection<BookingStatus> statuses);

    long countByAssignedStaffAndStatusIn(User assignedStaff, Collection<BookingStatus> statuses);

    @EntityGraph(attributePaths = {"details"})
    List<Booking> findByAssignedStaffAndStatusIn(User assignedStaff, Collection<BookingStatus> statuses);

    long countByAssignedStaffAndStatus(User assignedStaff, BookingStatus status);

    @Query("select coalesce(sum(booking.pricing.finalAmount), 0) from Booking booking where booking.assignedStaff = :staff and booking.status = :status")
    long sumFinalAmountByAssignedStaffAndStatus(@Param("staff") User staff, @Param("status") BookingStatus status);

    @Query("""
            select coalesce(sum(b.pricing.finalAmount), 0) from Booking b
            where b.assignedStaff = :staff
              and b.status = 'COMPLETED'
              and b.updatedAt >= :from
              and b.updatedAt < :to
            """)
    long sumCompletedRevenueByAssignedStaffAndRange(
            @Param("staff") User staff,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @EntityGraph(attributePaths = {"customer", "vehicle", "pricing", "details", "assignedStaff"})
    Optional<Booking> findByCustomerAndId(User customer, UUID id);

    default Optional<Booking> findByCustomerAndId(User customer, String id) {
        return parseUuid(id).flatMap(value -> findByCustomerAndId(customer, value));
    }

    default Optional<Booking> findById(String id) {
        return parseUuid(id).flatMap(this::findById);
    }

    @EntityGraph(attributePaths = {"details", "pricing"})
    List<Booking> findByVehicleIdOrderByScheduledAtDesc(UUID vehicleId);

    @EntityGraph(attributePaths = {"vehicle", "pricing"})
    Page<Booking> findByCustomerOrderByCreatedAtDesc(User customer, Pageable pageable);

    @EntityGraph(attributePaths = {"vehicle", "pricing"})
    Page<Booking> findByCustomerAndStatusOrderByCreatedAtDesc(User customer, BookingStatus status, Pageable pageable);

    @Query("select booking from Booking booking where booking.customer = :customer and booking.pricing.discountRefId is not null order by booking.createdAt desc")
    Page<Booking> findByCustomerAndPricingDiscountRefIdNotNull(@Param("customer") User customer, Pageable pageable);

    @EntityGraph(attributePaths = {"vehicle", "pricing"})
    Page<Booking> findByCustomerAndScheduledAtBetweenOrderByCreatedAtDesc(
            User customer,
            Instant scheduledFrom,
            Instant scheduledTo,
            Pageable pageable
    );

    default Page<Booking> findByCustomerAndBookingDateBetweenOrderByCreatedAtDesc(
            User customer,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable
    ) {
        ZoneId zone = ZoneId.systemDefault();
        Instant scheduledFrom = dateFrom.atStartOfDay(zone).toInstant();
        Instant scheduledTo = dateTo.plusDays(1).atStartOfDay(zone).minusNanos(1).toInstant();
        return findByCustomerAndScheduledAtBetweenOrderByCreatedAtDesc(customer, scheduledFrom, scheduledTo, pageable);
    }

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff", "details", "pricing"})
    @Query("""
            select booking from Booking booking
            where (:#{#statusFilter == false} = true or booking.status in :statuses)
              and (:#{#customerId == null} = true or booking.customer.id = :customerId)
              and (:#{#dateFrom == null} = true or booking.scheduledAt >= :dateFrom)
              and (:#{#dateTo == null} = true or booking.scheduledAt <= :dateTo)
              and (
                    :#{#searchLike == null} = true
                    or lower(str(booking.id)) like :searchLike
                    or lower(booking.customer.fullName) like :searchLike
                    or lower(booking.customer.phone) like :searchLike
                    or lower(booking.vehicle.plate) like :searchLike
              )
            """)
    Page<Booking> searchAdmin(
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("statusFilter") boolean statusFilter,
            @Param("customerId") UUID customerId,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("searchLike") String searchLike,
            Pageable pageable
    );

    default Page<Booking> searchAdmin(
            Collection<BookingStatus> statuses,
            boolean statusFilter,
            UUID customerId,
            LocalDate dateFrom,
            LocalDate dateTo,
            String searchLike,
            Pageable pageable
    ) {
        return searchAdmin(
                statuses,
                statusFilter,
                customerId,
                startOfDay(dateFrom),
                endOfDay(dateTo),
                searchLike,
                pageable
        );
    }

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff"})
    @Query("""
            select booking from Booking booking
            where booking.assignedStaff = :staff
              and (:#{#statusFilter == false} = true or booking.status in :statuses)
              and (:#{#dateFrom == null} = true or booking.scheduledAt >= :dateFrom)
              and (:#{#dateTo == null} = true or booking.scheduledAt <= :dateTo)
            """)
    Page<Booking> searchAssignedStaffBookings(
            @Param("staff") User staff,
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("statusFilter") boolean statusFilter,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable
    );

    default Page<Booking> searchAssignedStaffBookings(
            User staff,
            Collection<BookingStatus> statuses,
            boolean statusFilter,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable
    ) {
        return searchAssignedStaffBookings(staff, statuses, statusFilter, startOfDay(dateFrom), endOfDay(dateTo), pageable);
    }

    @Query("select count(booking) from Booking booking where booking.customer = :customer")
    long countByCustomer(@Param("customer") User customer);

    @Query("""
            select count(booking) from Booking booking
            where booking.scheduledAt >= :slotStart
              and booking.scheduledAt < :slotEnd
              and booking.status not in :excludedStatuses
            """)
    long countByScheduledAtSlot(
            @Param("slotStart") Instant slotStart,
            @Param("slotEnd") Instant slotEnd,
            @Param("excludedStatuses") Collection<BookingStatus> excludedStatuses
    );

    @Query("""
            select count(booking) from Booking booking
            where booking.vehicle = :vehicle
              and booking.scheduledAt = :scheduledAt
              and booking.status in :statuses
            """)
    long countDuplicateVehicleSlot(
            @Param("vehicle") Vehicle vehicle,
            @Param("scheduledAt") Instant scheduledAt,
            @Param("statuses") Collection<BookingStatus> statuses
    );

    @Query("select count(b) > 0 from Booking b where b.customer = :customer and b.pricing.discountRefId = :voucherId")
    boolean existsByCustomerAndPricingDiscountRefId(@Param("customer") User customer, @Param("voucherId") UUID voucherId);

    @Query("select count(booking) from Booking booking where booking.customer = :customer and booking.status = :status")
    long countByCustomerAndStatus(@Param("customer") User customer, @Param("status") BookingStatus status);

    @Query("select coalesce(sum(booking.pricing.finalAmount), 0) from Booking booking where booking.customer = :customer and booking.status = :status")
    long sumFinalAmountByCustomerAndStatus(@Param("customer") User customer, @Param("status") BookingStatus status);

    Optional<Booking> findFirstByCustomerOrderByCreatedAtDesc(User customer);

    long countByStatus(BookingStatus status);

    @Query("select coalesce(sum(b.pricing.finalAmount), 0) from Booking b where b.status = :status")
    long sumFinalAmountByStatus(@Param("status") BookingStatus status);

    // ---- Dashboard aggregate queries (avoid findAll) ----

    @Query("select count(b) from Booking b where b.status not in :excludedStatuses and b.scheduledAt >= :from and b.scheduledAt < :to")
    long countByScheduledAtBetweenAndStatusNotIn(@Param("from") Instant from, @Param("to") Instant to, @Param("excludedStatuses") Collection<BookingStatus> excludedStatuses);

    @Query("select count(b) from Booking b where b.status = :status and b.updatedAt >= :from")
    long countByStatusAndUpdatedAtAfter(@Param("status") BookingStatus status, @Param("from") Instant from);

    @Query("select count(b) from Booking b where b.status = :status")
    long countByStatusEnum(@Param("status") BookingStatus status);

    @Query("select coalesce(sum(b.pricing.finalAmount), 0) from Booking b where b.status = 'COMPLETED'")
    long sumTotalRevenue();

    @Query("select count(b) from Booking b join b.details d where b.status = 'COMPLETED' and d.itemType = 'COMBO'")
    long countCompletedComboBookings();

    // Booking trend: count per day
    @Query("select count(b) from Booking b where b.scheduledAt >= :from and b.scheduledAt < :to")
    long countByScheduledAtBetween(@Param("from") Instant from, @Param("to") Instant to);

    // Status distribution in one shot
    @Query("select b.status, count(b) from Booking b group by b.status")
    List<Object[]> countGroupByStatus();

    // Peak hour: count bookings per hour bucket
    @Query("select count(b) from Booking b where b.scheduledAt >= :from")
    long countByScheduledAtAfter(@Param("from") Instant from);

    // No-show alerts: top customers by no-show count
    @Query(value = """
            select b.customer_id, u.full_name, u.phone, count(b.id)
            from bookings b
            join users u on u.id = b.customer_id
            where b.status = 'NO_SHOW'
            group by b.customer_id, u.full_name, u.phone
            order by count(b.id) desc
            limit 10
            """, nativeQuery = true)
    List<Object[]> findTopNoShowCustomers();

    // Last no-show date per customer
    @Query("""
            select b.customer.id, max(b.createdAt)
            from Booking b
            where b.status = 'NO_SHOW'
            group by b.customer.id
            """)
    List<Object[]> findLastNoShowDateByCustomer();

    // Recent bookings: last 10
    @EntityGraph(attributePaths = {"customer", "pricing", "details"})
    @Query("select b from Booking b order by b.createdAt desc")
    List<Booking> findTop10ByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    // Returning customers: customers with >1 completed booking
    @Query(value = """
            select count(*) from (
              select customer_id
              from bookings
              where status = 'COMPLETED'
              group by customer_id
              having count(*) > 1
            ) as sub
            """, nativeQuery = true)
    long countReturningCustomers();

    // Top services: count by packageId or comboId
    @Query("""
            select bd.refId, bd.itemType, count(bd)
            from BookingDetail bd
            group by bd.refId, bd.itemType
            order by count(bd) desc
            """)
    List<Object[]> countGroupByRefIdAndItemType();

    // Peak hours data (bookings in last 30 days)
    @Query("select b.scheduledAt from Booking b where b.scheduledAt >= :from")
    List<Instant> findScheduledAtAfter(@Param("from") Instant from);

    List<Booking> findByScheduledAtBetweenAndStatusIn(Instant from, Instant to, Collection<BookingStatus> statuses);

    @Query("SELECT b FROM Booking b WHERE b.scheduledAt BETWEEN :from AND :to AND b.status IN :statuses AND b.reminderSent = false")
    List<Booking> findByScheduledAtBetweenAndStatusInAndReminderSentFalse(Instant from, Instant to, Collection<BookingStatus> statuses);

    @EntityGraph(attributePaths = {"customer"})
    @Query("""
            select booking from Booking booking
            where booking.status in :statuses
              and booking.scheduledAt <= :cutoff
              and not exists (
                    select session.id from WashSession session
                    where session.booking = booking
                      and session.status in :checkedInStatuses
              )
            """)
    List<Booking> findNoShowCandidates(
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("cutoff") Instant cutoff,
            @Param("checkedInStatuses") Collection<WashSessionStatus> checkedInStatuses
    );

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff", "details", "pricing"})
    @Query("""
            select booking from Booking booking
            left join LoyaltyAccount la on la.customer = booking.customer
            left join TierConfig tc on tc.tier = la.tier
            where booking.status in :statuses
              and not exists (
                    select session.id from WashSession session
                    where session.booking = booking
                      and session.status in :activeStatuses
              )
            order by tc.priorityScore desc, booking.scheduledAt asc, booking.createdAt desc
            """)
    List<Booking> findEligibleForOperationsSession(
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("activeStatuses") Collection<WashSessionStatus> activeStatuses,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff", "details", "pricing"})
    @Query("""
            select booking from Booking booking
            left join LoyaltyAccount la on la.customer = booking.customer
            left join TierConfig tc on tc.tier = la.tier
            where booking.status in :statuses
              and (booking.assignedStaff = :staff or booking.assignedStaff is null)
              and not exists (
                    select activeSession.id from WashSession activeSession
                    where activeSession.booking = booking
                      and activeSession.status in :activeStatuses
              )
            order by tc.priorityScore desc, booking.scheduledAt asc, booking.createdAt desc
            """)
    List<Booking> findEligibleForAssignedStaffOperationsSession(
            @Param("staff") User staff,
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("activeStatuses") Collection<WashSessionStatus> activeStatuses,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff", "details"})
    @Query("""
            select booking from Booking booking
            where booking.assignedStaff = :staff
              and booking.scheduledAt >= :dayStart
              and booking.scheduledAt < :dayEnd
            order by booking.scheduledAt asc
            """)
    List<Booking> findTodayBookingsByAssignedStaff(
            @Param("staff") User staff,
            @Param("dayStart") Instant dayStart,
            @Param("dayEnd") Instant dayEnd
    );

    private static Optional<UUID> parseUuid(String id) {
        try {
            return id == null || id.isBlank() ? Optional.empty() : Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private static Instant startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private static Instant endOfDay(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).minusNanos(1).toInstant();
    }

    long countByUpdatedAtAfterAndStatus(Instant after, BookingStatus status);

    @Query("SELECT b.scheduledAt FROM Booking b WHERE b.scheduledAt >= :from")
    List<Instant> findScheduledAtByScheduledAtAfter(@Param("from") Instant from);

    @Query("SELECT bd.refId, COUNT(bd.id) FROM BookingDetail bd WHERE bd.booking.status != 'CANCELLED' GROUP BY bd.refId ORDER BY COUNT(bd.id) DESC")
    List<Object[]> findTopServiceIds(Pageable pageable);

    @Query("SELECT COUNT(b.id) FROM Booking b WHERE b.status = 'COMPLETED' GROUP BY b.customer.id HAVING COUNT(b.id) > 1")
    List<Long> findReturningCustomerCounts();

    @Query("SELECT b.customer.id, COUNT(b.id) FROM Booking b WHERE b.status = 'NO_SHOW' GROUP BY b.customer.id ORDER BY COUNT(b.id) DESC")
    List<Object[]> findTopNoShowCustomers(Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff"})
    List<Booking> findTop10ByOrderByCreatedAtDesc();
}
