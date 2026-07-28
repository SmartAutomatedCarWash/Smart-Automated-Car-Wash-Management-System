package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.util.List;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;
import com.autowash.entity.User;
import com.autowash.dto.CustomerComboResponse;
import com.autowash.dto.CustomerComboPaymentStatusResponse;
import com.autowash.dto.PurchaseCustomerComboRequest;
import com.autowash.dto.PurchaseCustomerComboResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.enums.CustomerComboStatus;
import com.autowash.entity.CustomerComboUsage;
import com.autowash.repository.CustomerComboRepository;
import com.autowash.repository.CustomerComboUsageRepository;
import com.autowash.entity.Combo;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.BookingRepository;
import com.autowash.service.CustomerComboService;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ThreadLocalRandom;
import com.autowash.shared.dto.PaginationMeta;

@Service
public class CustomerComboServiceImpl implements CustomerComboService {

    private final CustomerComboRepository customerComboRepository;
    private final CustomerComboUsageRepository customerComboUsageRepository;
    private final ComboRepository ComboRepository;
    private final BookingRepository bookingRepository;
    private final String sepayBankCode;
    private final String sepayAccountNumber;
    private final String sepayAccountName;
    private final String sepayStoreName;
    private final String sepayVaCode;
    private final String sepayPaymentCodePrefix;

    public CustomerComboServiceImpl(
            CustomerComboRepository customerComboRepository,
            CustomerComboUsageRepository customerComboUsageRepository,
            ComboRepository ComboRepository,
            BookingRepository bookingRepository,
            @Value("${autowash.payment.sepay.bank-code:TPBank}") String sepayBankCode,
            @Value("${autowash.payment.sepay.account-number:}") String sepayAccountNumber,
            @Value("${autowash.payment.sepay.account-name:}") String sepayAccountName,
            @Value("${autowash.payment.sepay.store-name:Aura Car Wash}") String sepayStoreName,
            @Value("${autowash.payment.sepay.va-code:}") String sepayVaCode,
            @Value("${autowash.payment.sepay.payment-code-prefix:AU}") String sepayPaymentCodePrefix
    ) {
        this.customerComboRepository = customerComboRepository;
        this.customerComboUsageRepository = customerComboUsageRepository;
        this.ComboRepository = ComboRepository;
        this.bookingRepository = bookingRepository;
        this.sepayBankCode = sepayBankCode;
        this.sepayAccountNumber = sepayAccountNumber;
        this.sepayAccountName = sepayAccountName;
        this.sepayStoreName = sepayStoreName;
        this.sepayVaCode = sepayVaCode;
        this.sepayPaymentCodePrefix = sepayPaymentCodePrefix;
    }

    @Transactional(readOnly = true)
    public List<CustomerComboResponse> listActiveCustomerCombos(User customer) {
        Instant now = Instant.now();
        return customerComboRepository.findByCustomer_IdAndStatusAndExpiresAtAfter(customer.getId(), CustomerComboStatus.ACTIVE, now)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerComboService.CustomerComboPage listCustomerCombos(User customer, int page, int limit) {
        Page<CustomerCombo> combos = customerComboRepository.findByCustomer_IdOrderByCreatedAtDesc(
                customer.getId(),
                PageRequest.of(Math.max(page - 1, 0), limit)
        );

        List<CustomerComboResponse> items = combos.getContent().stream()
                .map(this::toResponse)
                .toList();

        PaginationMeta pagination = new PaginationMeta(
                combos.getNumber() + 1,
                combos.getSize(),
                combos.getTotalElements(),
                combos.getTotalPages(),
                combos.hasNext()
        );
        return new CustomerComboService.CustomerComboPage(items, pagination);
    }

    @Transactional
    public CustomerCombo findActiveOwnedCombo(User customer, String comboId) {
        UUID comboUuid = UUID.fromString(comboId);
        CustomerCombo combo = customerComboRepository
                .findFirstByCustomer_IdAndComboIdAndStatusOrderByCreatedAtDesc(customer.getId(), comboUuid, CustomerComboStatus.ACTIVE)
                .orElse(null);
        if (combo == null) {
            return null;
        }
        if (combo.isExpired()) {
            combo.markExpired();
            return null;
        }
        if (!combo.hasRemainingUsages()) {
            combo.consumeUsage();
            return null;
        }
        return combo;
    }

    @Transactional
    public CustomerCombo createOwnedCombo(User customer, String comboId, String purchaseBookingId) {
        Combo Combo = ComboRepository.findByIdAndActiveTrue(comboId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", ErrorCode.BUSINESS_RULE_VIOLATION));

        CustomerCombo combo = new CustomerCombo(
                UUID.randomUUID(),
                customer,
                Combo.getId(),
                Math.max(Combo.getMaxUsages() == null ? 0 : Combo.getMaxUsages(), 1),
                Instant.now(),
                expiresAt(Instant.now(), Combo)
        );
        return customerComboRepository.save(combo);
    }

    @Transactional
    public PurchaseCustomerComboResponse purchaseCombo(User customer, PurchaseCustomerComboRequest request) {
        if (request.paymentMethod() == PaymentMethod.CASH_AT_COUNTER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Combo purchases require online payment confirmation",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }

        List<String> requestedComboIds = normalizeComboIds(request);
        List<Combo> combos = requestedComboIds.stream()
                .map(comboId -> ComboRepository.findByIdAndActiveTrue(comboId)
                        .orElseThrow(() -> new ApiException(
                                HttpStatus.UNPROCESSABLE_ENTITY,
                                "Combo is not available",
                                ErrorCode.BUSINESS_RULE_VIOLATION
                        )))
                .toList();

        if (combos.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", ErrorCode.BUSINESS_RULE_VIOLATION);
        }

        Instant now = Instant.now();
        String transactionRef = generateComboTransferCode();
        long totalAmount = combos.stream()
                .mapToLong(Combo::getPrice)
                .sum();
        PurchaseCustomerComboResponse.Payment payment = buildPaymentResponse(transactionRef, totalAmount, request.paymentMethod(), true);

        CustomerCombo firstOwned = null;

        for (Combo combo : combos) {
            Instant expiresAt = expiresAt(now, combo);
            int totalUsages = Math.max(combo.getMaxUsages() == null ? 0 : combo.getMaxUsages(), 1);

            CustomerCombo owned = new CustomerCombo(
                    UUID.randomUUID(),
                    customer,
                    combo.getId(),
                    totalUsages,
                    now,
                    expiresAt
            );
            owned.markPendingPayment(
                    request.paymentMethod(),
                    transactionRef,
                    payment.qrUrl(),
                    payment.bankCode(),
                    payment.accountNumber(),
                    payment.accountName(),
                    payment.transferDescription()
            );
            owned = customerComboRepository.save(owned);
            if (firstOwned == null) {
                firstOwned = owned;
            }
        }

        if (firstOwned == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create combo purchase", ErrorCode.SYSTEM_ERROR);
        }

        return new PurchaseCustomerComboResponse(
                firstOwned.getId().toString(),
                firstOwned.getComboId().toString(),
                combos.get(0).getName(),
                totalAmount,
                request.paymentMethod(),
                PaymentStatus.PENDING_PAYMENT.name(),
                payment,
                firstOwned.getTotalUsages(),
                firstOwned.getRemainingUsages(),
                null,
                firstOwned.getExpiresAt(),
                now
        );
    }

    @Transactional(readOnly = true)
    public CustomerComboPaymentStatusResponse getPaymentStatus(User customer, String transactionRef) {
        String normalizedTransactionRef = normalizeTransactionRef(transactionRef);
        List<CustomerCombo> combos = customerComboRepository
                .findByCustomer_IdAndTransactionRefOrderByCreatedAtAsc(customer.getId(), normalizedTransactionRef);
        if (combos.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Combo payment not found", ErrorCode.RESOURCE_NOT_FOUND);
        }

        long amount = combos.stream()
                .map(CustomerCombo::getComboId)
                .map(ComboRepository::findById)
                .flatMap(java.util.Optional::stream)
                .mapToLong(Combo::getPrice)
                .sum();
        boolean allPaid = combos.stream().allMatch(combo -> combo.getPaymentStatus() == PaymentStatus.PAID);
        boolean allActive = combos.stream().allMatch(combo -> combo.getStatus() == CustomerComboStatus.ACTIVE);
        CustomerCombo firstCombo = combos.get(0);

        return new CustomerComboPaymentStatusResponse(
                normalizedTransactionRef,
                allPaid && allActive ? PaymentStatus.PAID.name() : PaymentStatus.PENDING_PAYMENT.name(),
                allActive ? CustomerComboStatus.ACTIVE.name() : firstCombo.getStatus().name(),
                combos.size(),
                amount,
                allPaid ? firstCombo.getActivatedAt() : null
        );
    }

    @Transactional
    public void recordUsage(CustomerCombo combo, String bookingId, LocalDate serviceDate) {
        UUID parsedBookingId = UUID.fromString(bookingId);
        if (customerComboUsageRepository.existsByBookingId(parsedBookingId)) {
            return;
        }
        combo.consumeUsage();
        customerComboUsageRepository.save(new CustomerComboUsage(combo, bookingRepository.findById(parsedBookingId).orElseThrow()));
    }

    @Transactional
    public void releaseUsageForBooking(String bookingId) {
        UUID parsedBookingId = UUID.fromString(bookingId);
        customerComboUsageRepository.findByBookingId(parsedBookingId).ifPresent(usage -> {
            customerComboRepository.findById(usage.getCustomerCombo().getId()).ifPresent(CustomerCombo::restoreUsage);
            customerComboUsageRepository.delete(usage);
        });
    }

    @Transactional
    public void markExpired(CustomerCombo combo) {
        combo.markExpired();
    }

    @Transactional
    public void markPendingPaymentAsPaid(String transactionRef) {
        activatePendingPayment(transactionRef, null);
    }

    @Transactional
    public boolean markPendingPaymentAsPaid(String transactionRef, long paidAmount) {
        return activatePendingPayment(transactionRef, paidAmount);
    }

    private boolean activatePendingPayment(String transactionRef, Long paidAmount) {
        if (transactionRef == null || transactionRef.isBlank()) {
            return false;
        }
        List<CustomerCombo> combos = customerComboRepository
                .findByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
                        transactionRef.trim().toUpperCase(),
                        PaymentStatus.PENDING_PAYMENT,
                        CustomerComboStatus.PENDING_PAYMENT
                );
        if (combos.isEmpty()) {
            return false;
        }

        long expectedAmount = combos.stream()
                .map(CustomerCombo::getComboId)
                .map(ComboRepository::findById)
                .flatMap(java.util.Optional::stream)
                .mapToLong(Combo::getPrice)
                .sum();
        if (paidAmount != null && paidAmount < expectedAmount) {
            return false;
        }
        for (CustomerCombo combo : combos) {
            Combo catalogCombo = ComboRepository.findById(combo.getComboId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Combo not found", ErrorCode.RESOURCE_NOT_FOUND));
            combo.markActivated(expiresAt(Instant.now(), catalogCombo));
        }
        return true;
    }

    private CustomerComboResponse toResponse(CustomerCombo combo) {
        String comboName = ComboRepository.findById(combo.getComboId())
                .map(Combo::getName)
                .orElse(combo.getComboId().toString());
        return new CustomerComboResponse(
                combo.getId().toString(),
                combo.getComboId().toString(),
                comboName,
                combo.getStatus().name(),
                combo.getTotalUsages(),
                combo.getRemainingUsages(),
                combo.getPaymentStatus() == null ? null : combo.getPaymentStatus().name(),
                combo.getTransactionRef(),
                combo.getActivatedAt(),
                combo.getCreatedAt(),
                combo.getExpiresAt(),
                customerComboUsageRepository.findFirstByCustomerComboIdOrderByUsedAtDesc(combo.getId())
                        .map(CustomerComboUsage::getUsedAt)
                        .orElse(null)
        );
    }

    private Instant expiresAt(Instant activatedAt, Combo combo) {
        int durationDays = combo.getDurationDays() == null ? 30 : combo.getDurationDays();
        return activatedAt.plusSeconds((long) durationDays * 24 * 60 * 60);
    }

    private PurchaseCustomerComboResponse.Payment buildPaymentResponse(String transactionId, long amount, PaymentMethod method, boolean pending) {
        String transferDescription = buildTransferDescription(method, transactionId);
        String qrUrl = buildQrUrl(method, amount, transferDescription);

        return new PurchaseCustomerComboResponse.Payment(
                method.name(),
                pending ? PaymentStatus.PENDING_PAYMENT.name() : PaymentStatus.PAID.name(),
                transactionId,
                pending ? null : Instant.now(),
                qrUrl,
                sepayField(sepayBankCode),
                sepayField(sepayAccountNumber),
                sepayField(sepayAccountName),
                transferDescription
        );
    }

    private List<String> normalizeComboIds(PurchaseCustomerComboRequest request) {
        List<String> comboIds = request.comboIds() == null || request.comboIds().isEmpty()
                ? List.of(request.comboId())
                : request.comboIds();

        List<String> normalizedIds = new ArrayList<>();
        for (String comboId : comboIds) {
            if (comboId == null || comboId.isBlank()) {
                continue;
            }
            try {
                UUID.fromString(comboId.trim());
                normalizedIds.add(comboId.trim());
            } catch (IllegalArgumentException exception) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid combo id", ErrorCode.INVALID_INPUT);
            }
        }

        if (normalizedIds.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", ErrorCode.BUSINESS_RULE_VIOLATION);
        }
        return normalizedIds;
    }

    private String normalizeTransactionRef(String transactionRef) {
        if (transactionRef == null || transactionRef.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Transaction reference is required", ErrorCode.INVALID_INPUT);
        }
        return transactionRef.trim().toUpperCase();
    }

    private String generateComboTransferCode() {
        String prefix = normalizedPaymentCodePrefix();
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = prefix + String.format("%08d", ThreadLocalRandom.current().nextInt(100_000_000));
            if (!customerComboRepository.findByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
                    code,
                    PaymentStatus.PENDING_PAYMENT,
                    CustomerComboStatus.PENDING_PAYMENT
            ).isEmpty()) {
                continue;
            }
            return code;
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to generate SePay payment code", ErrorCode.SYSTEM_ERROR);
    }

    private String normalizedPaymentCodePrefix() {
        return sepayPaymentCodePrefix == null || sepayPaymentCodePrefix.isBlank()
                ? "AU"
                : sepayPaymentCodePrefix.trim().toUpperCase();
    }

    private String buildTransferDescription(PaymentMethod method, String transactionId) {
        if (method != PaymentMethod.BANK_TRANSFER) {
            return null;
        }
        String code = transactionId == null ? "" : transactionId.trim().toUpperCase();
        if (sepayVaCode == null || sepayVaCode.isBlank()) {
            return code;
        }
        return "TKP" + sepayVaCode.trim().toUpperCase() + " " + code;
    }

    private String buildQrUrl(PaymentMethod method, long amount, String transferDescription) {
        if (method != PaymentMethod.BANK_TRANSFER || transferDescription == null || isBlank(sepayBankCode) || isBlank(sepayAccountNumber)) {
            return null;
        }
        StringBuilder url = new StringBuilder("https://vietqr.app/img?");
        appendQuery(url, "acc", sepayAccountNumber.trim());
        appendQuery(url, "bank", sepayBankCode.trim());
        appendQuery(url, "amount", String.valueOf(amount));
        appendQuery(url, "des", transferDescription);
        appendQuery(url, "template", "compact");
        appendQuery(url, "showinfo", "true");
        if (!isBlank(sepayAccountName)) {
            appendQuery(url, "holder", sepayAccountName.trim());
        }
        if (!isBlank(sepayStoreName)) {
            appendQuery(url, "store", sepayStoreName.trim());
        }
        return url.toString();
    }

    private void appendQuery(StringBuilder url, String key, String value) {
        if (url.charAt(url.length() - 1) != '?') {
            url.append('&');
        }
        url.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                .append('=')
                .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String sepayField(String value) {
        return isBlank(value) ? null : value.trim();
    }
}


