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
@RequestMapping("/api/v1/admin/uploads")
@Tag(name = "Admin Uploads")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminImageUploadController {

    private final ImageUploadService imageUploadService;

    public AdminImageUploadController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload catalog image")
    public ApiResponse<ImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        return ApiResponse.ok("Image uploaded", imageUploadService.store(file, "catalog", request));
    }
}
