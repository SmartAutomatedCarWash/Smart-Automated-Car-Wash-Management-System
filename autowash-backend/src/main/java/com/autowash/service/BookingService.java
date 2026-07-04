package com.autowash.service;



import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.CancelBookingResponse;
import com.autowash.dto.CreateBookingRequest;
import com.autowash.dto.CreateBookingResponse;
import com.autowash.dto.PayBookingResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.shared.dto.PaginationMeta;
import java.time.LocalDate;
import java.util.List;

public interface BookingService {
    CreateBookingResponse createBooking(CreateBookingRequest request, Object metadata);
    BookingPage listBookings(String status, LocalDate dateFrom, LocalDate dateTo, int page, int limit);
    BookingDetailResponse getBooking(String bookingId);
    CancelBookingResponse cancelBooking(String bookingId, String reason);

    PayBookingResponse payBooking(String bookingId, String transactionRef);
    Booking requireBookingForOperations(String bookingId);
    void updateStatus(Booking booking, BookingStatus status);
    BookingDetailResponse toDetailResponse(Booking booking);

    record BookingPage(List<BookingListItemResponse> items, PaginationMeta pagination) {}
}


