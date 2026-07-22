package com.autowash.repository;

import com.autowash.entity.Notification;

import com.autowash.entity.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    long countByUserAndReadFalse(User user);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Notification n WHERE n.campaign.id = :campaignId")
    void deleteByCampaignId(@org.springframework.data.repository.query.Param("campaignId") UUID campaignId);

    List<Notification> findTop20ByOrderByCreatedAtDesc();
}
