package com.autowash.controller;


import com.autowash.entity.User;
import com.autowash.dto.CustomerComboPaymentStatusResponse;
import com.autowash.dto.CustomerComboResponse;
import com.autowash.dto.PurchaseCustomerComboRequest;
import com.autowash.dto.PurchaseCustomerComboResponse;
import com.autowash.service.CustomerComboService;
import com.autowash.shared.dto.ApiResponse;
import com.autowash.service.CurrentUserService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers/combos")
@Tag(name = "Customer Combos")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerComboController {

    private final CustomerComboService customerComboService;
    private final CurrentUserService currentUserService;

    public CustomerComboController(CustomerComboService customerComboService, CurrentUserService currentUserService) {
        this.customerComboService = customerComboService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/active")
    @Operation(summary = "List active owned combos for customer")
    public ApiResponse<List<CustomerComboResponse>> listActiveCombos() {
        User user = currentUserService.getCurrentUser();
        return ApiResponse.ok("Active combos retrieved", customerComboService.listActiveCustomerCombos(user));
    }

    @GetMapping("/history")
    @Operation(summary = "List owned combos history for customer")
    public ApiResponse<List<CustomerComboResponse>> listComboHistory(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        User user = currentUserService.getCurrentUser();
        CustomerComboService.CustomerComboPage comboPage = customerComboService.listCustomerCombos(user, page, limit);
        return ApiResponse.ok("Customer combo history retrieved", comboPage.items(), comboPage.pagination());
    }

    @GetMapping("/payments/{transactionRef}/status")
    @Operation(summary = "Get combo payment status for customer")
    public ApiResponse<CustomerComboPaymentStatusResponse> getComboPaymentStatus(@PathVariable String transactionRef) {
        User user = currentUserService.getCurrentUser();
        return ApiResponse.ok("Combo payment status retrieved", customerComboService.getPaymentStatus(user, transactionRef));
    }

    @PostMapping("/purchase")
    @Operation(summary = "Purchase combo for customer")
    public ResponseEntity<ApiResponse<PurchaseCustomerComboResponse>> purchaseCombo(
            @Valid @RequestBody PurchaseCustomerComboRequest request
    ) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Combo payment initialized", customerComboService.purchaseCombo(user, request)));
    }

    @PostMapping("/{comboId}/activate")
    @Operation(summary = "Activate combo for customer by path combo id")
    public ResponseEntity<ApiResponse<PurchaseCustomerComboResponse>> activateComboByPath(
            @PathVariable String comboId,
            @Valid @RequestBody PurchaseCustomerComboRequest request
    ) {
        User user = currentUserService.getCurrentUser();
        PurchaseCustomerComboRequest normalizedRequest = new PurchaseCustomerComboRequest(comboId, request.comboIds(), request.paymentMethod());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.created("Combo payment initialized", customerComboService.purchaseCombo(user, normalizedRequest))
        );
    }

    @PostMapping("/{comboId}/purchase")
    @Operation(summary = "Purchase combo for customer by path combo id")
    public ResponseEntity<ApiResponse<PurchaseCustomerComboResponse>> purchaseComboByPath(
            @PathVariable String comboId,
            @Valid @RequestBody PurchaseCustomerComboRequest request
    ) {
        User user = currentUserService.getCurrentUser();
        PurchaseCustomerComboRequest normalizedRequest = new PurchaseCustomerComboRequest(comboId, request.comboIds(), request.paymentMethod());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.created("Combo payment initialized", customerComboService.purchaseCombo(user, normalizedRequest))
        );
    }
}

