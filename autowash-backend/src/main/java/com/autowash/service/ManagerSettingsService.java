package com.autowash.service;

import com.autowash.dto.ManagerSettingAuditLogResponse;
import com.autowash.dto.ManagerSettingsResponse;
import com.autowash.dto.UpdateManagerSettingsRequest;
import java.util.List;

public interface ManagerSettingsService {
    ManagerSettingsResponse getSettings();

    ManagerSettingsResponse updateSettings(UpdateManagerSettingsRequest request);

    List<ManagerSettingAuditLogResponse> getAuditLogs();
}
