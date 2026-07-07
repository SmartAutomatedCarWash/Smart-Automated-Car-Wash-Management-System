package com.autowash.service.impl;

import com.autowash.dto.ImageUploadResponse;
import com.autowash.service.ImageUploadService;
import com.autowash.shared.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "autowash.storage.s3", name = "enabled", havingValue = "true")
public class S3ImageUploadServiceImpl implements ImageUploadService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE
    );

    private final S3Client s3Client;
    private final String bucket;
    private final String publicBaseUrl;
    private final long maxSizeBytes;

    public S3ImageUploadServiceImpl(
            @Value("${autowash.storage.s3.region}") String region,
            @Value("${autowash.storage.s3.bucket}") String bucket,
            @Value("${autowash.storage.s3.access-key:}") String accessKey,
            @Value("${autowash.storage.s3.secret-key:}") String secretKey,
            @Value("${autowash.storage.s3.endpoint:}") String endpoint,
            @Value("${autowash.storage.s3.public-base-url}") String publicBaseUrl,
            @Value("${autowash.upload.max-image-size-bytes:5242880}") long maxSizeBytes
    ) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("autowash.storage.s3.bucket must be configured when s3 is enabled");
        }
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            throw new IllegalStateException("autowash.storage.s3.public-base-url must be configured when s3 is enabled");
        }
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.maxSizeBytes = maxSizeBytes;

        Region awsRegion = Region.of(region);
        StaticCredentialsProvider staticCredentialsProvider = (accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank())
                ? StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))
                : null;

        var s3ClientBuilder = S3Client.builder()
                .region(awsRegion)
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

        if (staticCredentialsProvider != null) {
            s3ClientBuilder.credentialsProvider(staticCredentialsProvider);
        } else {
            s3ClientBuilder.credentialsProvider(DefaultCredentialsProvider.builder().build());
        }

        if (endpoint != null && !endpoint.isBlank()) {
            java.net.URI endpointUri = java.net.URI.create(endpoint);
            s3ClientBuilder.endpointOverride(endpointUri);
        }

        this.s3Client = s3ClientBuilder.build();
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
        String objectKey = safeFolder.isEmpty() ? fileName : safeFolder + "/" + fileName;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String url = publicBaseUrl + "/" + objectKey;
            return new ImageUploadResponse(url, fileName, file.getSize());

        } catch (IOException | S3Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store image to S3", "UPLOAD_FAILED");
        }
    }

    private String normalizeFolder(String folder) {
        String normalized = folder == null ? "" : folder.trim().toLowerCase(Locale.ROOT);
        if (!normalized.isEmpty() && !normalized.matches("[a-z0-9_-]+")) {
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
                "VALIDATION_ERROR",
                java.util.Map.of("field", field, "message", message)
        );
    }
}
