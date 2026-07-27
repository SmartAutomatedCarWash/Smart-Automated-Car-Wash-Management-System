package com.autowash.service;

import com.autowash.dto.ManagerSettingAuditLogResponse;
import com.autowash.dto.ManagerOperationSettingsPayload;
import com.autowash.dto.ManagerSettingsResponse;
import com.autowash.dto.UpdateManagerSettingsRequest;
import com.autowash.dto.UpdateWeeklyStaffKpiTargetRequest;
import java.util.List;

public interface ManagerSettingsService {
    ManagerSettingsResponse getSettings();
    ManagerOperationSettingsPayload getOperationSettings();

    ManagerSettingsResponse updateSettings(UpdateManagerSettingsRequest request);
    ManagerSettingsResponse updateWeeklyStaffKpiTarget(UpdateWeeklyStaffKpiTargetRequest request);

    List<ManagerSettingAuditLogResponse> getAuditLogs();
}
