package com.autowash.dto;

public record BookingReviewCheckResponse(
        boolean hasReview,
        ReviewResponse reviewDetail
) {}
