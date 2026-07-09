package com.autowash.dto;

import java.util.Map;

public record ReviewStatsResponse(
        long totalReviews,
        double averageRating,
        Map<Integer, Long> ratingDistribution,
        long featuredReviewsCount
) {}
