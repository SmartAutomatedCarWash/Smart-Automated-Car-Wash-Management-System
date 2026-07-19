package com.autowash.repository;

import com.autowash.entity.NotificationCampaign;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationCampaignRepository extends JpaRepository<NotificationCampaign, UUID> {
    Page<NotificationCampaign> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
