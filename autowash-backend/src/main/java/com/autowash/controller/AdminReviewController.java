package com.autowash.controller;

import com.autowash.dto.ReviewResponse;
import com.autowash.dto.UpdateReviewFeaturedRequest;
import com.autowash.service.ReviewService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.autowash.dto.ReviewStatsResponse;
import com.autowash.shared.dto.PaginationMeta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@Validated
@RequestMapping("/api/v1/admin/reviews")
@Tag(name = "Admin Reviews")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final ReviewService reviewService;

    public AdminReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    @Operation(summary = "List reviews for admin with pagination and filters")
    public ApiResponse<List<ReviewResponse>> listReviews(
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit, sort);
        Page<ReviewResponse> resultPage = reviewService.listAdminReviewsPaginated(rating, pageable);

        PaginationMeta meta = new PaginationMeta(
                page,
                limit,
                resultPage.getTotalElements(),
                resultPage.getTotalPages(),
                resultPage.hasNext()
        );

        return ApiResponse.ok("Reviews retrieved", resultPage.getContent(), meta);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get review analytics/statistics for dashboard")
    public ApiResponse<ReviewStatsResponse> getStats() {
        return ApiResponse.ok("Review stats retrieved", reviewService.getReviewStats());
    }

    @PatchMapping("/{reviewId}/featured")
    @Operation(summary = "Feature or unfeature a review")
    public ApiResponse<ReviewResponse> updateFeatured(
            @PathVariable String reviewId,
            @Valid @RequestBody UpdateReviewFeaturedRequest request
    ) {
        return ApiResponse.ok("Review updated", reviewService.updateFeatured(reviewId, request.featured()));
    }
}
