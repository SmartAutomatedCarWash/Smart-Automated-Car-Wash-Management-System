package com.autowash.repository;

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

    long countByCustomerAndStatusIn(User customer, Collection<BookingStatus> statuses);

    long countByAssignedStaffAndStatusIn(User assignedStaff, Collection<BookingStatus> statuses);

    long countByAssignedStaffAndStatus(User assignedStaff, BookingStatus status);

    @Query("select coalesce(sum(booking.finalAmount), 0) from Booking booking where booking.assignedStaff = :staff and booking.status = :status")
    long sumFinalAmountByAssignedStaffAndStatus(@Param("staff") User staff, @Param("status") BookingStatus status);

    @Query("""
            select coalesce(sum(b.finalAmount), 0) from Booking b
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

    @EntityGraph(attributePaths = {"vehicle"})
    Optional<Booking> findByCustomerAndId(User customer, UUID id);

    default Optional<Booking> findByCustomerAndId(User customer, String id) {
        return parseUuid(id).flatMap(value -> findByCustomerAndId(customer, value));
    }

    default Optional<Booking> findById(String id) {
        return parseUuid(id).flatMap(this::findById);
    }

    @EntityGraph(attributePaths = {"vehicle"})
    Page<Booking> findByCustomerOrderByCreatedAtDesc(User customer, Pageable pageable);

    @EntityGraph(attributePaths = {"vehicle"})
    Page<Booking> findByCustomerAndStatusOrderByCreatedAtDesc(User customer, BookingStatus status, Pageable pageable);

    @Query("select booking from Booking booking where booking.customer = :customer and booking.voucherId is not null order by booking.createdAt desc")
    Page<Booking> findByCustomerAndVoucherIdNotNull(@Param("customer") User customer, Pageable pageable);

    @EntityGraph(attributePaths = {"vehicle"})
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

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff"})
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
            @Param("vehicle") com.autowash.entity.Vehicle vehicle,
            @Param("scheduledAt") Instant scheduledAt,
            @Param("statuses") Collection<BookingStatus> statuses
    );

    boolean existsByCustomerAndVoucherId(User customer, UUID voucherId);

    @Query("select count(booking) from Booking booking where booking.customer = :customer and booking.status = :status")
    long countByCustomerAndStatus(@Param("customer") User customer, @Param("status") BookingStatus status);

    @Query("select coalesce(sum(booking.finalAmount), 0) from Booking booking where booking.customer = :customer and booking.status = :status")
    long sumFinalAmountByCustomerAndStatus(@Param("customer") User customer, @Param("status") BookingStatus status);

    Optional<Booking> findFirstByCustomerOrderByCreatedAtDesc(User customer);

    long countByStatus(BookingStatus status);

    @Query("select coalesce(sum(b.finalAmount), 0) from Booking b where b.status = :status")
    long sumFinalAmountByStatus(@Param("status") BookingStatus status);

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

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff"})
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

    @EntityGraph(attributePaths = {"customer", "vehicle", "assignedStaff"})
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
}
