ALTER TABLE manager_operation_settings
    ADD COLUMN IF NOT EXISTS weekly_staff_kpi_target integer NOT NULL DEFAULT 40;

ALTER TABLE manager_operation_settings
    DROP CONSTRAINT IF EXISTS manager_operation_settings_weekly_staff_kpi_target_check;

ALTER TABLE manager_operation_settings
    ADD CONSTRAINT manager_operation_settings_weekly_staff_kpi_target_check
        CHECK (weekly_staff_kpi_target BETWEEN 1 AND 200);
