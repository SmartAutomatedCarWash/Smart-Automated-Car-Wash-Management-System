package com.autowash.dto;

public record ExtraServiceRecommendationResponse(
        String serviceId,
        String name,
        String description,
        long price,
        int duration,
        String reason,
        String source
) {
}
