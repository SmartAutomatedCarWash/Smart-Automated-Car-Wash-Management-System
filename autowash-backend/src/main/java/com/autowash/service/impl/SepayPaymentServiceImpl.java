package com.autowash.service.impl;

import com.autowash.dto.SepayPaymentResultResponse;
import com.autowash.entity.Booking;
import com.autowash.entity.Payment;
import com.autowash.entity.User;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.SepayPaymentService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class SepayPaymentServiceImpl implements SepayPaymentService {

    private static final Duration MAX_SIGNATURE_DRIFT = Duration.ofMinutes(5);
    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);

    private final ObjectMapper objectMapper;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final BookingService bookingService;
    private final RestClient restClient;
    private final String webhookSecret;
    private final String apiToken;
    private final String apiBaseUrl;
    private final String paymentCodePrefix;

    public SepayPaymentServiceImpl(
            ObjectMapper objectMapper,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            CurrentUserService currentUserService,
            BookingService bookingService,
            RestClient.Builder restClientBuilder,
            @Value("${autowash.payment.sepay.webhook-secret:}") String webhookSecret,
            @Value("${autowash.payment.sepay.api-token:}") String apiToken,
            @Value("${autowash.payment.sepay.api-base-url:https://userapi.sepay.vn/v2}") String apiBaseUrl,
            @Value("${autowash.payment.sepay.payment-code-prefix:AU}") String paymentCodePrefix
    ) {
        this.objectMapper = objectMapper;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
        this.restClient = restClientBuilder.build();
        this.webhookSecret = webhookSecret;
        this.apiToken = apiToken;
        this.apiBaseUrl = apiBaseUrl;
        this.paymentCodePrefix = paymentCodePrefix;
    }

    @Override
    @Transactional
    public void handleWebhook(byte[] rawBody, String signature, String timestamp) {
        ensureConfigured();
        verifySignature(rawBody, signature, timestamp);

        JsonNode payload;
        try {
            payload = objectMapper.readTree(rawBody);
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid SePay webhook payload", ErrorCode.INVALID_INPUT);
        }

        if (!"in".equalsIgnoreCase(text(payload, "transferType"))) {
            return;
        }

        String paymentCode = resolvePaymentCode(payload);
        if (paymentCode == null) {
            return;
        }

        Payment payment = paymentRepository.findByTransactionRef(paymentCode).orElse(null);
        if (payment == null || payment.getMethod() != PaymentMethod.BANK_TRANSFER) {
            return;
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }
        if (payment.getBooking().getStatus() == BookingStatus.CANCELLED
                || payment.getBooking().getStatus() == BookingStatus.NO_SHOW) {
            return;
        }
        if (payment.getBooking().getStatus() == BookingStatus.PENDING
                && !payment.getBooking().getCreatedAt().plus(PENDING_BOOKING_HOLD_DURATION).isAfter(Instant.now())) {
            return;
        }

        long transferAmount = payload.path("transferAmount").asLong(0);
        if (transferAmount < payment.getAmount()) {
            return;
        }

        bookingService.markBookingPaidForOperations(payment.getBooking().getId().toString(), paymentCode);
    }

    @Override
    @Transactional
    public SepayPaymentResultResponse queryTransaction(UUID bookingId) {
        ensureApiConfigured();
        Booking booking = requireVisibleBooking(bookingId);
        Payment payment = paymentRepository.findByBooking(booking)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking payment not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (payment.getMethod() != PaymentMethod.BANK_TRANSFER) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking is not a SePay payment", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        String paymentCode = normalizePaymentCode(payment.getTransactionRef());
        if (paymentCode == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "SePay payment code is missing", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            return new SepayPaymentResultResponse(true, booking.getId().toString(), paymentCode, payment.getAmount(), payment.getTransactionRef(), "SePay payment already synced.");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW) {
            return new SepayPaymentResultResponse(false, booking.getId().toString(), paymentCode, payment.getAmount(), null, "Booking cannot be paid.");
        }
        if (booking.getStatus() == BookingStatus.PENDING
                && !booking.getCreatedAt().plus(PENDING_BOOKING_HOLD_DURATION).isAfter(Instant.now())) {
            return new SepayPaymentResultResponse(false, booking.getId().toString(), paymentCode, payment.getAmount(), null, "Booking hold expired. Please create a new booking.");
        }

        JsonNode transaction = findMatchingTransaction(paymentCode, payment.getAmount());
        if (transaction == null) {
            return new SepayPaymentResultResponse(false, booking.getId().toString(), paymentCode, payment.getAmount(), null, "SePay has not found a matching incoming transfer yet.");
        }

        String transactionRef = resolveGatewayTransactionRef(transaction, paymentCode);
        bookingService.markBookingPaidForOperations(booking.getId().toString(), paymentCode);
        return new SepayPaymentResultResponse(true, booking.getId().toString(), paymentCode, amountIn(transaction), transactionRef, "SePay payment synced.");
    }

    private void ensureConfigured() {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SePay webhook secret is not configured", "SEPAY_NOT_CONFIGURED");
        }
    }

    private void ensureApiConfigured() {
        if (apiToken == null || apiToken.isBlank() || apiBaseUrl == null || apiBaseUrl.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SePay API token is not configured", "SEPAY_NOT_CONFIGURED");
        }
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

    private JsonNode findMatchingTransaction(String paymentCode, long expectedAmount) {
        JsonNode response = restClient.get()
                .uri(normalizedApiBaseUrl() + "/transactions?q=" + URLEncoder.encode(paymentCode, StandardCharsets.UTF_8))
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", "application/json")
                .retrieve()
                .body(JsonNode.class);
        JsonNode data = response == null ? null : response.get("data");
        if (data == null || !data.isArray()) {
            return null;
        }
        for (JsonNode transaction : data) {
            if (isMatchingIncomingTransfer(transaction, paymentCode, expectedAmount)) {
                return transaction;
            }
        }
        return null;
    }

    private boolean isMatchingIncomingTransfer(JsonNode transaction, String paymentCode, long expectedAmount) {
        String transferType = firstText(transaction, "transferType", "transfer_type");
        if (!"in".equalsIgnoreCase(transferType)) {
            return false;
        }
        if (amountIn(transaction) < expectedAmount) {
            return false;
        }
        String code = normalizePaymentCode(firstText(transaction, "code"));
        if (paymentCode.equals(code)) {
            return true;
        }
        String content = firstText(transaction, "content", "transaction_content");
        String description = firstText(transaction, "description");
        return paymentCode.equals(findPaymentCode(content)) || paymentCode.equals(findPaymentCode(description));
    }

    private long amountIn(JsonNode transaction) {
        if (transaction.hasNonNull("transferAmount")) {
            return transaction.path("transferAmount").asLong(0);
        }
        return transaction.path("amount_in").asLong(0);
    }

    private String resolveGatewayTransactionRef(JsonNode transaction, String paymentCode) {
        String reference = firstText(transaction, "referenceCode", "reference_number", "id");
        return reference == null || reference.isBlank() ? paymentCode : "SEPAY-" + reference;
    }

    private String normalizedApiBaseUrl() {
        String trimmed = apiBaseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private void verifySignature(byte[] rawBody, String signature, String timestamp) {
        if (signature == null || signature.isBlank() || timestamp == null || timestamp.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing SePay signature", ErrorCode.UNAUTHORIZED);
        }

        long signedAt;
        try {
            signedAt = Long.parseLong(timestamp.trim());
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid SePay timestamp", ErrorCode.UNAUTHORIZED);
        }
        long driftSeconds = Math.abs(Instant.now().getEpochSecond() - signedAt);
        if (driftSeconds > MAX_SIGNATURE_DRIFT.toSeconds()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Expired SePay webhook signature", ErrorCode.UNAUTHORIZED);
        }

        String expected = "sha256=" + hmacSha256(timestamp.trim(), rawBody);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.trim().getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid SePay signature", ErrorCode.UNAUTHORIZED);
        }
    }

    private String hmacSha256(String timestamp, byte[] rawBody) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            mac.update(timestamp.getBytes(StandardCharsets.UTF_8));
            mac.update((byte) '.');
            byte[] bytes = mac.doFinal(rawBody);
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot verify SePay signature", "SEPAY_SIGNATURE_FAILED");
        }
    }

    private String resolvePaymentCode(JsonNode payload) {
        String code = normalizePaymentCode(text(payload, "code"));
        if (code != null) {
            return code;
        }
        code = findPaymentCode(text(payload, "content"));
        if (code != null) {
            return code;
        }
        return findPaymentCode(text(payload, "description"));
    }

    private String normalizePaymentCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return normalized.matches(Pattern.quote(normalizedPrefix()) + "\\d{8}") ? normalized : null;
    }

    private String findPaymentCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile("\\b" + Pattern.quote(normalizedPrefix()) + "\\d{8}\\b", Pattern.CASE_INSENSITIVE)
                .matcher(value);
        return matcher.find() ? matcher.group().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizedPrefix() {
        return paymentCodePrefix == null || paymentCodePrefix.isBlank()
                ? "AU"
                : paymentCodePrefix.trim().toUpperCase(Locale.ROOT);
    }

    private String text(JsonNode payload, String field) {
        JsonNode node = payload.get(field);
        return node == null || node.isNull() ? null : node.asText();
    }

    private String firstText(JsonNode payload, String... fields) {
        for (String field : fields) {
            String value = text(payload, field);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
