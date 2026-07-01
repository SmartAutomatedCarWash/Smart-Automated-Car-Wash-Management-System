package com.autowash.dto;

public record CreateAvatarUploadUrlResponse(
        String objectKey,
        String uploadUrl,
        String publicUrl
) {
}
