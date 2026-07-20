package com.autowash.controller;

import com.autowash.dto.ExtraServiceRecommendationResponse;
import com.autowash.service.ExtraServiceRecommendationService;
import com.autowash.shared.dto.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final ExtraServiceRecommendationService extraServiceRecommendationService;

    public RecommendationController(ExtraServiceRecommendationService extraServiceRecommendationService) {
        this.extraServiceRecommendationService = extraServiceRecommendationService;
    }

    @GetMapping("/extra-services")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<ExtraServiceRecommendationResponse>> recommendExtraServices(
            @RequestParam("comboId") @NotBlank String comboId
    ) {
        return ApiResponse.ok(
                "Extra service recommendations retrieved",
                extraServiceRecommendationService.recommendForCombo(comboId)
        );
    }
}
