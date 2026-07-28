package com.autowash.controller;

import com.autowash.dto.AdminServiceRequest;
import com.autowash.dto.ServiceResponse;
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
@RequestMapping("/api/v1/admin/services")
@Tag(name = "Admin Services")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminServiceController {

    private final AdminCatalogManagementService adminCatalogManagementService;

    public AdminServiceController(AdminCatalogManagementService adminCatalogManagementService) {
        this.adminCatalogManagementService = adminCatalogManagementService;
    }

    @GetMapping
    @Operation(summary = "List services for admin")
    public ApiResponse<List<ServiceResponse>> listServices(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit
    ) {
        AdminCatalogManagementService.ServicePage servicePage =
                adminCatalogManagementService.listServices(status, sortBy, direction, page, limit);
        return ApiResponse.ok("Services retrieved", servicePage.items(), servicePage.pagination());
    }

    @GetMapping("/{serviceId}")
    @Operation(summary = "Get service by id")
    public ApiResponse<ServiceResponse> getService(@PathVariable String serviceId) {
        return ApiResponse.ok("Service retrieved", adminCatalogManagementService.getService(serviceId));
    }

    @PostMapping
    @Operation(summary = "Create service")
    public ResponseEntity<ApiResponse<ServiceResponse>> createService(@Valid @RequestBody AdminServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Service created", adminCatalogManagementService.createService(request)));
    }

    @PutMapping("/{serviceId}")
    @Operation(summary = "Update service")
    public ApiResponse<ServiceResponse> updateService(
            @PathVariable String serviceId,
            @Valid @RequestBody AdminServiceRequest request
    ) {
        return ApiResponse.ok("Service updated", adminCatalogManagementService.updateService(serviceId, request));
    }

    @DeleteMapping("/{serviceId}")
    @Operation(summary = "Deactivate service")
    public ApiResponse<ServiceResponse> deleteService(@PathVariable String serviceId) {
        return ApiResponse.ok("Service deactivated", adminCatalogManagementService.deleteService(serviceId));
    }
}
