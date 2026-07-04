package com.autowash.service.impl;

import com.autowash.service.AvatarStorageService;
import com.autowash.shared.exception.ApiException;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@ConditionalOnProperty(prefix = "autowash.storage.s3", name = "enabled", havingValue = "true")
public class S3AvatarStorageServiceImpl implements AvatarStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final Map<String, String> CONTENT_TYPE_EXTENSION = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final String publicBaseUrl;
    private final long uploadUrlTtlSeconds;
    private final long maxAvatarSizeBytes;

    public S3AvatarStorageServiceImpl(
            @Value("${autowash.storage.s3.region}") String region,
            @Value("${autowash.storage.s3.bucket}") String bucket,
            @Value("${autowash.storage.s3.access-key:}") String accessKey,
            @Value("${autowash.storage.s3.secret-key:}") String secretKey,
            @Value("${autowash.storage.s3.endpoint:}") String endpoint,
            @Value("${autowash.storage.s3.public-base-url}") String publicBaseUrl,
            @Value("${autowash.storage.s3.upload-url-ttl-seconds:300}") long uploadUrlTtlSeconds,
            @Value("${autowash.storage.s3.max-avatar-size-bytes:5242880}") long maxAvatarSizeBytes
    ) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("autowash.storage.s3.bucket must be configured when avatar upload is enabled");
        }
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            throw new IllegalStateException("autowash.storage.s3.public-base-url must be configured when avatar upload is enabled");
        }

        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.uploadUrlTtlSeconds = uploadUrlTtlSeconds;
        this.maxAvatarSizeBytes = maxAvatarSizeBytes;

        Region awsRegion = Region.of(region);
        StaticCredentialsProvider staticCredentialsProvider = (accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank())
                ? StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))
                : null;

        var s3ClientBuilder = S3Client.builder()
                .region(awsRegion)
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

        S3Presigner.Builder presignerBuilder = S3Presigner.builder()
                .region(awsRegion)
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

        if (staticCredentialsProvider != null) {
            s3ClientBuilder.credentialsProvider(staticCredentialsProvider);
            presignerBuilder.credentialsProvider(staticCredentialsProvider);
        } else {
            s3ClientBuilder.credentialsProvider(DefaultCredentialsProvider.builder().build());
            presignerBuilder.credentialsProvider(DefaultCredentialsProvider.builder().build());
        }

        if (endpoint != null && !endpoint.isBlank()) {
            URI endpointUri = URI.create(endpoint);
            s3ClientBuilder.endpointOverride(endpointUri);
            presignerBuilder.endpointOverride(endpointUri);
        }

        this.s3Client = s3ClientBuilder.build();
        this.s3Presigner = presignerBuilder.build();
    }

    @Override
    public AvatarUploadTarget createAvatarUpload(UUID userId, String fileName, String contentType) {
        validateContentType(contentType);

        String objectKey = buildObjectKey(userId, fileName, contentType);
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(uploadUrlTtlSeconds))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

        return new AvatarUploadTarget(
                objectKey,
                presignedRequest.url().toString(),
                buildPublicUrl(objectKey)
        );
    }

    @Override
    public String resolveAvatarUrl(UUID userId, String objectKey) {
        requireOwnedObjectKey(userId, objectKey);
        try {
            HeadObjectResponse object = s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .build()
            );
            validateExistingObject(object);
        } catch (NoSuchKeyException exception) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Uploaded avatar was not found", "RESOURCE_NOT_FOUND");
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Uploaded avatar was not found", "RESOURCE_NOT_FOUND");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to verify uploaded avatar", "STORAGE_UNAVAILABLE");
        }
        return buildPublicUrl(objectKey);
    }

    private void validateExistingObject(HeadObjectResponse object) {
        String contentType = object.contentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Uploaded avatar must be a JPG, PNG, or WEBP image", "VALIDATION_ERROR");
        }
        Long contentLength = object.contentLength();
        if (contentLength != null && contentLength > maxAvatarSizeBytes) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Uploaded avatar exceeds the size limit", "VALIDATION_ERROR");
        }
    }

    private void validateContentType(String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
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
                if (Set.of("jpg", "jpeg", "png", "webp").contains(candidate)) {
                    return "jpeg".equals(candidate) ? "jpg" : candidate;
                }
            }
        }
        return CONTENT_TYPE_EXTENSION.get(contentType);
    }

    private void requireOwnedObjectKey(UUID userId, String objectKey) {
        String expectedPrefix = "avatars/%s/".formatted(userId);
        if (objectKey == null || objectKey.isBlank() || !objectKey.startsWith(expectedPrefix)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar object key is invalid", "VALIDATION_ERROR");
        }
    }

    private String buildPublicUrl(String objectKey) {
        return publicBaseUrl + "/" + objectKey;
    }
}
