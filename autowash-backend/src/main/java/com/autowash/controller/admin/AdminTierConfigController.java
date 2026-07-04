package com.autowash.controller.admin;

import com.autowash.dto.TierConfigCreateRequest;
import com.autowash.dto.TierConfigRequest;
import com.autowash.dto.TierConfigResponse;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/v1/admin/tiers")
@Tag(name = "Admin Tier Config")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminTierConfigController {

    private final TierConfigService tierConfigService;

    public AdminTierConfigController(TierConfigService tierConfigService) {
        this.tierConfigService = tierConfigService;
    }

    @GetMapping
    @Operation(summary = "List all tier configurations")
    public ApiResponse<List<TierConfigResponse>> listTierConfigs() {
        return ApiResponse.ok("Tier configurations retrieved", tierConfigService.getAllConfigs());
    }

    @PostMapping
    @Operation(summary = "Create tier configuration")
    public ApiResponse<TierConfigResponse> createTierConfig(@Valid @RequestBody TierConfigCreateRequest request) {
        return ApiResponse.ok("Tier configuration created", tierConfigService.createConfig(request));
    }

    @PutMapping("/{tier}")
    @Operation(summary = "Update tier configuration")
    public ApiResponse<TierConfigResponse> updateTierConfig(
            @PathVariable String tier,
            @Valid @RequestBody TierConfigRequest request
    ) {
        return ApiResponse.ok("Tier configuration updated", tierConfigService.updateConfig(tier, request));
    }

    @DeleteMapping("/{tier}")
    @Operation(summary = "Delete custom tier configuration")
    public ApiResponse<Void> deleteTierConfig(@PathVariable String tier) {
        tierConfigService.deleteConfig(tier);
        return ApiResponse.ok("Tier configuration deleted", null);
    }
}
