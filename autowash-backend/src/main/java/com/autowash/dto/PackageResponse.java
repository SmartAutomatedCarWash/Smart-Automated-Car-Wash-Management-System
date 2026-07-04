package com.autowash.dto;


import java.util.List;

public record PackageResponse(
        String packageId,
        String name,
        String description,
        long basePrice,
        int duration,
        String category,
        List<String> features,
        String image,
        String status,
        String popularity
) {
}

