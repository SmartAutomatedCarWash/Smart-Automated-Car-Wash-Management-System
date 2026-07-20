CREATE TABLE manager_operation_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    auto_assign_enabled boolean NOT NULL DEFAULT true,
    least_busy_staff_first boolean NOT NULL DEFAULT true,
    respect_staff_capacity boolean NOT NULL DEFAULT true,
    max_active_sessions_per_staff integer NOT NULL DEFAULT 4 CHECK (max_active_sessions_per_staff BETWEEN 1 AND 12),
    paid_booking_priority boolean NOT NULL DEFAULT true,
    tier_priority_enabled boolean NOT NULL DEFAULT true,
    primary_vehicle_priority boolean NOT NULL DEFAULT true,
    early_check_in_minutes integer NOT NULL DEFAULT 15 CHECK (early_check_in_minutes BETWEEN 0 AND 180),
    late_grace_minutes integer NOT NULL DEFAULT 20 CHECK (late_grace_minutes BETWEEN 0 AND 180),
    waiting_alert_minutes integer NOT NULL DEFAULT 12 CHECK (waiting_alert_minutes BETWEEN 1 AND 120),
    delay_alert_minutes integer NOT NULL DEFAULT 25 CHECK (delay_alert_minutes BETWEEN 1 AND 180),
    overload_alert_sessions integer NOT NULL DEFAULT 4 CHECK (overload_alert_sessions BETWEEN 1 AND 12),
    cancellation_rate_alert integer NOT NULL DEFAULT 18 CHECK (cancellation_rate_alert BETWEEN 1 AND 100),
    notify_new_booking boolean NOT NULL DEFAULT true,
    notify_delayed_session boolean NOT NULL DEFAULT true,
    notify_staff_transfer boolean NOT NULL DEFAULT true,
    notify_completion boolean NOT NULL DEFAULT false,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

INSERT INTO manager_operation_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE manager_notification_templates (
    template_key varchar(50) PRIMARY KEY,
    display_name varchar(100) NOT NULL,
    description varchar(255) NOT NULL,
    message text NOT NULL,
    preview text NOT NULL,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

INSERT INTO manager_notification_templates (template_key, display_name, description, message, preview)
VALUES
    (
        'newBooking',
        'New booking',
        'Sent when a booking is waiting for manager intake.',
        'A new booking is waiting for manager intake. Please review the queue and create a wash session.',
        'Example: Vehicle 51F-456.89 - Ultimate Detail is waiting for intake.'
    ),
    (
        'delay',
        'Delayed session',
        'Sent when a wash session exceeds the configured delay threshold.',
        'A wash session is taking longer than expected. Please review bay progress and update the customer if needed.',
        'Example: Vehicle 51F-456.89 is taking longer than expected.'
    ),
    (
        'transfer',
        'Staff transfer',
        'Sent when a manager transfers a wash session to another staff member.',
        'A wash session has been reassigned to another staff member. Please continue tracking the handover.',
        'Example: Vehicle 51F-456.89 has been reassigned to Le Van Hai.'
    )
ON CONFLICT (template_key) DO NOTHING;

CREATE TABLE manager_setting_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    title varchar(150) NOT NULL,
    detail text NOT NULL,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_setting_audit_logs_actor_id ON manager_setting_audit_logs (actor_id);
CREATE INDEX idx_manager_setting_audit_logs_created_at ON manager_setting_audit_logs (created_at DESC);
