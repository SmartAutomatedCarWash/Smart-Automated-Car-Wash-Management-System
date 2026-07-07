package com.autowash.dto;

public record ServiceResponse(
        String serviceId,
        String name,
        String description,
        long price,
        int duration,
        String status,
        java.util.List<String> imageUrls
) {
}
