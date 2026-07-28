package com.autowash.controller;

import com.autowash.dto.AdminComboRequest;
import com.autowash.dto.ComboResponse;
import com.autowash.service.AdminComboService;
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
@RequestMapping("/api/v1/admin/combos")
@Tag(name = "Admin Combos")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminComboController {

    private final AdminComboService adminComboService;

    public AdminComboController(AdminComboService adminComboService) {
        this.adminComboService = adminComboService;
    }

    @GetMapping
    @Operation(summary = "List combos for admin")
    public ApiResponse<List<ComboResponse>> listCombos(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit
    ) {
        AdminComboService.ComboPage comboPage = adminComboService.listCombos(status, sortBy, direction, page, limit);
        return ApiResponse.ok("Combos retrieved", comboPage.items(), comboPage.pagination());
    }

    @GetMapping("/{comboId}")
    @Operation(summary = "Get combo by id")
    public ApiResponse<ComboResponse> getCombo(@PathVariable String comboId) {
        return ApiResponse.ok("Combo retrieved", adminComboService.getCombo(comboId));
    }

    @PostMapping
    @Operation(summary = "Create combo")
    public ResponseEntity<ApiResponse<ComboResponse>> createCombo(@Valid @RequestBody AdminComboRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Combo created", adminComboService.createCombo(request)));
    }

    @PutMapping("/{comboId}")
    @Operation(summary = "Update combo")
    public ApiResponse<ComboResponse> updateCombo(
            @PathVariable String comboId,
            @Valid @RequestBody AdminComboRequest request
    ) {
        return ApiResponse.ok("Combo updated", adminComboService.updateCombo(comboId, request));
    }

    @DeleteMapping("/{comboId}")
    @Operation(summary = "Deactivate combo")
    public ApiResponse<ComboResponse> deleteCombo(@PathVariable String comboId) {
        return ApiResponse.ok("Combo deactivated", adminComboService.deleteCombo(comboId));
    }
}
