package com.autowash.service.impl;

import com.autowash.entity.Notification;

import com.autowash.repository.NotificationRepository;

import com.autowash.entity.NotificationCampaign;
import com.autowash.entity.User;
import com.autowash.entity.enums.CampaignStatus;
import com.autowash.repository.NotificationCampaignRepository;
import com.autowash.repository.UserRepository;
import com.autowash.service.NotificationCampaignProcessor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationCampaignProcessorImpl implements NotificationCampaignProcessor {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationCampaignRepository campaignRepository;

    @Async
    @Override
    @Transactional
    public void processCampaign(NotificationCampaign campaign) {
        log.info("Processing notification campaign: {}", campaign.getId());

        try {
            List<User> targetUsers = getTargetUsers(campaign);
            
            if (targetUsers.isEmpty()) {
                campaign.setStatus(CampaignStatus.COMPLETED);
                campaign.setSentAt(Instant.now());
                campaignRepository.save(campaign);
                log.info("Campaign {} completed with 0 targets.", campaign.getId());
                return;
            }

            campaign.setStatus(CampaignStatus.SENDING);
            campaignRepository.save(campaign);

            List<Notification> notifications = new ArrayList<>();
            for (User user : targetUsers) {
                Notification notification = Notification.builder()
                        .id(UUID.randomUUID())
                        .user(user)
                        .campaign(campaign)
                        .title(campaign.getTitle())
                        .message(campaign.getMessage())
                        .type(campaign.getType())
                        .read(false)
                        .createdAt(Instant.now())
                        .build();
                notifications.add(notification);
            }

            // In a very large scale system, we'd batch this (e.g. 500 at a time).
            // For now, saveAll will use Hibernate's batching if configured.
            notificationRepository.saveAll(notifications);

            campaign.setSuccessCount(notifications.size());
            campaign.setStatus(CampaignStatus.COMPLETED);
            campaign.setSentAt(Instant.now());
            campaignRepository.save(campaign);

            log.info("Campaign {} completed. Sent to {} users.", campaign.getId(), notifications.size());
        } catch (Exception e) {
            log.error("Failed to process campaign {}", campaign.getId(), e);
            campaign.setStatus(CampaignStatus.FAILED);
            campaignRepository.save(campaign);
        }
    }

    private List<User> getTargetUsers(NotificationCampaign campaign) {
        return switch (campaign.getTargetAudience()) {
            case ALL_CUSTOMERS -> userRepository.findAllActiveCustomers();
            case TIER_BRONZE -> userRepository.findActiveCustomersByLoyaltyTier("BRONZE");
            case TIER_SILVER -> userRepository.findActiveCustomersByLoyaltyTier("SILVER");
            case TIER_GOLD -> userRepository.findActiveCustomersByLoyaltyTier("GOLD");
            case TIER_PLATINUM -> userRepository.findActiveCustomersByLoyaltyTier("PLATINUM");
            case TIER_DIAMOND -> userRepository.findActiveCustomersByLoyaltyTier("DIAMOND");
            case INDIVIDUALS -> {
                if (campaign.getTargetDetails() == null || campaign.getTargetDetails().isBlank()) {
                    yield List.of();
                }
                String[] userIds = campaign.getTargetDetails().split(",");
                List<UUID> uuids = new ArrayList<>();
                for (String idStr : userIds) {
                    try {
                        uuids.add(UUID.fromString(idStr.trim()));
                    } catch (IllegalArgumentException ignored) {}
                }
                yield userRepository.findAllById(uuids);
            }
        };
    }
}
