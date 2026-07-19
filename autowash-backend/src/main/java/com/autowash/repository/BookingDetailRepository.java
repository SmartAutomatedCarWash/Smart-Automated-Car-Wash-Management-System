package com.autowash.repository;

import com.autowash.entity.BookingDetail;

import java.util.List;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingDetailRepository extends JpaRepository<BookingDetail, UUID> {
    List<BookingDetail> findByBookingId(UUID bookingId);

    List<BookingDetail> findByBooking_IdIn(Collection<UUID> bookingIds);
}
