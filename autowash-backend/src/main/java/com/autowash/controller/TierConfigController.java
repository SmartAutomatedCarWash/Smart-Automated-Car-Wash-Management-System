package com.autowash.controller;

import com.autowash.dto.TierConfigResponse;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tiers")
@Tag(name = "Tier Config")
public class TierConfigController {

    private final TierConfigService tierConfigService;

    public TierConfigController(TierConfigService tierConfigService) {
        this.tierConfigService = tierConfigService;
    }

    @GetMapping
    @Operation(summary = "List all tier configurations for public display")
    public ApiResponse<List<TierConfigResponse>> listTierConfigs() {
        return ApiResponse.ok("Tier configurations retrieved", tierConfigService.getAllConfigs());
    }
}
