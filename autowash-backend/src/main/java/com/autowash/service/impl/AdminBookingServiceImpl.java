package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.dto.BookingDetailResponse;

import com.autowash.entity.Booking;
import com.autowash.repository.BookingRepository;
import com.autowash.service.AdminBookingService;
import com.autowash.service.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminBookingServiceImpl implements AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    public AdminBookingServiceImpl(
            BookingRepository bookingRepository,
            BookingService bookingService
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
    }

    @Transactional(readOnly = true)
    public BookingDetailResponse getAdminBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
        
        return bookingService.toDetailResponse(booking);
    }
}
