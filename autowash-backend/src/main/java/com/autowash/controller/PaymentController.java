package com.autowash.controller;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import com.autowash.dto.VnpayRefundRequest;
import com.autowash.dto.SepayPaymentResultResponse;
import com.autowash.service.SepayPaymentService;
import com.autowash.service.VnpayPaymentService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments")
public class PaymentController {

    private final VnpayPaymentService vnpayPaymentService;
    private final SepayPaymentService sepayPaymentService;

    public PaymentController(VnpayPaymentService vnpayPaymentService, SepayPaymentService sepayPaymentService) {
        this.vnpayPaymentService = vnpayPaymentService;
        this.sepayPaymentService = sepayPaymentService;
    }

    @PostMapping("/bookings/{bookingId}/vnpay/checkout")
    @PreAuthorize("hasRole('CUSTOMER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create a VNPay checkout URL for a booking")
    public ApiResponse<VnpayCheckoutResponse> createVnpayCheckout(
            @PathVariable UUID bookingId,
            HttpServletRequest request
    ) {
        return ApiResponse.ok("VNPay checkout URL created", vnpayPaymentService.createCheckout(bookingId, clientIp(request)));
    }

    @GetMapping("/vnpay/return")
    @Operation(summary = "Handle VNPay browser return")
    public ApiResponse<VnpayPaymentResultResponse> handleVnpayReturn(@RequestParam Map<String, String> params) {
        return ApiResponse.ok("VNPay return handled", vnpayPaymentService.handleReturn(params));
    }

    @GetMapping("/vnpay/ipn")
    @Operation(summary = "Handle VNPay payment notification")
    public VnpayIpnResponse handleVnpayIpn(@RequestParam Map<String, String> params) {
        return vnpayPaymentService.handleIpn(params);
    }

    @PostMapping("/sepay/webhook")
    @Operation(summary = "Handle SePay payment webhook")
    public ResponseEntity<Map<String, Boolean>> handleSepayWebhook(
            @RequestBody byte[] rawBody,
            @RequestHeader(value = "X-SePay-Signature", required = false) String signature,
            @RequestHeader(value = "X-SePay-Timestamp", required = false) String timestamp
    ) {
        sepayPaymentService.handleWebhook(rawBody, signature, timestamp);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/bookings/{bookingId}/sepay/query")
    @PreAuthorize("hasAnyRole('CUSTOMER','MANAGER','ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Query SePay transaction status and sync booking/payment")
    public ApiResponse<SepayPaymentResultResponse> querySepayTransaction(@PathVariable UUID bookingId) {
        return ApiResponse.ok("SePay transaction queried", sepayPaymentService.queryTransaction(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/vnpay/query")
    @PreAuthorize("hasAnyRole('CUSTOMER','MANAGER','ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Query VNPay transaction status and sync booking/payment")
    public ApiResponse<VnpayPaymentResultResponse> queryVnpayTransaction(
            @PathVariable UUID bookingId,
            HttpServletRequest request
    ) {
        return ApiResponse.ok("VNPay transaction queried", vnpayPaymentService.queryTransaction(bookingId, clientIp(request)));
    }

    @PostMapping("/bookings/{bookingId}/vnpay/refund")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Request VNPay refund for a paid booking")
    public ApiResponse<VnpayPaymentResultResponse> refundVnpayPayment(
            @PathVariable UUID bookingId,
            @RequestBody(required = false) VnpayRefundRequest refundRequest,
            HttpServletRequest request
    ) {
        Long amount = refundRequest == null ? null : refundRequest.amount();
        String createdBy = refundRequest == null ? null : refundRequest.createdBy();
        return ApiResponse.ok("VNPay refund requested", vnpayPaymentService.refund(bookingId, amount, createdBy, clientIp(request)));
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
