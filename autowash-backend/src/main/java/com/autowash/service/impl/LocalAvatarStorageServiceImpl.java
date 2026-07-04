package com.autowash.service.impl;

import com.autowash.service.AvatarStorageService;
import com.autowash.shared.exception.ApiException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "autowash.storage.s3", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LocalAvatarStorageServiceImpl implements AvatarStorageService {

    private final String baseUrl;

    public LocalAvatarStorageServiceImpl(
            @Value("${autowash.upload.base-url:http://localhost:8080}") String baseUrl
    ) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @Override
    public AvatarUploadTarget createAvatarUpload(UUID userId, String fileName, String contentType) {
        validateContentType(contentType);

        String objectKey = buildObjectKey(userId, fileName, contentType);
        String uploadUrl = baseUrl + "/api/v1/users/profile/avatar/local-upload?objectKey=" + objectKey;
        String publicUrl = baseUrl + "/uploads/" + objectKey;

        return new AvatarUploadTarget(objectKey, uploadUrl, publicUrl);
    }

    @Override
    public String resolveAvatarUrl(UUID userId, String objectKey) {
        requireOwnedObjectKey(userId, objectKey);
        return baseUrl + "/uploads/" + objectKey;
    }

    private void validateContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar content type is required", "VALIDATION_ERROR");
        }
        String normalized = contentType.toLowerCase();
        if (!normalized.equals("image/jpeg") && !normalized.equals("image/png") && !normalized.equals("image/webp")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Avatar content type must be image/jpeg, image/png, or image/webp",
                    "VALIDATION_ERROR"
            );
        }
    }

    private String buildObjectKey(UUID userId, String fileName, String contentType) {
        String extension = extractExtension(fileName, contentType);
        return "avatars/%s/%s.%s".formatted(userId, UUID.randomUUID(), extension);
    }

    private String extractExtension(String fileName, String contentType) {
        if (fileName != null) {
            String normalized = fileName.trim();
            int lastDot = normalized.lastIndexOf('.');
            if (lastDot > -1 && lastDot < normalized.length() - 1) {
                String candidate = normalized.substring(lastDot + 1).toLowerCase();
                if (candidate.equals("jpg") || candidate.equals("jpeg") || candidate.equals("png") || candidate.equals("webp")) {
                    return "jpeg".equals(candidate) ? "jpg" : candidate;
                }
            }
        }

        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            default -> "webp";
        };
    }

    private void requireOwnedObjectKey(UUID userId, String objectKey) {
        String expectedPrefix = "avatars/%s/".formatted(userId);
        if (objectKey == null || objectKey.isBlank() || !objectKey.startsWith(expectedPrefix)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar object key is invalid", "VALIDATION_ERROR");
        }
    }
}
