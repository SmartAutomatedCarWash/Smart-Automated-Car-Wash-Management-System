package com.autowash.service.impl;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.Combo;
import com.autowash.entity.enums.CustomerComboStatus;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.CustomerComboRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.service.ComboVnpayPaymentService;
import com.autowash.service.CustomerComboService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class ComboVnpayPaymentServiceImpl implements ComboVnpayPaymentService {

    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VNPAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String SUCCESS_CODE = "00";

    private final CustomerComboRepository customerComboRepository;
    private final ComboRepository comboRepository;
    private final CustomerComboService customerComboService;
    private final RestClient restClient;
    private final String payUrl;
    private final String apiUrl;
    private final String returnUrl;
    private final String ipnUrl;
    private final String tmnCode;
    private final String hashSecret;

    public ComboVnpayPaymentServiceImpl(
            CustomerComboRepository customerComboRepository,
            ComboRepository comboRepository,
            CustomerComboService customerComboService,
            RestClient.Builder restClientBuilder,
            @Value("${autowash.payment.vnpay.pay-url}") String payUrl,
            @Value("${autowash.payment.vnpay.api-url}") String apiUrl,
            @Value("${autowash.payment.vnpay.return-url}") String returnUrl,
            @Value("${autowash.payment.vnpay.ipn-url}") String ipnUrl,
            @Value("${autowash.payment.vnpay.tmn-code}") String tmnCode,
            @Value("${autowash.payment.vnpay.hash-secret}") String hashSecret
    ) {
        this.customerComboRepository = customerComboRepository;
        this.comboRepository = comboRepository;
        this.customerComboService = customerComboService;
        this.restClient = restClientBuilder.build();
        this.payUrl = payUrl;
        this.apiUrl = apiUrl;
        this.returnUrl = returnUrl;
        this.ipnUrl = ipnUrl;
        this.tmnCode = tmnCode;
        this.hashSecret = hashSecret;
    }

    @Override
    @Transactional
    public VnpayCheckoutResponse createCheckout(String transactionRef, long amount, String ipAddress) {
        ensureCheckoutConfigured();
        String normalizedTransactionRef = normalizeTransactionRef(transactionRef);
        if (amount <= 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid combo amount", ErrorCode.INVALID_INPUT);
        }
        var pendingCombos = customerComboRepository.findByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
                normalizedTransactionRef,
                PaymentStatus.PENDING_PAYMENT,
                CustomerComboStatus.PENDING_PAYMENT
        );
        if (pendingCombos.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Pending combo payment not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        long expectedAmount = pendingCombos.stream()
                .map(CustomerCombo::getComboId)
                .map(comboRepository::findById)
                .flatMap(Optional::stream)
                .mapToLong(Combo::getPrice)
                .sum();
        if (expectedAmount <= 0 || expectedAmount != amount) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid combo amount", ErrorCode.INVALID_INPUT);
        }

        LocalDateTime createDate = LocalDateTime.ofInstant(Instant.now(), VNPAY_ZONE);
        String createDateText = createDate.format(VNPAY_DATE_FORMAT);
        String txnRef = normalizedTransactionRef + "-" + createDateText;

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", String.valueOf(amount * 100));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan combo " + normalizedTransactionRef);
        params.put("vnp_OrderType", "billpayment");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", normalizeIp(ipAddress));
        params.put("vnp_CreateDate", createDateText);
        params.put("vnp_ExpireDate", createDate.plusMinutes(15).format(VNPAY_DATE_FORMAT));
        params.put("vnp_Bill_Mobile", "");

        String query = buildQuery(params);
        String secureHash = hmacSha512(query, hashSecret);
        String paymentUrl = payUrl + "?" + query + "&vnp_SecureHash=" + secureHash;
        return new VnpayCheckoutResponse(normalizedTransactionRef, txnRef, amount, paymentUrl);
    }

    @Override
    @Transactional(readOnly = true)
    public VnpayPaymentResultResponse handleReturn(Map<String, String> params) {
        return verifyReturnOnly(params);
    }

    @Override
    @Transactional
    public VnpayIpnResponse handleIpn(Map<String, String> params) {
        try {
            return verifyAndApplyIpn(params);
        } catch (Exception exception) {
            return new VnpayIpnResponse("99", "Unknown error");
        }
    }

    private VnpayPaymentResultResponse verifyReturnOnly(Map<String, String> rawParams) {
        ensureCheckoutConfigured();
        Map<String, String> params = new TreeMap<>(rawParams);
        String receivedHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        if (receivedHash == null || receivedHash.isBlank()) {
            return failure(false, params, "Missing secure hash");
        }

        boolean validSignature = hmacSha512(buildQuery(params), hashSecret).equalsIgnoreCase(receivedHash);
        if (!validSignature) {
            return failure(false, params, "Invalid secure hash");
        }

        String transactionRef = resolveTransactionRef(params);
        boolean success = isSuccess(params);
        return new VnpayPaymentResultResponse(
                true,
                success,
                transactionRef,
                params.get("vnp_ResponseCode"),
                params.get("vnp_TransactionStatus"),
                resolveTransactionRef(params),
                success ? "Payment successful. Waiting for confirmation." : "Payment failed."
        );
    }

    @Transactional
    public VnpayPaymentResultResponse queryTransaction(String vnpayTxnRef, String ipAddress) {
        ensureApiConfigured();
        String transactionRef = resolveTransactionRef(Map.of("vnp_TxnRef", vnpayTxnRef));
        long expectedAmount = requirePayableAmount(transactionRef);
        String createDate = resolveCreateDate(vnpayTxnRef);
        String requestId = UUID.randomUUID().toString().replace("-", "");
        String now = LocalDateTime.ofInstant(Instant.now(), VNPAY_ZONE).format(VNPAY_DATE_FORMAT);
        String normalizedIp = normalizeIp(ipAddress);
        String orderInfo = "Query combo " + transactionRef;

        Map<String, String> request = new LinkedHashMap<>();
        request.put("vnp_RequestId", requestId);
        request.put("vnp_Version", "2.1.0");
        request.put("vnp_Command", "querydr");
        request.put("vnp_TmnCode", tmnCode);
        request.put("vnp_TxnRef", vnpayTxnRef);
        request.put("vnp_OrderInfo", orderInfo);
        request.put("vnp_TransactionDate", createDate);
        request.put("vnp_CreateDate", now);
        request.put("vnp_IpAddr", normalizedIp);
        request.put("vnp_SecureHash", hmacSha512(pipe(
                requestId,
                "2.1.0",
                "querydr",
                tmnCode,
                vnpayTxnRef,
                createDate,
                now,
                normalizedIp,
                orderInfo
        ), hashSecret));

        Map<String, String> response = postVnpayApi(request);
        if (!validApiResponseHash(response)) {
            return new VnpayPaymentResultResponse(false, false, transactionRef, response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Invalid VNPay query signature");
        }

        long returnedAmount = parseLong(response.get("vnp_Amount")) / 100;
        if (returnedAmount != expectedAmount) {
            return new VnpayPaymentResultResponse(true, false, transactionRef, response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Invalid Amount");
        }

        if (isSuccess(response)) {
            if (hasPendingPayment(transactionRef)) {
                customerComboService.markPendingPaymentAsPaid(transactionRef);
            }
            return new VnpayPaymentResultResponse(true, true, transactionRef, response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Combo payment confirmed");
        }
        return new VnpayPaymentResultResponse(true, false, transactionRef, response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Combo payment not completed");
    }

    private VnpayIpnResponse verifyAndApplyIpn(Map<String, String> rawParams) {
        ensureCheckoutConfigured();
        Map<String, String> params = new TreeMap<>(rawParams);
        String receivedHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        if (receivedHash == null || receivedHash.isBlank()) {
            return new VnpayIpnResponse("97", "Invalid Checksum");
        }

        String expectedHash = hmacSha512(buildQuery(params), hashSecret);
        if (!expectedHash.equalsIgnoreCase(receivedHash)) {
            return new VnpayIpnResponse("97", "Invalid Checksum");
        }

        String transactionRef = resolveTransactionRef(params);
        long returnedAmount = parseLong(params.get("vnp_Amount")) / 100;
        long expectedAmount = requirePayableAmount(transactionRef);
        if (returnedAmount != expectedAmount) {
            return new VnpayIpnResponse("04", "Invalid Amount");
        }

        if (SUCCESS_CODE.equals(params.get("vnp_ResponseCode")) && SUCCESS_CODE.equals(params.getOrDefault("vnp_TransactionStatus", SUCCESS_CODE))) {
            if (hasPendingPayment(transactionRef)) {
                customerComboService.markPendingPaymentAsPaid(transactionRef);
            }
            return new VnpayIpnResponse("00", "Confirm Success");
        }
        return new VnpayIpnResponse(params.getOrDefault("vnp_ResponseCode", "99"), "Payment rejected");
    }

    private VnpayPaymentResultResponse failure(boolean validSignature, Map<String, String> params, String message) {
        return new VnpayPaymentResultResponse(
                validSignature,
                false,
                params.get("vnp_TxnRef"),
                params.get("vnp_ResponseCode"),
                params.get("vnp_TransactionStatus"),
                params.get("vnp_TransactionNo"),
                message
        );
    }

    private boolean isSuccess(Map<String, String> params) {
        return SUCCESS_CODE.equals(params.get("vnp_ResponseCode"))
                && SUCCESS_CODE.equals(params.getOrDefault("vnp_TransactionStatus", params.get("vnp_ResponseCode")));
    }

    private String resolveTransactionRef(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return "";
        }
        int index = txnRef.lastIndexOf('-');
        return index > 0 ? txnRef.substring(0, index) : txnRef;
    }

    private String normalizeTransactionRef(String transactionRef) {
        if (transactionRef == null || transactionRef.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo transaction reference is required", ErrorCode.INVALID_INPUT);
        }
        String normalized = transactionRef.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9\\-:]+")) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid combo transaction reference", ErrorCode.INVALID_INPUT);
        }
        return normalized;
    }

    private void ensureCheckoutConfigured() {
        if (isBlank(payUrl) || isBlank(returnUrl) || isBlank(tmnCode) || isBlank(hashSecret)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "VNPay is not configured", "VNPAY_NOT_CONFIGURED");
        }
    }

    private void ensureApiConfigured() {
        ensureCheckoutConfigured();
        if (isBlank(apiUrl)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "VNPay API URL is not configured", "VNPAY_NOT_CONFIGURED");
        }
    }

    private long requirePayableAmount(String transactionRef) {
        String normalizedTransactionRef = normalizeTransactionRef(transactionRef);
        var combos = customerComboRepository.findByTransactionRefOrderByCreatedAtAsc(normalizedTransactionRef);
        if (combos.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Combo payment not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        long expectedAmount = combos.stream()
                .map(CustomerCombo::getComboId)
                .map(comboRepository::findById)
                .flatMap(Optional::stream)
                .mapToLong(Combo::getPrice)
                .sum();
        if (expectedAmount <= 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid combo amount", ErrorCode.INVALID_INPUT);
        }
        return expectedAmount;
    }

    private boolean hasPendingPayment(String transactionRef) {
        return !customerComboRepository.findByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
                normalizeTransactionRef(transactionRef),
                PaymentStatus.PENDING_PAYMENT,
                CustomerComboStatus.PENDING_PAYMENT
        ).isEmpty();
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> postVnpayApi(Map<String, String> body) {
        Map<String, Object> raw = restClient.post()
                .uri(apiUrl)
                .body(body)
                .retrieve()
                .body(Map.class);
        Map<String, String> result = new TreeMap<>();
        if (raw != null) {
            raw.forEach((key, value) -> result.put(key, value == null ? null : String.valueOf(value)));
        }
        return result;
    }

    private boolean validApiResponseHash(Map<String, String> response) {
        String secureHash = response.get("vnp_SecureHash");
        if (secureHash == null || secureHash.isBlank()) {
            return false;
        }
        String data = pipe(
                response.get("vnp_ResponseId"),
                response.get("vnp_Command"),
                response.get("vnp_ResponseCode"),
                response.get("vnp_Message"),
                response.get("vnp_TmnCode"),
                response.get("vnp_TxnRef"),
                response.get("vnp_Amount"),
                response.get("vnp_BankCode"),
                response.get("vnp_PayDate"),
                response.get("vnp_TransactionNo"),
                response.get("vnp_TransactionType"),
                response.get("vnp_TransactionStatus"),
                response.get("vnp_OrderInfo"),
                response.get("vnp_PromotionCode"),
                response.get("vnp_PromotionAmount")
        );
        return hmacSha512(data, hashSecret).equalsIgnoreCase(secureHash);
    }

    private String resolveCreateDate(String vnpayTxnRef) {
        if (vnpayTxnRef == null || vnpayTxnRef.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VNPay transaction reference is required", ErrorCode.INVALID_INPUT);
        }
        int index = vnpayTxnRef.lastIndexOf('-');
        if (index < 0 || vnpayTxnRef.length() - index - 1 != 14) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid VNPay transaction reference", ErrorCode.INVALID_INPUT);
        }
        return vnpayTxnRef.substring(index + 1);
    }

    private String pipe(String... values) {
        String[] safeValues = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            safeValues[i] = values[i] == null ? "" : values[i];
        }
        return String.join("|", safeValues);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String buildQuery(Map<String, String> params) {
        StringBuilder query = new StringBuilder();
        params.forEach((key, value) -> {
            if (value == null || value.isBlank()) {
                return;
            }
            if (!query.isEmpty()) {
                query.append('&');
            }
            query.append(encode(key)).append('=').append(encode(value));
        });
        return query.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.US_ASCII);
    }

    private String normalizeIp(String ipAddress) {
        return ipAddress == null || ipAddress.isBlank() ? "127.0.0.1" : ipAddress;
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (RuntimeException exception) {
            return -1L;
        }
    }

    private String hmacSha512(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot sign VNPay request", "VNPAY_SIGNING_FAILED");
        }
    }
}
