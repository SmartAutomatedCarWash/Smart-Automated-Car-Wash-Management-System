package com.autowash.controller;

import com.autowash.dto.BlogArticleResponse;
import com.autowash.dto.BlogCategoryResponse;
import com.autowash.service.BlogService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.autowash.dto.BlogLikeResult;
import com.autowash.dto.BlogCommentResponse;
import com.autowash.dto.BlogCommentRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/blog")
@Tag(name = "Blog")
public class BlogController {

    private final BlogService blogService;

    public BlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @GetMapping("/categories")
    @Operation(summary = "List blog categories")
    public ApiResponse<List<BlogCategoryResponse>> listCategories() {
        return ApiResponse.ok("Blog categories retrieved", blogService.listCategories());
    }

    @GetMapping("/articles")
    @Operation(summary = "List published blog articles")
    public ApiResponse<List<BlogArticleResponse>> listPublishedArticles() {
        return ApiResponse.ok("Blog articles retrieved", blogService.listPublishedArticles());
    }

    @GetMapping("/articles/{slug}")
    @Operation(summary = "Get published blog article by slug")
    public ApiResponse<BlogArticleResponse> getPublishedArticle(@PathVariable String slug) {
        return ApiResponse.ok("Blog article retrieved", blogService.getPublishedArticle(slug));
    }

    @PostMapping("/articles/{articleId}/like")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle like/unlike blog article")
    public ApiResponse<BlogLikeResult> toggleLike(@PathVariable String articleId) {
        return ApiResponse.ok("Blog like status toggled", blogService.toggleLike(articleId));
    }

    @GetMapping("/articles/{articleId}/likes")
    @Operation(summary = "Get like summary for blog article")
    public ApiResponse<BlogLikeResult> getLikeSummary(@PathVariable String articleId) {
        return ApiResponse.ok("Blog like summary retrieved", blogService.getLikeSummary(articleId));
    }

    @PostMapping("/articles/{articleId}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add comment to blog article")
    public ApiResponse<BlogCommentResponse> addComment(
            @PathVariable String articleId,
            @Valid @RequestBody BlogCommentRequest request
    ) {
        return ApiResponse.ok("Blog comment posted", blogService.addComment(articleId, request.content()));
    }

    @GetMapping("/articles/{articleId}/comments")
    @Operation(summary = "List comments of blog article")
    public ApiResponse<Page<BlogCommentResponse>> listComments(
            @PathVariable String articleId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ApiResponse.ok("Blog comments retrieved", blogService.listComments(articleId, page, limit));
    }
}
