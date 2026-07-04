package com.autowash.dto;

import com.autowash.entity.enums.BlogArticleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BlogArticleRequest(
        @NotBlank String categoryId,
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        @Size(max = 500) String thumbnailUrl,
        @Size(max = 500) String excerpt,
        @NotBlank String content,
        BlogArticleStatus status
) {
}
