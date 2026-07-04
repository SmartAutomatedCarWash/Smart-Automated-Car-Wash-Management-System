package com.autowash.controller;

import com.autowash.dto.CustomerVoucherResponse;
import com.autowash.service.CustomerVoucherService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
@Tag(name = "Customer Vouchers")
@SecurityRequirement(name = "bearerAuth")
public class CustomerVoucherController {

    private final CustomerVoucherService customerVoucherService;

    public CustomerVoucherController(CustomerVoucherService customerVoucherService) {
        this.customerVoucherService = customerVoucherService;
    }

    @GetMapping("/api/v1/vouchers/active")
    @Operation(summary = "List active vouchers for the current customer's tier")
    public ApiResponse<List<CustomerVoucherResponse>> listActiveVouchers(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        CustomerVoucherService.VoucherPage voucherPage = customerVoucherService.listActiveVouchers(page, limit);
        return ApiResponse.ok("Vouchers retrieved", voucherPage.items(), voucherPage.pagination());
    }
}
