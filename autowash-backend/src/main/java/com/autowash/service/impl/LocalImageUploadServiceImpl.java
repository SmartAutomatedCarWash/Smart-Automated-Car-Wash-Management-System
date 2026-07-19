package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import java.util.Locale;

import java.util.UUID;

import java.util.Map;


import com.autowash.dto.ImageUploadResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import com.autowash.service.ImageUploadService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Service
@ConditionalOnProperty(prefix = "autowash.storage.s3", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LocalImageUploadServiceImpl implements ImageUploadService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE
    );

    private final Path uploadRoot;
    private final long maxSizeBytes;

    public LocalImageUploadServiceImpl(
            @Value("${autowash.upload.dir:uploads}") String uploadDir,
            @Value("${autowash.upload.max-image-size-bytes:5242880}") long maxSizeBytes
    ) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxSizeBytes = maxSizeBytes;
    }

    @Override
    public ImageUploadResponse store(MultipartFile file, String folder, HttpServletRequest request) {
        if (file == null || file.isEmpty()) {
            throw validationError("file", "Image file is required");
        }
        if (file.getSize() > maxSizeBytes) {
            throw validationError("file", "Image file is too large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw validationError("file", "Only JPG, PNG, WEBP, or GIF images are allowed");
        }

        String safeFolder = normalizeFolder(folder);
        String fileName = UUID.randomUUID() + extensionFor(contentType);
        Path targetDir = uploadRoot.resolve(safeFolder).normalize();
        Path target = targetDir.resolve(fileName).normalize();
        if (!target.startsWith(targetDir)) {
            throw validationError("file", "Invalid file name");
        }

        try {
            Files.createDirectories(targetDir);
            file.transferTo(target);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store image", ErrorCode.UPLOAD_FAILED);
        }

        String url = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/uploads/" + safeFolder + "/" + fileName)
                .replaceQuery(null)
                .build()
                .toUriString();

        return new ImageUploadResponse(url, fileName, file.getSize());
    }

    private String normalizeFolder(String folder) {
        String normalized = folder == null ? "" : folder.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("[a-z0-9_-]+")) {
            throw validationError("folder", "Invalid upload folder");
        }
        return normalized;
    }

    private String extensionFor(String contentType) {
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (MediaType.IMAGE_JPEG_VALUE.equals(normalized)) {
            return ".jpg";
        }
        if (MediaType.IMAGE_PNG_VALUE.equals(normalized)) {
            return ".png";
        }
        if (MediaType.IMAGE_GIF_VALUE.equals(normalized)) {
            return ".gif";
        }
        return ".webp";
    }

    private ApiException validationError(String field, String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                ErrorCode.VALIDATION_ERROR,
                Map.of("field", field, "message", message)
        );
    }
}
