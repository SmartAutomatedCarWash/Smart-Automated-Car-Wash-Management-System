package com.autowash.shared.dto;

import java.util.List;

public record PaginatedResponse<T>(
        List<T> data,
        int totalPages,
        long totalElements
) {
}
