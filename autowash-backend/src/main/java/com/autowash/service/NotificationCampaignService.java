package com.autowash.service;

import com.autowash.dto.NotificationCampaignRequest;
import com.autowash.dto.NotificationCampaignResponse;
import java.util.List;

public interface NotificationCampaignService {
    NotificationCampaignResponse createCampaign(NotificationCampaignRequest request);

    CampaignPage getCampaigns(int page, int limit);

    record CampaignPage(List<NotificationCampaignResponse> content, int totalPages, long totalElements) {}
}
