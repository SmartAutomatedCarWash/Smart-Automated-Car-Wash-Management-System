package com.autowash.service;

import com.autowash.dto.BookingDetailResponse;


public interface AdminBookingService {
    BookingDetailResponse getAdminBookingDetail(String bookingId);
}
