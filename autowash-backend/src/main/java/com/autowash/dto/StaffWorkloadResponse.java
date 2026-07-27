package com.autowash.dto;

import java.util.List;

public record StaffWorkloadResponse(
        List<StaffWorkloadItemResponse> data,
        int totalPages,
        long totalElements
) {
}
