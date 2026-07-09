package com.autowash.dto;

import java.time.Instant;

public record BlogCommentResponse(
        String commentId,
        String articleId,
        String authorName,
        String authorAvatarUrl,
        String content,
        Instant createdAt
) {
}
