package com.autowash.controller;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/profile/avatar")
public class AvatarUploadController {

    private final Path uploadRoot;

    public AvatarUploadController(@Value("${autowash.upload.dir:uploads}") String uploadDir) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @PutMapping("/local-upload")
    public ApiResponse<Void> uploadAvatar(
            @RequestParam("objectKey") String objectKey,
            HttpServletRequest request
    ) {
        Path target = resolveTarget(objectKey);
        try {
            Files.createDirectories(target.getParent());
            try (InputStream inputStream = request.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store avatar", ErrorCode.UPLOAD_FAILED);
        }
        return ApiResponse.ok("Avatar uploaded", null);
    }

    private Path resolveTarget(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar object key is required", ErrorCode.VALIDATION_ERROR);
        }
        Path target = uploadRoot.resolve(objectKey).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar object key is invalid", ErrorCode.VALIDATION_ERROR);
        }
        return target;
    }
}
