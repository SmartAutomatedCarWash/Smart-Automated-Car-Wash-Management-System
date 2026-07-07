package com.autowash.controller;

import com.autowash.dto.ImageUploadResponse;
import com.autowash.service.ImageUploadService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/uploads")
@Tag(name = "Uploads")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("isAuthenticated()")
public class ImageUploadController {

    private final ImageUploadService imageUploadService;

    public ImageUploadController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @PostMapping(value = "/review-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload review before or after image")
    public ApiResponse<ImageUploadResponse> uploadReviewImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        return ApiResponse.ok("Image uploaded", imageUploadService.store(file, "reviews", request));
    }
}
