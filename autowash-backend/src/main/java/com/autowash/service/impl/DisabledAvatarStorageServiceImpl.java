package com.autowash.service.impl;

import com.autowash.service.AvatarStorageService;
import com.autowash.shared.exception.ApiException;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "autowash.storage.s3", name = "enabled", havingValue = "false", matchIfMissing = true)
public class DisabledAvatarStorageServiceImpl implements AvatarStorageService {

    @Override
    public AvatarUploadTarget createAvatarUpload(UUID userId, String fileName, String contentType) {
        throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Avatar uploads are not configured",
                "AVATAR_UPLOAD_DISABLED"
        );
    }

    @Override
    public String resolveAvatarUrl(UUID userId, String objectKey) {
        throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Avatar uploads are not configured",
                "AVATAR_UPLOAD_DISABLED"
        );
    }
}
