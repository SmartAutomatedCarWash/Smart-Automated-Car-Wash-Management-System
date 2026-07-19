package com.autowash.repository;

import com.autowash.entity.enums.ActiveStatus;

import com.autowash.entity.Combo;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComboRepository extends JpaRepository<Combo, UUID> {
    List<Combo> findByStatusOrderByIdAsc(ActiveStatus status);

    default List<Combo> findByActiveTrueOrderByIdAsc() {
        return findByStatusOrderByIdAsc(ActiveStatus.ACTIVE);
    }

    default Optional<Combo> findById(String id) {
        return parseUuid(id).flatMap(this::findById);
    }

    default Optional<Combo> findByIdAndActiveTrue(String id) {
        return findById(id).filter(c -> c.getStatus() == ActiveStatus.ACTIVE);
    }

    private static Optional<UUID> parseUuid(String id) {
        try {
            return id == null || id.isBlank() ? Optional.empty() : Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
