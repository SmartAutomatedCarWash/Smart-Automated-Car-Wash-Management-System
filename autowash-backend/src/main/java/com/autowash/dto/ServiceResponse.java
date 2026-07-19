package com.autowash.dto;

import java.util.List;

public record ServiceResponse(
        String serviceId,
        String name,
        String description,
        long price,
        int duration,
        String status,
        List<String> imageUrls
) {
}
