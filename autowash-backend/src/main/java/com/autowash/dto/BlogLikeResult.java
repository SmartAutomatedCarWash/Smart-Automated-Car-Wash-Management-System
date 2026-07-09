package com.autowash.dto;

public record BlogLikeResult(
        String articleId,
        int totalLikes,
        boolean hasLiked
) {
}
