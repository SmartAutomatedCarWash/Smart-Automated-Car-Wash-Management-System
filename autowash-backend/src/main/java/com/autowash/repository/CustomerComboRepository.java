package com.autowash.repository;

import com.autowash.entity.CustomerCombo;
import com.autowash.entity.enums.CustomerComboStatus;
import com.autowash.entity.enums.PaymentStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerComboRepository extends JpaRepository<CustomerCombo, UUID> {
    Optional<CustomerCombo> findFirstByCustomer_IdAndComboIdAndStatusOrderByCreatedAtDesc(
            UUID customerId,
            UUID comboId,
            CustomerComboStatus status
    );

    default Optional<CustomerCombo> findFirstByCustomer_IdAndComboIdAndStatusOrderByCreatedAtDesc(
            UUID customerId,
            String comboId,
            CustomerComboStatus status
    ) {
        return parseUuid(comboId)
                .flatMap(value -> findFirstByCustomer_IdAndComboIdAndStatusOrderByCreatedAtDesc(customerId, value, status));
    }

    List<CustomerCombo> findByCustomer_IdAndStatusAndExpiresAtAfter(
            UUID customerId,
            CustomerComboStatus status,
            Instant now
    );

    Page<CustomerCombo> findByCustomer_IdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    List<CustomerCombo> findByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
            String transactionRef,
            PaymentStatus paymentStatus,
            CustomerComboStatus status
    );

    List<CustomerCombo> findByTransactionRefOrderByCreatedAtAsc(String transactionRef);

    List<CustomerCombo> findByCustomer_IdAndTransactionRefOrderByCreatedAtAsc(UUID customerId, String transactionRef);

    Optional<CustomerCombo> findFirstByTransactionRefAndPaymentStatusAndStatusOrderByCreatedAtAsc(
            String transactionRef,
            PaymentStatus paymentStatus,
            CustomerComboStatus status
    );

    private static Optional<UUID> parseUuid(String id) {
        try {
            return id == null || id.isBlank() ? Optional.empty() : Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
