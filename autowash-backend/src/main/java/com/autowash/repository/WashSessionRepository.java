package com.autowash.repository;

import com.autowash.entity.WashSession;

import com.autowash.entity.User;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.entity.Vehicle;
import java.time.Instant;
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

public interface WashSessionRepository extends JpaRepository<WashSession, UUID> {

    boolean existsByBooking_IdAndStatusIn(UUID bookingId, Collection<WashSessionStatus> statuses);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "assignedStaff"})
    Optional<WashSession> findWithBookingById(UUID id);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "assignedStaff"})
    Optional<WashSession> findByIdAndBookingCustomer(UUID id, User customer);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "assignedStaff"})
    Optional<WashSession> findFirstByBookingCustomerAndStatusInOrderByCreatedAtDesc(
            User customer,
            Collection<WashSessionStatus> statuses
    );

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle"})
    Page<WashSession> findByBookingCustomerAndStatusOrderByCompletedAtDesc(
            User customer,
            WashSessionStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle"})
    List<WashSession> findByBookingCustomerAndStatusOrderByCompletedAtDesc(
            User customer,
            WashSessionStatus status
    );

    @EntityGraph(attributePaths = {"booking", "assignedStaff"})
    Optional<WashSession> findFirstByBooking_IdOrderByCompletedAtDesc(UUID bookingId);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "assignedStaff"})
    List<WashSession> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "assignedStaff"})
    List<WashSession> findByAssignedStaffOrderByCreatedAtDesc(User assignedStaff);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "booking.details", "assignedStaff"})
    List<WashSession> findByAssignedStaffAndStatusOrderByCompletedAtDesc(User assignedStaff, WashSessionStatus status);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "booking.details", "assignedStaff"})
    List<WashSession> findByStatusOrderByCompletedAtDesc(WashSessionStatus status);

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle", "assignedStaff"})
    @Query("""
            select session from WashSession session
            where session.assignedStaff = :staff
              and session.booking.scheduledAt >= :dayStart
              and session.booking.scheduledAt < :dayEnd
            order by session.booking.scheduledAt asc
            """)
    List<WashSession> findByAssignedStaffAndBookingDate(
            @Param("staff") User staff,
            @Param("dayStart") Instant dayStart,
            @Param("dayEnd") Instant dayEnd
    );

    @EntityGraph(attributePaths = {"booking"})
    List<WashSession> findByAssignedStaffAndStatusIn(User assignedStaff, Collection<WashSessionStatus> statuses);

    long countByAssignedStaffAndStatus(User assignedStaff, WashSessionStatus status);

    long countByAssignedStaffAndStatusIn(User assignedStaff, Collection<WashSessionStatus> statuses);

    boolean existsByAssignedStaffAndStatusIn(User assignedStaff, Collection<WashSessionStatus> statuses);

    @Query("""
            select count(session) from WashSession session
            where session.assignedStaff = :assignedStaff
              and session.status = :status
              and session.completedAt >= :completedFrom
              and session.completedAt < :completedTo
            """)
    long countByAssignedStaffAndStatusAndCompletedAtBetween(
            @Param("assignedStaff") User assignedStaff,
            @Param("status") WashSessionStatus status,
            @Param("completedFrom") Instant completedFrom,
            @Param("completedTo") Instant completedTo
    );

    @EntityGraph(attributePaths = {"booking"})
    List<WashSession> findByBooking_IdIn(Collection<UUID> bookingIds);

    @Query(value = """
            select distinct on (booking_id)
                id as "id",
                booking_id as "bookingId",
                status as "status"
            from wash_sessions
            where booking_id in (:bookingIds)
            order by booking_id, coalesce(completed_at, created_at) desc, created_at desc, id desc
            """, nativeQuery = true)
    List<SessionSummary> findLatestSummariesByBookingIds(@Param("bookingIds") Collection<UUID> bookingIds);

    interface SessionSummary {
        UUID getId();
        UUID getBookingId();
        String getStatus();
    }

    @EntityGraph(attributePaths = {"booking"})
    List<WashSession> findByBooking_IdAndStatusIn(UUID bookingId, Collection<WashSessionStatus> statuses);

    long countByBookingCustomerAndStatus(User customer, WashSessionStatus status);

    long countByBookingVehicleAndStatus(Vehicle vehicle, WashSessionStatus status);

    @Query("""
            select max(session.completedAt) from WashSession session
            where session.booking.vehicle = :vehicle
              and session.status = :status
            """)
    Instant findLastCompletedAtByVehicle(
            @Param("vehicle") Vehicle vehicle,
            @Param("status") WashSessionStatus status
    );

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle"})
    @Query("""
            select session from WashSession session
            where session.booking.customer = :customer
              and session.status = :status
              and (cast(:dateFrom as timestamp) is null or session.completedAt >= :dateFrom)
              and (cast(:dateTo as timestamp) is null or session.completedAt <= :dateTo)
            """)
    Page<WashSession> searchCustomerCompletedSessions(
            @Param("customer") User customer,
            @Param("status") WashSessionStatus status,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"booking", "booking.customer", "booking.vehicle"})
    @Query("""
            select session from WashSession session
            where session.booking.customer = :customer
              and (cast(:dateFrom as timestamp) is null or session.createdAt >= :dateFrom)
              and (cast(:dateTo as timestamp) is null or session.createdAt <= :dateTo)
            """)
    Page<WashSession> searchCustomerSessions(
            @Param("customer") User customer,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable
    );

    long countByStatus(WashSessionStatus status);
}
