package com.autowash.controller;

import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.PayBookingRequest;
import com.autowash.dto.PayBookingResponse;
import com.autowash.service.BookingService;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/v1/operations/bookings")
@Tag(name = "Operations")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
public class OperationsBookingController {

    private final OperationsService operationsService;
    private final BookingService bookingService;

    public OperationsBookingController(OperationsService operationsService, BookingService bookingService) {
        this.operationsService = operationsService;
        this.bookingService = bookingService;
    }

    @GetMapping("/eligible-sessions")
    @Operation(summary = "List confirmed bookings eligible for wash session creation")
    public ApiResponse<List<EligibleSessionBookingResponse>> listEligibleSessionBookings(
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.ok(
                "Eligible bookings retrieved",
                operationsService.listEligibleSessionBookings(limit)
        );
    }

    @PostMapping("/{bookingId}/pay")
    @Operation(summary = "Mark booking payment as paid")
    public ApiResponse<PayBookingResponse> markBookingPaid(
            @PathVariable String bookingId,
            @Valid @RequestBody(required = false) PayBookingRequest request
    ) {
        return ApiResponse.ok(
                "Booking payment completed",
                bookingService.markBookingPaidForOperations(bookingId, request == null ? null : request.transactionRef())
        );
    }
}
