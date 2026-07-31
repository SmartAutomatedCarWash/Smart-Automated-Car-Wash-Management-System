ALTER TABLE notification_campaigns
    DROP CONSTRAINT IF EXISTS notification_campaigns_type_check;

ALTER TABLE notification_campaigns
    ADD CONSTRAINT notification_campaigns_type_check
        CHECK (type IN (
            'BOOKING_CREATED',
            'BOOKING_CONFIRMED',
            'WASH_CHECKED_IN',
            'WASH_COMPLETED',
            'BOOKING_REMINDER',
            'NO_SHOW',
            'LOYALTY',
            'VOUCHER_EXPIRY',
            'SYSTEM',
            'PROMOTION',
            'WARNING'
        ));

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
            'BOOKING_CREATED',
            'BOOKING_CONFIRMED',
            'WASH_CHECKED_IN',
            'WASH_COMPLETED',
            'BOOKING_REMINDER',
            'NO_SHOW',
            'LOYALTY',
            'VOUCHER_EXPIRY',
            'SYSTEM',
            'PROMOTION',
            'WARNING'
        ));
