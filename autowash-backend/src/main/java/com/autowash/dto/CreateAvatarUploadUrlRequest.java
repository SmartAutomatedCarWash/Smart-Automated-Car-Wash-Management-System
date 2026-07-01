package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAvatarUploadUrlRequest(
        @NotBlank(message = "File name is required")
        @Size(max = 255, message = "File name must be at most 255 characters")
        String fileName,

        @NotBlank(message = "Content type is required")
        @Pattern(
                regexp = "^image/(jpeg|png|webp)$",
                message = "Avatar content type must be image/jpeg, image/png, or image/webp"
        )
        String contentType
) {
}
