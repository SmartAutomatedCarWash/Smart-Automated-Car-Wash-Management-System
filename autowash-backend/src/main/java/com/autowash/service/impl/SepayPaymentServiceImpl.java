package com.autowash.service.impl;

import com.autowash.entity.Payment;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.PaymentRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CustomerComboService;
import com.autowash.service.SepayPaymentService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SepayPaymentServiceImpl implements SepayPaymentService {

    private static final Duration MAX_SIGNATURE_DRIFT = Duration.ofMinutes(5);
    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);

    private final ObjectMapper objectMapper;
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final CustomerComboService customerComboService;
    private final String webhookSecret;
    private final String paymentCodePrefix;

    public SepayPaymentServiceImpl(
            ObjectMapper objectMapper,
            PaymentRepository paymentRepository,
            BookingService bookingService,
            CustomerComboService customerComboService,
            @Value("${autowash.payment.sepay.webhook-secret:}") String webhookSecret,
            @Value("${autowash.payment.sepay.payment-code-prefix:AU}") String paymentCodePrefix
    ) {
        this.objectMapper = objectMapper;
        this.paymentRepository = paymentRepository;
        this.bookingService = bookingService;
        this.customerComboService = customerComboService;
        this.webhookSecret = webhookSecret;
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

        if (!"in".equalsIgnoreCase(firstText(payload, "transferType", "transfer_type"))) {
            return;
        }

        String paymentCode = resolvePaymentCode(payload);
        if (paymentCode == null) {
            return;
        }

        Payment payment = paymentRepository.findByTransactionRef(paymentCode).orElse(null);
        long transferAmount = amountIn(payload);
        if (payment != null && payment.getMethod() == PaymentMethod.BANK_TRANSFER) {
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
            if (transferAmount < payment.getAmount()) {
                return;
            }
            bookingService.markBookingPaidForOperations(payment.getBooking().getId().toString(), paymentCode);
            return;
        }

        customerComboService.markPendingPaymentAsPaid(paymentCode);
    }

    private void ensureConfigured() {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SePay webhook secret is not configured", "SEPAY_NOT_CONFIGURED");
        }
    }

    private long amountIn(JsonNode transaction) {
        if (transaction.hasNonNull("transferAmount")) {
            return transaction.path("transferAmount").asLong(0);
        }
        return transaction.path("amount_in").asLong(0);
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
