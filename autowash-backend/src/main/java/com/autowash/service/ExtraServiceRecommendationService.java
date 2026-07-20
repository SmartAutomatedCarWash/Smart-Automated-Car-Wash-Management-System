package com.autowash.service;

import com.autowash.dto.ExtraServiceRecommendationResponse;
import java.util.List;

public interface ExtraServiceRecommendationService {
    List<ExtraServiceRecommendationResponse> recommendForCombo(String comboId);
}
