package com.autowash.service;

import com.autowash.entity.User;
import com.autowash.entity.Booking;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffAssignmentService {
    Optional<User> tryPickStaffForBookingAssignment();

    User pickLeastLoadedActiveStaff();

    Optional<User> tryPickLeastLoadedActiveStaffForBooking(Booking booking);

    User pickLeastLoadedActiveStaffForBooking(Booking booking);

    List<User> rankAvailableStaffForBooking(Booking booking, int limit);

    boolean isStaffAvailableForBooking(User staff, Booking booking);

    User requireActiveStaff(UUID staffId);

    List<User> listActiveStaff();
}

