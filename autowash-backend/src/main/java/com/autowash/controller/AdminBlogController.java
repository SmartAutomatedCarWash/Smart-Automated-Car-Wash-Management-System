package com.autowash.controller;

import com.autowash.dto.BlogArticleRequest;
import com.autowash.dto.BlogArticleResponse;
import com.autowash.dto.BlogCategoryRequest;
import com.autowash.dto.BlogCategoryResponse;
import com.autowash.service.BlogService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin/blog")
@Tag(name = "Admin Blog")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBlogController {

    private final BlogService blogService;

    public AdminBlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @GetMapping("/categories")
    @Operation(summary = "List blog categories for admin")
    public ApiResponse<List<BlogCategoryResponse>> listCategories() {
        return ApiResponse.ok("Blog categories retrieved", blogService.listCategories());
    }

    @PostMapping("/categories")
    @Operation(summary = "Create blog category")
    public ResponseEntity<ApiResponse<BlogCategoryResponse>> createCategory(
            @Valid @RequestBody BlogCategoryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Blog category created", blogService.createCategory(request)));
    }

    @PutMapping("/categories/{categoryId}")
    @Operation(summary = "Update blog category")
    public ApiResponse<BlogCategoryResponse> updateCategory(
            @PathVariable String categoryId,
            @Valid @RequestBody BlogCategoryRequest request
    ) {
        return ApiResponse.ok("Blog category updated", blogService.updateCategory(categoryId, request));
    }

    @DeleteMapping("/categories/{categoryId}")
    @Operation(summary = "Delete blog category")
    public ApiResponse<Void> deleteCategory(@PathVariable String categoryId) {
        blogService.deleteCategory(categoryId);
        return ApiResponse.ok("Blog category deleted", null);
    }

    @GetMapping("/articles")
    @Operation(summary = "List blog articles for admin")
    public ApiResponse<List<BlogArticleResponse>> listArticles() {
        return ApiResponse.ok("Blog articles retrieved", blogService.listAdminArticles());
    }

    @GetMapping("/articles/{articleId}")
    @Operation(summary = "Get blog article for admin")
    public ApiResponse<BlogArticleResponse> getArticle(@PathVariable String articleId) {
        return ApiResponse.ok("Blog article retrieved", blogService.getAdminArticle(articleId));
    }

    @PostMapping("/articles")
    @Operation(summary = "Create blog article")
    public ResponseEntity<ApiResponse<BlogArticleResponse>> createArticle(
            @Valid @RequestBody BlogArticleRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Blog article created", blogService.createArticle(request)));
    }

    @PutMapping("/articles/{articleId}")
    @Operation(summary = "Update blog article")
    public ApiResponse<BlogArticleResponse> updateArticle(
            @PathVariable String articleId,
            @Valid @RequestBody BlogArticleRequest request
    ) {
        return ApiResponse.ok("Blog article updated", blogService.updateArticle(articleId, request));
    }

    @DeleteMapping("/articles/{articleId}")
    @Operation(summary = "Delete blog article")
    public ApiResponse<Void> deleteArticle(@PathVariable String articleId) {
        blogService.deleteArticle(articleId);
        return ApiResponse.ok("Blog article deleted", null);
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "Delete blog comment for moderation")
    public ApiResponse<Void> deleteComment(@PathVariable String commentId) {
        blogService.deleteComment(commentId);
        return ApiResponse.ok("Blog comment deleted", null);
    }
}
