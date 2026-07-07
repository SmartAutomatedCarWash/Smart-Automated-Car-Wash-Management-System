package com.autowash.service.impl;

import com.autowash.dto.ReviewRequest;
import com.autowash.dto.ReviewResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.Review;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.LoyaltyService;
import com.autowash.service.ReviewService;
import com.autowash.shared.exception.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final CurrentUserService currentUserService;
    private final LoyaltyService loyaltyService;

    public ReviewServiceImpl(
            ReviewRepository reviewRepository,
            BookingRepository bookingRepository,
            CurrentUserService currentUserService,
            LoyaltyService loyaltyService
    ) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.currentUserService = currentUserService;
        this.loyaltyService = loyaltyService;
    }

    @Override
    @Transactional
    public ReviewResponse submitReview(ReviewRequest request) {
        User customer = currentUserService.getCurrentUser();
        Booking booking = bookingRepository.findByCustomerAndId(customer, parseUuid(request.bookingId(), "Booking not found"))
                .orElseThrow(() -> notFound("Booking not found"));
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw validationError("Only completed bookings can be reviewed");
        }
        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw validationError("Booking already has a review");
        }
        Review review = reviewRepository.save(new Review(
                customer,
                booking,
                request.rating(),
                request.comment(),
                request.beforeImageUrl(),
                request.afterImageUrl()
        ));
        loyaltyService.postBonusTransaction(customer.getId(), 10, "Review bonus");
        return toResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getFeaturedReviews() {
        return reviewRepository.findByFeaturedTrueOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> listAdminReviews() {
        return reviewRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ReviewResponse updateFeatured(String reviewId, boolean featured) {
        Review review = reviewRepository.findById(parseUuid(reviewId, "Review not found"))
                .orElseThrow(() -> notFound("Review not found"));
        review.updateFeatured(featured);
        return toResponse(review);
    }

    private UUID parseUuid(String id, String message) {
        try {
            return UUID.fromString(id);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, message, "RESOURCE_NOT_FOUND");
        }
    }

    private ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message, "RESOURCE_NOT_FOUND");
    }

    private ApiException validationError(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, "VALIDATION_ERROR");
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId().toString(),
                review.getCustomer().getId().toString(),
                review.getCustomer().getFullName(),
                review.getBooking().getId().toString(),
                review.getRating(),
                review.getComment(),
                review.getBeforeImageUrl(),
                review.getAfterImageUrl(),
                review.isFeatured(),
                review.getCreatedAt()
        );
    }
}
