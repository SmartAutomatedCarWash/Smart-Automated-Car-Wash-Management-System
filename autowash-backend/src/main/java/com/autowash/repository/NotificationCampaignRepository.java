package com.autowash.repository;

import com.autowash.entity.NotificationCampaign;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.autowash.entity.enums.CampaignStatus;
import com.autowash.entity.enums.CampaignTargetAudience;
import com.autowash.entity.enums.NotificationType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationCampaignRepository extends JpaRepository<NotificationCampaign, UUID> {
    Page<NotificationCampaign> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT c FROM NotificationCampaign c
            WHERE (:#{#type == null} = true OR c.type = :type)
              AND (:#{#audience == null} = true OR c.targetAudience = :audience)
              AND (:#{#status == null} = true OR c.status = :status)
            ORDER BY c.createdAt DESC
            """)
    Page<NotificationCampaign> searchCampaigns(
            @Param("type") NotificationType type,
            @Param("audience") CampaignTargetAudience audience,
            @Param("status") CampaignStatus status,
            Pageable pageable
    );
}
