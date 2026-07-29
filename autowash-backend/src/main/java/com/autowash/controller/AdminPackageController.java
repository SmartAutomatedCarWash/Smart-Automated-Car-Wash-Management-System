package com.autowash.controller;

import com.autowash.dto.AdminPackageRequest;
import com.autowash.dto.PackageResponse;
import com.autowash.service.AdminCatalogManagementService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin/packages")
@Tag(name = "Admin Packages")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPackageController {

    private final AdminCatalogManagementService adminCatalogManagementService;

    public AdminPackageController(AdminCatalogManagementService adminCatalogManagementService) {
        this.adminCatalogManagementService = adminCatalogManagementService;
    }

    @GetMapping
    @Operation(summary = "List packages for admin")
    public ApiResponse<List<PackageResponse>> listPackages(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit
    ) {
        AdminCatalogManagementService.PackagePage packagePage =
                adminCatalogManagementService.listPackages(status, sortBy, direction, page, limit);
        return ApiResponse.ok("Packages retrieved", packagePage.items(), packagePage.pagination());
    }

    @GetMapping("/{packageId}")
    @Operation(summary = "Get package by id")
    public ApiResponse<PackageResponse> getPackage(@PathVariable String packageId) {
        return ApiResponse.ok("Package retrieved", adminCatalogManagementService.getPackage(packageId));
    }

    @PostMapping
    @Operation(summary = "Create package")
    public ResponseEntity<ApiResponse<PackageResponse>> createPackage(@Valid @RequestBody AdminPackageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Package created", adminCatalogManagementService.createPackage(request)));
    }

    @PutMapping("/{packageId}")
    @Operation(summary = "Update package")
    public ApiResponse<PackageResponse> updatePackage(
            @PathVariable String packageId,
            @Valid @RequestBody AdminPackageRequest request
    ) {
        return ApiResponse.ok("Package updated", adminCatalogManagementService.updatePackage(packageId, request));
    }

    @DeleteMapping("/{packageId}")
    @Operation(summary = "Deactivate package")
    public ApiResponse<PackageResponse> deletePackage(@PathVariable String packageId) {
        return ApiResponse.ok("Package deactivated", adminCatalogManagementService.deletePackage(packageId));
    }
}
