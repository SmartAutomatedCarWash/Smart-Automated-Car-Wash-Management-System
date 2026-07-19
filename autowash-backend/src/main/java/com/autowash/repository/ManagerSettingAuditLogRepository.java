package com.autowash.repository;

import com.autowash.entity.ManagerSettingAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManagerSettingAuditLogRepository extends JpaRepository<ManagerSettingAuditLog, UUID> {
    List<ManagerSettingAuditLog> findTop20ByOrderByCreatedAtDesc();
}
