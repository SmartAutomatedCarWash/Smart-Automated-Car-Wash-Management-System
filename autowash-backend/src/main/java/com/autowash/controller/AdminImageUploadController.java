package com.autowash.controller;

import com.autowash.dto.ImageUploadResponse;
import com.autowash.shared.dto.ApiResponse;
import com.autowash.shared.exception.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/uploads")
@Tag(name = "Admin Uploads")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminImageUploadController {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE
    );

    private final Path uploadRoot;
    private final long maxSizeBytes;

    public AdminImageUploadController(
            @Value("${autowash.upload.dir:uploads}") String uploadDir,
            @Value("${autowash.upload.max-image-size-bytes:5242880}") long maxSizeBytes
    ) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxSizeBytes = maxSizeBytes;
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload catalog image")
    public ApiResponse<ImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
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

        String extension = extensionFor(contentType);
        String fileName = UUID.randomUUID() + extension;
        Path targetDir = uploadRoot.resolve("catalog").normalize();
        Path target = targetDir.resolve(fileName).normalize();
        if (!target.startsWith(targetDir)) {
            throw validationError("file", "Invalid file name");
        }

        try {
            Files.createDirectories(targetDir);
            file.transferTo(target);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store image", "UPLOAD_FAILED");
        }

        String url = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/uploads/catalog/" + fileName)
                .replaceQuery(null)
                .build()
                .toUriString();

        return ApiResponse.ok("Image uploaded", new ImageUploadResponse(url, fileName, file.getSize()));
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
                "VALIDATION_ERROR",
                java.util.Map.of("field", field, "message", message)
        );
    }
}
