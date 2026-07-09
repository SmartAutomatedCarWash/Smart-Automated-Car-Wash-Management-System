package com.autowash.controller;

import com.autowash.dto.ReviewRequest;
import com.autowash.dto.ReviewResponse;
import com.autowash.service.ReviewService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autowash.dto.BookingReviewCheckResponse;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@Validated
@RequestMapping("/api/v1/reviews")
@Tag(name = "Reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @Operation(summary = "Submit booking review")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ReviewResponse>> submitReview(@Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Review submitted", reviewService.submitReview(request)));
    }

    @GetMapping("/featured")
    @Operation(summary = "List featured public reviews")
    public ApiResponse<List<ReviewResponse>> getFeaturedReviews() {
        return ApiResponse.ok("Featured reviews retrieved", reviewService.getFeaturedReviews());
    }

    @GetMapping("/bookings/{bookingId}")
    @Operation(summary = "Check if a booking has a review and get its detail")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<BookingReviewCheckResponse> checkBookingReview(@PathVariable String bookingId) {
        return ApiResponse.ok("Booking review status retrieved", reviewService.checkBookingReview(bookingId));
    }
}
