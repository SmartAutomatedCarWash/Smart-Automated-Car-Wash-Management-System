package com.autowash.repository;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.Package;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PackageRepository extends JpaRepository<Package, UUID> {
    Page<Package> findByStatusOrderByIdAsc(ActiveStatus status, Pageable pageable);

    @Query("""
            select pkg from Package pkg
            where (:#{#status == null} = true or pkg.status = :status)
            """)
    Page<Package> searchAdmin(@Param("status") ActiveStatus status, Pageable pageable);

    default Optional<Package> findById(String id) {
        return parseUuid(id).flatMap(this::findById);
    }

    private static Optional<UUID> parseUuid(String id) {
        try {
            return id == null || id.isBlank() ? Optional.empty() : Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}

