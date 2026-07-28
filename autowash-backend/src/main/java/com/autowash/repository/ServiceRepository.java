package com.autowash.repository;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.Service;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<Service, UUID> {
    List<Service> findByStatusOrderByIdAsc(ActiveStatus status);
    Optional<Service> findByIdAndStatus(UUID id, ActiveStatus status);

    @Query("""
            select service from Service service
            where (:#{#status == null} = true or service.status = :status)
            """)
    Page<Service> searchAdmin(@Param("status") ActiveStatus status, Pageable pageable);
}
