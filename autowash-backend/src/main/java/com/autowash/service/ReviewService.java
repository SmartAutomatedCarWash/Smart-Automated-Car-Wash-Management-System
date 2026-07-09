package com.autowash.service;

import com.autowash.dto.ReviewRequest;
import com.autowash.dto.ReviewResponse;
import com.autowash.dto.BookingReviewCheckResponse;
import com.autowash.dto.ReviewStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ReviewService {
    ReviewResponse submitReview(ReviewRequest request);
    List<ReviewResponse> getFeaturedReviews();
    List<ReviewResponse> listAdminReviews();
    Page<ReviewResponse> listAdminReviewsPaginated(Integer rating, Pageable pageable);
    ReviewResponse updateFeatured(String reviewId, boolean featured);
    ReviewStatsResponse getReviewStats();
    BookingReviewCheckResponse checkBookingReview(String bookingId);
}
