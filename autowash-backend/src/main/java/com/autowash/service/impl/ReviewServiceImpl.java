package com.autowash.service.impl;

import com.autowash.service.LoyaltyService;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import org.springframework.stereotype.Service;

import com.autowash.dto.ReviewRequest;
import com.autowash.dto.ReviewResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.Review;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.ReviewService;
import com.autowash.dto.BookingReviewCheckResponse;
import com.autowash.dto.ReviewStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@Service
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
        loyaltyService.postBonusTransaction(customer.getId(), booking.getId(), 10, "Review bonus");
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
    @Transactional(readOnly = true)
    public Page<ReviewResponse> listAdminReviewsPaginated(Integer rating, Pageable pageable) {
        return reviewRepository.findAllFiltered(rating, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewStatsResponse getReviewStats() {
        List<Review> reviews = reviewRepository.findAll();
        long totalReviews = reviews.size();
        double averageRating = totalReviews == 0 ? 0.0 :
                reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);

        Map<Integer, Long> ratingDistribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            ratingDistribution.put(i, 0L);
        }
        for (Review r : reviews) {
            ratingDistribution.put(r.getRating(), ratingDistribution.getOrDefault(r.getRating(), 0L) + 1);
        }

        long featuredReviewsCount = reviewRepository.countByFeaturedTrue();

        return new ReviewStatsResponse(totalReviews, averageRating, ratingDistribution, featuredReviewsCount);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingReviewCheckResponse checkBookingReview(String bookingId) {
        UUID bid = parseUuid(bookingId, "Invalid Booking ID");
        Optional<Review> reviewOpt = reviewRepository.findByBookingId(bid);
        if (reviewOpt.isPresent()) {
            return new BookingReviewCheckResponse(true, toResponse(reviewOpt.get()));
        }
        return new BookingReviewCheckResponse(false, null);
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
            throw new ApiException(HttpStatus.NOT_FOUND, message, ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message, ErrorCode.RESOURCE_NOT_FOUND);
    }

    private ApiException validationError(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, ErrorCode.VALIDATION_ERROR);
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
