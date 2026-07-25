package com.autowash.controller;

import org.springframework.web.bind.annotation.PathVariable;
import com.autowash.dto.ComboResponse;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.service.CatalogService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@Tag(name = "Catalog")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/api/v1/packages")
    @Operation(summary = "List available service packages")
    public ApiResponse<List<PackageResponse>> getPackages(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        CatalogService.PackagePage packagePage = catalogService.getPackages(page, limit);
        return ApiResponse.ok("Packages retrieved", packagePage.items(), packagePage.pagination());
    }

    @GetMapping("/api/v1/services")
    @Operation(summary = "List available services")
    public ApiResponse<List<ServiceResponse>> getServices() {
        return ApiResponse.ok("Services retrieved", catalogService.getServices());
    }

    @GetMapping("/api/v1/services/{serviceId}")
    @Operation(summary = "Get service detail")
    public ApiResponse<ServiceResponse> getService(@PathVariable String serviceId) {
        return ApiResponse.ok("Service retrieved", catalogService.getServiceById(serviceId));
    }

    @GetMapping("/api/v1/combos/available")
    @Operation(summary = "List available combo packages")
    public ApiResponse<List<ComboResponse>> getAvailableCombos() {
        return ApiResponse.ok("Available combos", catalogService.getAvailableCombos());
    }

    @GetMapping("/api/v1/packages/{packageId}")
    @Operation(summary = "Get package detail")
    public ApiResponse<PackageResponse> getPackage(@PathVariable String packageId) {
        return ApiResponse.ok("Package retrieved", catalogService.getPackageById(packageId));
    }

    @GetMapping("/api/v1/combos/{comboId}")
    @Operation(summary = "Get combo detail")
    public ApiResponse<ComboResponse> getCombo(@PathVariable String comboId) {
        return ApiResponse.ok("Combo retrieved", catalogService.getComboById(comboId));
    }
}


