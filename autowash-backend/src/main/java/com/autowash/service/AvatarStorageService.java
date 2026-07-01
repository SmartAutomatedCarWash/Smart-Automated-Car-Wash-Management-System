package com.autowash.service;

import java.util.UUID;

public interface AvatarStorageService {

    AvatarUploadTarget createAvatarUpload(UUID userId, String fileName, String contentType);

    String resolveAvatarUrl(UUID userId, String objectKey);

    record AvatarUploadTarget(
            String objectKey,
            String uploadUrl,
            String publicUrl
    ) {
    }
}
