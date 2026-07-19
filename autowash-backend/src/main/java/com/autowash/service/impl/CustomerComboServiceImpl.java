package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.util.List;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import com.autowash.entity.User;
import com.autowash.dto.CustomerComboResponse;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerComboServiceImpl implements CustomerComboService {

    private final CustomerComboRepository customerComboRepository;
    private final CustomerComboUsageRepository customerComboUsageRepository;
    private final ComboRepository ComboRepository;
    private final BookingRepository bookingRepository;

    public CustomerComboServiceImpl(
            CustomerComboRepository customerComboRepository,
            CustomerComboUsageRepository customerComboUsageRepository,
            ComboRepository ComboRepository,
            BookingRepository bookingRepository
    ) {
        this.customerComboRepository = customerComboRepository;
        this.customerComboUsageRepository = customerComboUsageRepository;
        this.ComboRepository = ComboRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerComboResponse> listActiveCustomerCombos(User customer) {
        Instant now = Instant.now();
        return customerComboRepository.findByCustomer_IdAndStatusAndExpiresAtAfter(customer.getId(), CustomerComboStatus.ACTIVE, now)
                .stream()
                .map(this::toResponse)
                .toList();
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
        Combo combo = ComboRepository.findByIdAndActiveTrue(request.comboId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Combo is not available",
                        ErrorCode.BUSINESS_RULE_VIOLATION
                ));

        Instant now = Instant.now();
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
        owned = customerComboRepository.save(owned);

        return new PurchaseCustomerComboResponse(
                owned.getId().toString(),
                combo.getId().toString(),
                combo.getName(),
                combo.getPrice(),
                request.paymentMethod(),
                "COMPLETED",
                owned.getTotalUsages(),
                owned.getRemainingUsages(),
                owned.getActivatedAt(),
                owned.getExpiresAt(),
                now
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
                combo.getActivatedAt(),
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
}


