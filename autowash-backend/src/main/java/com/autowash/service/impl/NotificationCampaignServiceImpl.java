package com.autowash.service.impl;

import com.autowash.dto.NotificationCampaignRequest;
import com.autowash.dto.NotificationCampaignResponse;
import com.autowash.entity.NotificationCampaign;
import com.autowash.entity.enums.CampaignStatus;
import com.autowash.repository.NotificationCampaignRepository;
import com.autowash.service.NotificationCampaignProcessor;
import com.autowash.service.NotificationCampaignService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationCampaignServiceImpl implements NotificationCampaignService {

    private final NotificationCampaignRepository campaignRepository;
    private final NotificationCampaignProcessor campaignProcessor;

    @Override
    @Transactional
    public NotificationCampaignResponse createCampaign(NotificationCampaignRequest request) {
        Instant now = Instant.now();
        CampaignStatus initialStatus = request.scheduledAt() != null && request.scheduledAt().isAfter(now)
                ? CampaignStatus.SCHEDULED
                : CampaignStatus.DRAFT;

        NotificationCampaign campaign = NotificationCampaign.builder()
                .id(UUID.randomUUID())
                .title(request.title())
                .message(request.message())
                .type(request.type())
                .targetAudience(request.targetAudience())
                .targetDetails(request.targetDetails())
                .status(initialStatus)
                .scheduledAt(request.scheduledAt())
                .createdAt(now)
                .updatedAt(now)
                .successCount(0)
                .failedCount(0)
                .build();

        campaign = campaignRepository.save(campaign);

        // If it's not scheduled for later, process it immediately
        if (initialStatus == CampaignStatus.DRAFT) {
            campaignProcessor.processCampaign(campaign);
        }

        return mapToResponse(campaign);
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignPage getCampaigns(int page, int limit) {
        Page<NotificationCampaign> campaignsPage = campaignRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, limit));
        List<NotificationCampaignResponse> responses = campaignsPage.getContent().stream()
                .map(this::mapToResponse)
                .toList();

        return new CampaignPage(responses, campaignsPage.getTotalPages(), campaignsPage.getTotalElements());
    }

    private NotificationCampaignResponse mapToResponse(NotificationCampaign campaign) {
        return NotificationCampaignResponse.builder()
                .id(campaign.getId())
                .title(campaign.getTitle())
                .message(campaign.getMessage())
                .type(campaign.getType())
                .targetAudience(campaign.getTargetAudience())
                .targetDetails(campaign.getTargetDetails())
                .status(campaign.getStatus())
                .scheduledAt(campaign.getScheduledAt())
                .sentAt(campaign.getSentAt())
                .successCount(campaign.getSuccessCount())
                .failedCount(campaign.getFailedCount())
                .createdAt(campaign.getCreatedAt())
                .build();
    }
}
