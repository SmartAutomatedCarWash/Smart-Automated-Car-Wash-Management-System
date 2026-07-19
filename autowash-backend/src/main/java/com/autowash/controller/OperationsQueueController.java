package com.autowash.controller;

import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.StaffDashboardSummaryResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/operations")
@Tag(name = "Operations")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
public class OperationsQueueController {

    private final OperationsService operationsService;

    public OperationsQueueController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping("/queue")
    @Operation(summary = "Get staff operations queue")
    public ApiResponse<OperationsQueueResponse> getQueue() {
        return ApiResponse.ok("Operations queue retrieved", operationsService.getQueue());
    }

    @GetMapping("/staff/summary")
    @Operation(summary = "Get current staff personal dashboard summary")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<StaffDashboardSummaryResponse> getStaffSummary() {
        return ApiResponse.ok("Staff summary retrieved", operationsService.getStaffSummary());
    }

    @GetMapping("/staff/active")
    @Operation(summary = "List active staff members for transfer")
    public ApiResponse<List<StaffOptionResponse>> listActiveStaff() {
        return ApiResponse.ok("Active staff retrieved", operationsService.listActiveStaff());
    }
}
