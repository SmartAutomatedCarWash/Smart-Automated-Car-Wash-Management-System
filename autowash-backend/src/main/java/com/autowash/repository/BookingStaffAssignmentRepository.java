package com.autowash.repository;

import com.autowash.entity.Booking;
import com.autowash.entity.BookingStaffAssignment;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingStaffAssignmentRepository extends JpaRepository<BookingStaffAssignment, UUID> {

    @EntityGraph(attributePaths = {"staff"})
    List<BookingStaffAssignment> findByBookingOrderBySortOrderAsc(Booking booking);

    void deleteByBooking(Booking booking);

    long countByStaffAndBooking_StatusIn(User staff, Collection<BookingStatus> statuses);

    @EntityGraph(attributePaths = {"booking", "booking.details"})
    List<BookingStaffAssignment> findByStaffAndBooking_StatusIn(User staff, Collection<BookingStatus> statuses);
}
