package com.autowash.service.impl;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.Payment;
import com.autowash.entity.User;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.VnpayPaymentService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.client.RestClient;

@Service
public class VnpayPaymentServiceImpl implements VnpayPaymentService {

    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VNPAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String SUCCESS_CODE = "00";
    private static final String CANCELLED_CODE = "24";
    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final BookingService bookingService;
    private final RestClient restClient;
    private final String payUrl;
    private final String apiUrl;
    private final String returnUrl;
    private final String ipnUrl;
    private final String tmnCode;
    private final String hashSecret;

    public VnpayPaymentServiceImpl(
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            CurrentUserService currentUserService,
            BookingService bookingService,
            RestClient.Builder restClientBuilder,
            @Value("${autowash.payment.vnpay.pay-url}") String payUrl,
            @Value("${autowash.payment.vnpay.api-url}") String apiUrl,
            @Value("${autowash.payment.vnpay.return-url}") String returnUrl,
            @Value("${autowash.payment.vnpay.ipn-url}") String ipnUrl,
            @Value("${autowash.payment.vnpay.tmn-code}") String tmnCode,
            @Value("${autowash.payment.vnpay.hash-secret}") String hashSecret
    ) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
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
    public VnpayCheckoutResponse createCheckout(UUID bookingId, String ipAddress) {
        ensureCheckoutConfigured();
        User customer = currentUserService.getCurrentUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (!booking.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Booking does not belong to current customer", ErrorCode.FORBIDDEN);
        }

        Payment payment = paymentRepository.findByBooking(booking)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking payment not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking is already paid", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        if (booking.getStatus().name().equals("CANCELLED")) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Cancelled booking cannot be paid", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        ensurePaymentHoldOpen(booking, payment);

        long amount = booking.getPricing().getFinalAmount();
        LocalDateTime createDate = LocalDateTime.ofInstant(Instant.now(), VNPAY_ZONE);
        String createDateText = createDate.format(VNPAY_DATE_FORMAT);
        String txnRef = newPaymentTxnRef(booking.getId(), createDateText);

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", String.valueOf(amount * 100));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan booking " + booking.getId());
        params.put("vnp_OrderType", "billpayment");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", normalizeIp(ipAddress));
        params.put("vnp_CreateDate", createDateText);
        params.put("vnp_ExpireDate", createDate.plusMinutes(15).format(VNPAY_DATE_FORMAT));
        payment.prepareOnlinePayment(amount, pendingTransactionRef(txnRef, createDateText));

        String query = buildQuery(params);
        String secureHash = hmacSha512(buildQuery(params), hashSecret);
        String paymentUrl = payUrl + "?" + query + "&vnp_SecureHash=" + secureHash;
        return new VnpayCheckoutResponse(booking.getId().toString(), txnRef, amount, paymentUrl);
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

    @Override
    @Transactional
    public VnpayPaymentResultResponse queryTransaction(UUID bookingId, String ipAddress) {
        ensureApiConfigured();
        Booking booking = requireVisibleBooking(bookingId);
        Payment payment = paymentRepository.findByBooking(booking)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking payment not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (payment.getMethod() != PaymentMethod.E_WALLET) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking is not a VNPay payment", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        Map<String, String> request = new LinkedHashMap<>();
        String requestId = newRequestId();
        String createDate = nowVnpay();
        String txnDate = resolveVnpayCreateDate(payment);
        String txnRef = resolveVnpayTxnRef(booking, payment);
        request.put("vnp_RequestId", requestId);
        request.put("vnp_Version", "2.1.0");
        request.put("vnp_Command", "querydr");
        request.put("vnp_TmnCode", tmnCode);
        request.put("vnp_TxnRef", txnRef);
        request.put("vnp_OrderInfo", "Query booking " + booking.getId());
        request.put("vnp_TransactionDate", txnDate);
        request.put("vnp_CreateDate", createDate);
        request.put("vnp_IpAddr", normalizeIp(ipAddress));
        request.put("vnp_SecureHash", hmacSha512(pipe(
                requestId,
                "2.1.0",
                "querydr",
                tmnCode,
                txnRef,
                txnDate,
                createDate,
                normalizeIp(ipAddress),
                "Query booking " + booking.getId()
        ), hashSecret));

        Map<String, String> response = postVnpayApi(request);
        if (!validApiResponseHash(response)) {
            return new VnpayPaymentResultResponse(false, false, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Invalid VNPay query signature");
        }
        return applyGatewayStatus(booking, payment, response, "VNPay query synced");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public VnpayPaymentResultResponse refund(UUID bookingId, Long amount, String createdBy, String ipAddress) {
        ensureApiConfigured();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
        Payment payment = paymentRepository.findByBooking(booking)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking payment not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (payment.getMethod() != PaymentMethod.E_WALLET || payment.getStatus() != PaymentStatus.PAID) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Only paid VNPay payments can be refunded", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        long refundAmount = amount == null ? payment.getAmount() : amount;
        if (refundAmount <= 0 || refundAmount > payment.getAmount()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid refund amount", ErrorCode.INVALID_INPUT);
        }

        String transactionNo = resolveVnpayTransactionNo(payment);
        String requestId = newRequestId();
        String createDate = nowVnpay();
        String transactionDate = payment.getPaidAt() == null ? formatInstant(payment.getCreatedAt()) : formatInstant(payment.getPaidAt());
        String operator = createdBy == null || createdBy.isBlank() ? currentUserService.getCurrentUser().getEmail() : createdBy.trim();
        String transactionType = refundAmount == payment.getAmount() ? "02" : "03";
        String orderInfo = "Refund booking " + booking.getId();

        Map<String, String> request = new LinkedHashMap<>();
        request.put("vnp_RequestId", requestId);
        request.put("vnp_Version", "2.1.0");
        request.put("vnp_Command", "refund");
        request.put("vnp_TmnCode", tmnCode);
        request.put("vnp_TransactionType", transactionType);
        request.put("vnp_TxnRef", booking.getId().toString());
        request.put("vnp_Amount", String.valueOf(refundAmount * 100));
        request.put("vnp_TransactionNo", transactionNo);
        request.put("vnp_TransactionDate", transactionDate);
        request.put("vnp_CreateBy", operator);
        request.put("vnp_CreateDate", createDate);
        request.put("vnp_IpAddr", normalizeIp(ipAddress));
        request.put("vnp_OrderInfo", orderInfo);
        request.put("vnp_SecureHash", hmacSha512(pipe(
                requestId,
                "2.1.0",
                "refund",
                tmnCode,
                transactionType,
                booking.getId().toString(),
                String.valueOf(refundAmount * 100),
                transactionNo,
                transactionDate,
                operator,
                createDate,
                normalizeIp(ipAddress),
                orderInfo
        ), hashSecret));

        payment.markRefundPending();
        Map<String, String> response = postVnpayApi(request);
        if (!validApiResponseHash(response)) {
            payment.markRefundFailed();
            return new VnpayPaymentResultResponse(false, false, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "Invalid VNPay refund signature");
        }
        if (SUCCESS_CODE.equals(response.get("vnp_ResponseCode"))) {
            payment.markRefunded(refundAmount < payment.getAmount());
            return new VnpayPaymentResultResponse(true, true, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "VNPay refund accepted");
        }
        payment.markRefundFailed();
        return new VnpayPaymentResultResponse(true, false, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), "VNPay refund rejected");
    }

    private VnpayPaymentResultResponse verifyReturnOnly(Map<String, String> rawParams) {
        ensureCheckoutConfigured();
        Map<String, String> params = new TreeMap<>(rawParams);
        String receivedHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        if (receivedHash == null || receivedHash.isBlank()) {
            return failure(false, params, "Missing secure hash");
        }

        String expectedHash = hmacSha512(buildQuery(params), hashSecret);
        boolean validSignature = expectedHash.equalsIgnoreCase(receivedHash);
        if (!validSignature) {
            return failure(false, params, "Invalid secure hash");
        }

        UUID bookingId;
        try {
            bookingId = parseTxnRef(params.get("vnp_TxnRef"));
        } catch (ApiException exception) {
            return failure(true, params, "Invalid VNPay transaction reference");
        }

        boolean success = isSuccess(params);
        return new VnpayPaymentResultResponse(
                true,
                success,
                bookingId.toString(),
                params.get("vnp_ResponseCode"),
                params.get("vnp_TransactionStatus"),
                resolveTransactionRef(params),
                success ? "Payment successful. Waiting for IPN confirmation." : describeVnpayFailure(params)
        );
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

        UUID bookingId = parseTxnRef(params.get("vnp_TxnRef"));
        Optional<Payment> paymentOpt = paymentRepository.findByBookingId(bookingId);
        if (paymentOpt.isEmpty()) {
            return new VnpayIpnResponse("01", "Order not Found");
        }

        Payment payment = paymentOpt.get();
        long returnedAmount = parseLong(params.get("vnp_Amount")) / 100;
        if (returnedAmount != payment.getAmount()) {
            return new VnpayIpnResponse("04", "Invalid Amount");
        }

        if (payment.getStatus() == PaymentStatus.PAID) {
            return new VnpayIpnResponse("02", "Order already confirmed");
        }

        if (isSuccess(params)) {
            bookingService.markBookingPaidForOperations(bookingId.toString(), resolveTransactionRef(params));
        } else if (CANCELLED_CODE.equals(params.get("vnp_ResponseCode"))) {
            payment.markCancelled();
        } else {
            payment.markFailed();
        }
        return new VnpayIpnResponse("00", "Confirm Success");
    }

    private VnpayPaymentResultResponse applyGatewayStatus(Booking booking, Payment payment, Map<String, String> response, String successMessage) {
        boolean success = isSuccess(response);
        if (success) {
            bookingService.markBookingPaidForOperations(booking.getId().toString(), resolveTransactionRef(response));
            return new VnpayPaymentResultResponse(true, true, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), successMessage);
        }
        if (CANCELLED_CODE.equals(response.get("vnp_ResponseCode"))) {
            payment.markCancelled();
        } else {
            payment.markFailed();
        }
        return new VnpayPaymentResultResponse(true, false, booking.getId().toString(), response.get("vnp_ResponseCode"), response.get("vnp_TransactionStatus"), response.get("vnp_TransactionNo"), describeVnpayFailure(response));
    }

    private Booking requireVisibleBooking(UUID bookingId) {
        User user = currentUserService.getCurrentUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() == UserRole.CUSTOMER && !booking.getCustomer().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Booking does not belong to current customer", ErrorCode.FORBIDDEN);
        }
        return booking;
    }

    private void ensurePaymentHoldOpen(Booking booking, Payment payment) {
        if (!booking.getStatus().name().equals("PENDING") || payment.getStatus() == PaymentStatus.PAID) {
            return;
        }
        Instant expiresAt = booking.getCreatedAt().plus(PENDING_BOOKING_HOLD_DURATION);
        if (!expiresAt.isAfter(Instant.now())) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "Online payment window expired. Please create a new booking.",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
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
        Map<String, String> fields = new TreeMap<>(response);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        String command = response.get("vnp_Command");
        String data;
        if ("querydr".equalsIgnoreCase(command)) {
            data = pipe(
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
        } else if ("refund".equalsIgnoreCase(command)) {
            data = pipe(
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
                    response.get("vnp_OrderInfo")
            );
        } else {
            return hmacSha512(buildQuery(fields), hashSecret).equalsIgnoreCase(secureHash);
        }
        return hmacSha512(data, hashSecret).equalsIgnoreCase(secureHash);
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

    private UUID parseTxnRef(String txnRef) {
        String raw = txnRef == null ? "" : txnRef.trim();
        if (raw.length() >= 36) {
            String bookingIdPart = raw.substring(0, 36);
            try {
                return UUID.fromString(bookingIdPart);
            } catch (RuntimeException ignored) {
            }
        }
        try {
            return UUID.fromString(raw);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid VNPay transaction reference", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (RuntimeException exception) {
            return -1L;
        }
    }

    private boolean isSuccess(Map<String, String> params) {
        return SUCCESS_CODE.equals(params.get("vnp_ResponseCode"))
                && SUCCESS_CODE.equals(params.getOrDefault("vnp_TransactionStatus", params.get("vnp_ResponseCode")));
    }

    private String describeVnpayFailure(Map<String, String> params) {
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        if (transactionStatus != null && !transactionStatus.isBlank() && !SUCCESS_CODE.equals(transactionStatus)) {
            String statusMessage = responseCodeMessage(transactionStatus);
            if (transactionStatus.equals(responseCode)) {
                return statusMessage;
            }
            return statusMessage + " VNPay response code: " + safeVnpayCode(responseCode) + ". Transaction status: " + transactionStatus + ".";
        }
        return responseCodeMessage(responseCode);
    }

    private String responseCodeMessage(String code) {
        if (code == null || code.isBlank()) {
            return "VNPay did not return a response code.";
        }
        return switch (code) {
            case "00" -> "VNPay approved the payment.";
            case "01" -> "VNPay transaction has not been completed.";
            case "02" -> "VNPay transaction failed.";
            case "04" -> "VNPay transaction was reversed.";
            case "05" -> "VNPay is processing the transaction.";
            case "06" -> "VNPay sent a refund request.";
            case "07" -> "VNPay flagged the transaction as suspicious.";
            case "09" -> "The card or account is not registered for Internet Banking.";
            case "10" -> "Card or account authentication failed too many times.";
            case "11" -> "The payment session expired.";
            case "12" -> "The card or account is locked or not active.";
            case "13" -> "The OTP was incorrect.";
            case "24" -> "The payment was cancelled.";
            case "51" -> "The card or account has insufficient funds.";
            case "65" -> "The transaction exceeded the allowed limit.";
            case "75" -> "The bank is temporarily under maintenance.";
            case "79" -> "The payment password was entered incorrectly too many times.";
            case "99" -> "VNPay returned an unknown payment error.";
            default -> "VNPay rejected the transaction with response code " + code + ".";
        };
    }

    private String transactionStatusMessage(String status) {
        if (status == null || status.isBlank()) {
            return "missing";
        }
        return switch (status) {
            case "00" -> "successful";
            case "01" -> "not completed";
            case "02" -> "failed";
            case "04" -> "reversed";
            case "05" -> "processing";
            case "06" -> "refund request sent";
            case "07" -> "suspected fraud";
            case "09" -> "refund rejected";
            case "10" -> "authentication failed too many times";
            case "11" -> "payment session expired";
            case "12" -> "card or account locked or inactive";
            case "13" -> "incorrect OTP";
            case "24" -> "cancelled";
            case "51" -> "insufficient funds";
            case "65" -> "limit exceeded";
            case "75" -> "bank maintenance";
            case "79" -> "payment password failed too many times";
            case "99" -> "unknown payment error";
            default -> "code " + status;
        };
    }

    private String safeVnpayCode(String code) {
        return code == null || code.isBlank() ? "missing" : code;
    }

    private String resolveTransactionRef(Map<String, String> params) {
        String transactionNo = params.get("vnp_TransactionNo");
        if (transactionNo != null && !transactionNo.isBlank()) {
            return "VNPAY-" + transactionNo;
        }
        return "VNPAY-" + params.get("vnp_TxnRef");
    }

    private String resolveVnpayTransactionNo(Payment payment) {
        String ref = payment.getTransactionRef();
        if (ref == null || ref.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VNPay transaction number is missing", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        return ref.startsWith("VNPAY-") ? ref.substring("VNPAY-".length()) : ref;
    }

    private String pendingTransactionRef(String txnRef, String createDate) {
        return "VNPAY-PENDING:" + txnRef + ":" + createDate;
    }

    private String newPaymentTxnRef(UUID bookingId, String createDate) {
        return bookingId + "-" + createDate + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String resolveVnpayTxnRef(Booking booking, Payment payment) {
        String ref = payment.getTransactionRef();
        if (ref != null && ref.startsWith("VNPAY-PENDING:")) {
            String[] parts = ref.split(":");
            if (parts.length == 3 && !parts[1].isBlank()) {
                return parts[1];
            }
        }
        return booking.getId().toString();
    }

    private String resolveVnpayCreateDate(Payment payment) {
        String ref = payment.getTransactionRef();
        if (ref != null && ref.startsWith("VNPAY-PENDING:")) {
            String[] parts = ref.split(":");
            if (parts.length == 3 && parts[2].length() == 14) {
                return parts[2];
            }
        }
        return formatInstant(payment.getCreatedAt());
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

    private String pipe(String... values) {
        String[] safeValues = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            safeValues[i] = values[i] == null ? "" : values[i];
        }
        return String.join("|", safeValues);
    }

    private String newRequestId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private String normalizeIp(String ipAddress) {
        return ipAddress == null || ipAddress.isBlank() ? "127.0.0.1" : ipAddress;
    }

    private String nowVnpay() {
        return LocalDateTime.ofInstant(Instant.now(), VNPAY_ZONE).format(VNPAY_DATE_FORMAT);
    }

    private String formatInstant(Instant instant) {
        return LocalDateTime.ofInstant(instant == null ? Instant.now() : instant, VNPAY_ZONE).format(VNPAY_DATE_FORMAT);
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
