package com.autowash.controller;

import com.autowash.dto.NotificationCampaignRequest;
import com.autowash.dto.NotificationCampaignResponse;
import com.autowash.service.NotificationCampaignService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/notification-campaigns")
@RequiredArgsConstructor
@Validated
@Tag(name = "Admin Notification Campaigns")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminNotificationCampaignController {

    private final NotificationCampaignService campaignService;

    @PostMapping
    @Operation(summary = "Create and process a notification campaign")
    public ApiResponse<NotificationCampaignResponse> createCampaign(@Valid @RequestBody NotificationCampaignRequest request) {
        return ApiResponse.ok("Campaign created successfully", campaignService.createCampaign(request));
    }

    @GetMapping
    @Operation(summary = "Get all notification campaigns")
    public ApiResponse<NotificationCampaignService.CampaignPage> getCampaigns(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        return ApiResponse.ok("Campaigns retrieved successfully", campaignService.getCampaigns(page, limit));
    }
}
