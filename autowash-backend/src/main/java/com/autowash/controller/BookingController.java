package com.autowash.controller;

import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.CancelBookingRequest;
import com.autowash.dto.CancelBookingResponse;
import com.autowash.dto.ChangeBookingPaymentMethodRequest;
import com.autowash.dto.BookingStaffOptionResponse;
import com.autowash.dto.BookingStaffOptionsRequest;
import com.autowash.dto.CreateBookingRequest;
import com.autowash.dto.CreateBookingResponse;
import com.autowash.dto.DiscountValidationRequest;
import com.autowash.dto.DiscountValidationResponse;
import com.autowash.dto.PayBookingRequest;
import com.autowash.dto.PayBookingResponse;
import com.autowash.dto.UpdateBookingStaffRequest;
import com.autowash.service.BookingService;
import com.autowash.service.BookingStaffRecommendationService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/customers/bookings")
@Tag(name = "Bookings")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('CUSTOMER')")
public class BookingController {

    private final BookingService bookingService;
    private final BookingStaffRecommendationService bookingStaffRecommendationService;

    public BookingController(
            BookingService bookingService,
            BookingStaffRecommendationService bookingStaffRecommendationService
    ) {
        this.bookingService = bookingService;
        this.bookingStaffRecommendationService = bookingStaffRecommendationService;
    }

    @PostMapping
    @Operation(summary = "Create new booking")
    public ResponseEntity<ApiResponse<CreateBookingResponse>> createBooking(
            @Valid @RequestBody CreateBookingRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Booking created.", bookingService.createBooking(request, null)));
    }

    @PostMapping("/staff-options")
    @Operation(summary = "Recommend staff for a booking draft")
    public ApiResponse<List<BookingStaffOptionResponse>> recommendStaffOptions(
            @Valid @RequestBody BookingStaffOptionsRequest request
    ) {
        return ApiResponse.ok(
                "Booking staff options retrieved",
                bookingStaffRecommendationService.recommendStaffOptions(request)
        );
    }

    @PostMapping("/validate-voucher")
    @Operation(summary = "Validate booking voucher before checkout")
    public ApiResponse<DiscountValidationResponse> validateVoucher(
            @Valid @RequestBody DiscountValidationRequest request
    ) {
        return ApiResponse.ok("Voucher validated", bookingService.validateDiscount(request));
    }

    @GetMapping
    @Operation(summary = "List customer's bookings")
    public ApiResponse<List<BookingListItemResponse>> listBookings(
            @RequestParam(required = false)
            @Pattern(regexp = "^(PENDING|CONFIRMED|CANCELLED|CHECKED_IN|IN_PROGRESS|COMPLETED)$", message = "Status must be a valid booking status")
            String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        BookingService.BookingPage bookingPage = bookingService.listBookings(status, dateFrom, dateTo, page, limit);
        return ApiResponse.ok("Bookings retrieved", bookingPage.items(), bookingPage.pagination());
    }

    @GetMapping("/{bookingId}")
    @Operation(summary = "Get booking details")
    public ApiResponse<BookingDetailResponse> getBooking(@PathVariable String bookingId) {
        return ApiResponse.ok("Booking retrieved", bookingService.getBooking(bookingId));
    }

    @PostMapping("/{bookingId}/cancel")
    @Operation(summary = "Cancel booking")
    public ApiResponse<CancelBookingResponse> cancelBooking(
            @PathVariable String bookingId,
            @RequestBody(required = false) CancelBookingRequest request
    ) {
        return ApiResponse.ok(
                "Booking cancelled successfully",
                bookingService.cancelBooking(bookingId, request == null ? null : request.reason())
        );
    }

    @PostMapping("/{bookingId}/pay")
    @PreAuthorize("denyAll()")
    @Operation(summary = "Mark booking payment as paid")
    public ApiResponse<PayBookingResponse> payBooking(
            @PathVariable String bookingId,
            @Valid @RequestBody(required = false) PayBookingRequest request
    ) {
        return ApiResponse.ok(
                "Booking payment completed",
                bookingService.payBooking(bookingId, request == null ? null : request.transactionRef())
        );
    }

    @PostMapping("/{bookingId}/payment-method")
    @Operation(summary = "Change payment method for a pending booking")
    public ApiResponse<PayBookingResponse> changePaymentMethod(
            @PathVariable String bookingId,
            @Valid @RequestBody ChangeBookingPaymentMethodRequest request
    ) {
        return ApiResponse.ok(
                "Booking payment method updated",
                bookingService.changeBookingPaymentMethod(bookingId, request.paymentMethod())
        );
    }

    @PostMapping("/{bookingId}/staff")
    @Operation(summary = "Update assigned staff for a booking")
    public ApiResponse<BookingDetailResponse> updateBookingStaff(
            @PathVariable String bookingId,
            @Valid @RequestBody UpdateBookingStaffRequest request
    ) {
        return ApiResponse.ok(
                "Booking staff updated",
                bookingService.updateBookingStaff(bookingId, request.staffIds())
        );
    }

}
