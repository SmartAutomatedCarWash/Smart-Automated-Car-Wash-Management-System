package com.autowash.controller;

import com.autowash.dto.AdminBookingResponse;
import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.UpdateBookingStatusRequest;
import com.autowash.dto.UpdateBookingStaffRequest;
import com.autowash.service.AdminReportingService;
import com.autowash.service.BookingService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin/bookings")
@Tag(name = "Admin Booking Management")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminBookingController {

    private final AdminReportingService adminReportingService;
    private final BookingService bookingService;

    public AdminBookingController(AdminReportingService adminReportingService, BookingService bookingService) {
        this.adminReportingService = adminReportingService;
        this.bookingService = bookingService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get summary statistics for bookings")
    public ApiResponse<com.autowash.dto.AdminBookingSummaryResponse> getBookingSummary() {
        return ApiResponse.ok("Booking summary retrieved", adminReportingService.getBookingSummary());
    }

    @GetMapping
    @Operation(summary = "List all bookings for admin with filters")
    public ApiResponse<List<AdminBookingResponse>> listBookings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) UUID packageId,
            @RequestParam(required = false) String searchQuery,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.BookingPage bookingPage =
                adminReportingService.listBookings(status, dateFrom, dateTo, customerId, packageId, searchQuery, page, limit);
        return ApiResponse.ok("Bookings retrieved", bookingPage.items(), bookingPage.pagination());
    }

    @GetMapping("/vehicles/{vehicleId}")
    @Operation(summary = "Get vehicle details and history for admin")
    public ApiResponse<com.autowash.dto.AdminVehicleDetailResponse> getVehicleDetail(@PathVariable String vehicleId) {
        return ApiResponse.ok("Vehicle details retrieved", adminReportingService.getVehicleDetail(vehicleId));
    }

    @GetMapping("/{bookingId}")
    @Operation(summary = "Get booking detail for admin")
    public ApiResponse<BookingDetailResponse> getBookingDetail(@PathVariable String bookingId) {
        return ApiResponse.ok("Booking retrieved", adminReportingService.getBookingDetail(bookingId));
    }

    @PostMapping("/{bookingId}/confirm")
    @Operation(summary = "Confirm a pending booking")
    public ApiResponse<BookingDetailResponse> confirmBooking(@PathVariable String bookingId) {
        return ApiResponse.ok("Booking confirmed", bookingService.confirmPendingBooking(bookingId));
    }

    @PatchMapping("/{bookingId}/status")
    @Operation(summary = "Update booking status for admin")
    public ApiResponse<BookingDetailResponse> updateBookingStatus(
            @PathVariable String bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request
    ) {
        return ApiResponse.ok("Booking status updated", bookingService.updateBookingStatus(bookingId, request.status()));
    }

    @PostMapping("/{bookingId}/staff")
    @Operation(summary = "Update assigned staff for a booking (Admin/Manager)")
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
