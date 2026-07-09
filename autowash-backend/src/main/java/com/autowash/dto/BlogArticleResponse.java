package com.autowash.dto;

import java.time.Instant;

public record BlogArticleResponse(
        String id,
        BlogCategoryResponse category,
        String authorId,
        String authorName,
        String title,
        String slug,
        String thumbnailUrl,
        String excerpt,
        String content,
        String status,
        int viewCount,
        int likeCount,
        int commentCount,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
