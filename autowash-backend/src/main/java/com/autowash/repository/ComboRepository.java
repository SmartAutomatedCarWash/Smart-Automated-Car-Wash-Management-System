package com.autowash.repository;

import com.autowash.entity.enums.ActiveStatus;

import com.autowash.entity.Combo;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComboRepository extends JpaRepository<Combo, UUID> {
    List<Combo> findByStatusOrderByIdAsc(ActiveStatus status);

    @Query("""
            select combo from Combo combo
            where (:#{#status == null} = true or combo.status = :status)
            """)
    Page<Combo> searchAdmin(@Param("status") ActiveStatus status, Pageable pageable);

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
