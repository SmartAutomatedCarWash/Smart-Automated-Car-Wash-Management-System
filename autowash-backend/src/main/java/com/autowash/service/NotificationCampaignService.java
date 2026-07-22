package com.autowash.service;

import com.autowash.dto.NotificationCampaignRequest;
import com.autowash.dto.NotificationCampaignResponse;
import com.autowash.entity.enums.CampaignStatus;
import com.autowash.entity.enums.CampaignTargetAudience;
import com.autowash.entity.enums.NotificationType;
import java.util.List;
import java.util.UUID;

public interface NotificationCampaignService {
    NotificationCampaignResponse createCampaign(NotificationCampaignRequest request);
    
    NotificationCampaignResponse updateCampaign(UUID id, NotificationCampaignRequest request);
    
    void deleteCampaign(UUID id);

    CampaignPage getCampaigns(int page, int limit, NotificationType type, CampaignTargetAudience audience, CampaignStatus status);

    record CampaignPage(List<NotificationCampaignResponse> content, int totalPages, long totalElements) {}
}
