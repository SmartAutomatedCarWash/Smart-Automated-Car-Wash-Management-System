package com.autowash.service.impl;

import com.autowash.dto.NotificationCampaignRequest;
import com.autowash.dto.NotificationCampaignResponse;
import com.autowash.entity.NotificationCampaign;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.CampaignStatus;
import com.autowash.repository.NotificationCampaignRepository;
import com.autowash.service.NotificationCampaignProcessor;
import com.autowash.service.NotificationCampaignService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autowash.repository.NotificationRepository;

@Service
@RequiredArgsConstructor
public class NotificationCampaignServiceImpl implements NotificationCampaignService {
    private static final Set<NotificationType> ALLOWED_MANUAL_CAMPAIGN_TYPES = Set.of(
            NotificationType.SYSTEM,
            NotificationType.WARNING
    );

    private final NotificationCampaignRepository campaignRepository;
    private final NotificationCampaignProcessor campaignProcessor;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public NotificationCampaignResponse createCampaign(NotificationCampaignRequest request) {
        validateManualCampaignType(request.type());
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
    @Transactional
    public NotificationCampaignResponse updateCampaign(UUID id, NotificationCampaignRequest request) {
        validateManualCampaignType(request.type());
        NotificationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));

        if (campaign.getStatus() != CampaignStatus.DRAFT && campaign.getStatus() != CampaignStatus.SCHEDULED) {
            throw new RuntimeException("Only DRAFT or SCHEDULED campaigns can be updated");
        }

        Instant now = Instant.now();
        CampaignStatus newStatus = request.scheduledAt() != null && request.scheduledAt().isAfter(now)
                ? CampaignStatus.SCHEDULED
                : CampaignStatus.DRAFT;

        campaign.setTitle(request.title());
        campaign.setMessage(request.message());
        campaign.setType(request.type());
        campaign.setTargetAudience(request.targetAudience());
        campaign.setTargetDetails(request.targetDetails());
        campaign.setStatus(newStatus);
        campaign.setScheduledAt(request.scheduledAt());
        campaign.setUpdatedAt(now);

        campaign = campaignRepository.save(campaign);

        if (newStatus == CampaignStatus.DRAFT) {
            campaignProcessor.processCampaign(campaign);
        }

        return mapToResponse(campaign);
    }

    @Override
    @Transactional
    public void deleteCampaign(UUID id) {
        NotificationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found"));
                
        // For deleting, we just remove the associated notifications as well
        notificationRepository.deleteByCampaignId(campaign.getId());
        campaignRepository.delete(campaign);
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignPage getCampaigns(int page, int limit, com.autowash.entity.enums.NotificationType type, com.autowash.entity.enums.CampaignTargetAudience audience, com.autowash.entity.enums.CampaignStatus status) {
        Page<NotificationCampaign> campaignsPage = campaignRepository.searchCampaigns(type, audience, status, PageRequest.of(page - 1, limit));
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

    private void validateManualCampaignType(NotificationType type) {
        if (!ALLOWED_MANUAL_CAMPAIGN_TYPES.contains(type)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Campaign type must be SYSTEM or WARNING",
                    ErrorCode.VALIDATION_ERROR
            );
        }
    }
}
