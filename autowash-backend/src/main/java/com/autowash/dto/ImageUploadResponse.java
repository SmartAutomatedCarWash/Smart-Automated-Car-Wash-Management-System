package com.autowash.dto;

public record ImageUploadResponse(
        String url,
        String fileName,
        long size
) {
}
