package com.autowash.controller;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import com.autowash.dto.VnpayRefundRequest;
import com.autowash.service.ComboVnpayPaymentService;
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
    private final ComboVnpayPaymentService comboVnpayPaymentService;
    private final SepayPaymentService sepayPaymentService;

    public PaymentController(
            VnpayPaymentService vnpayPaymentService,
            ComboVnpayPaymentService comboVnpayPaymentService,
            SepayPaymentService sepayPaymentService
    ) {
        this.vnpayPaymentService = vnpayPaymentService;
        this.comboVnpayPaymentService = comboVnpayPaymentService;
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

    @PostMapping("/combos/vnpay/checkout")
    @PreAuthorize("hasRole('CUSTOMER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create a VNPay checkout URL for combo purchase")
    public ApiResponse<VnpayCheckoutResponse> createComboVnpayCheckout(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request
    ) {
        String transactionRef = payload.get("transactionRef") == null ? null : String.valueOf(payload.get("transactionRef"));
        long amount = amountFromPayload(payload.get("amount"));
        return ApiResponse.ok("Combo VNPay checkout URL created", comboVnpayPaymentService.createCheckout(transactionRef, amount, clientIp(request)));
    }

    @GetMapping("/vnpay/return")
    @Operation(summary = "Handle VNPay browser return")
    public ApiResponse<VnpayPaymentResultResponse> handleVnpayReturn(@RequestParam Map<String, String> params) {
        if (isComboVnpayTxnRef(params.get("vnp_TxnRef"))) {
            return ApiResponse.ok("Combo VNPay return handled", comboVnpayPaymentService.handleReturn(params));
        }
        return ApiResponse.ok("VNPay return handled", vnpayPaymentService.handleReturn(params));
    }

    @GetMapping("/vnpay/ipn")
    @Operation(summary = "Handle VNPay payment notification")
    public VnpayIpnResponse handleVnpayIpn(@RequestParam Map<String, String> params) {
        if (isComboVnpayTxnRef(params.get("vnp_TxnRef"))) {
            return comboVnpayPaymentService.handleIpn(params);
        }
        return vnpayPaymentService.handleIpn(params);
    }

    @GetMapping("/combos/vnpay/return")
    @Operation(summary = "Handle combo VNPay browser return")
    public ApiResponse<VnpayPaymentResultResponse> handleComboVnpayReturn(@RequestParam Map<String, String> params) {
        return ApiResponse.ok("Combo VNPay return handled", comboVnpayPaymentService.handleReturn(params));
    }

    @GetMapping("/combos/vnpay/ipn")
    @Operation(summary = "Handle combo VNPay payment notification")
    public VnpayIpnResponse handleComboVnpayIpn(@RequestParam Map<String, String> params) {
        return comboVnpayPaymentService.handleIpn(params);
    }

    @PostMapping("/combos/vnpay/query")
    @PreAuthorize("hasRole('CUSTOMER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Sync VNPay transaction status after combo browser return")
    public ApiResponse<VnpayPaymentResultResponse> queryComboVnpayTransaction(
            @RequestBody Map<String, String> payload,
            HttpServletRequest request
    ) {
        return ApiResponse.ok(
                "Combo VNPay transaction queried",
                comboVnpayPaymentService.queryTransaction(payload.get("txnRef"), clientIp(request))
        );
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

    @PostMapping("/bookings/{bookingId}/vnpay/query")
    @PreAuthorize("hasAnyRole('CUSTOMER','MANAGER','ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Sync VNPay transaction status after browser return")
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

    private long amountFromPayload(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private boolean isComboVnpayTxnRef(String txnRef) {
        if (txnRef == null || txnRef.isBlank() || txnRef.length() < 36) {
            return true;
        }
        try {
            UUID.fromString(txnRef.substring(0, 36));
            return false;
        } catch (RuntimeException exception) {
            return true;
        }
    }
}
