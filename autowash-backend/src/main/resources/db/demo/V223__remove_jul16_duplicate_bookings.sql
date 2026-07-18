-- V223: Remove duplicate/junk bookings on Jul 16, 2026 for Bui Thi Mai (ee000001)
-- These bookings have final_amount=0, no staff assigned, and were created by a previous seed run

DO $$
DECLARE
    v_customer_id uuid := 'ee000001-0000-0000-0000-000000000000';
    v_jul16_start timestamptz := '2026-07-16 00:00:00+07';
    v_jul16_end   timestamptz := '2026-07-17 00:00:00+07';
BEGIN
    -- Delete in FK dependency order
    DELETE FROM booking_promotions
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM booking_options
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM booking_status_histories
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM payments
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM wash_sessions
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM point_transactions
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM user_vouchers
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM violation_records
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM customer_combo_usages
    WHERE booking_id IN (
        SELECT id FROM bookings
        WHERE customer_id = v_customer_id
          AND scheduled_at >= v_jul16_start
          AND scheduled_at < v_jul16_end
    );

    DELETE FROM bookings
    WHERE customer_id = v_customer_id
      AND scheduled_at >= v_jul16_start
      AND scheduled_at < v_jul16_end;

    RAISE NOTICE 'Cleaned up Jul 16 duplicate bookings for ee000001 (Bui Thi Mai)';
END $$;

-- Also remove any ALL zero-amount bookings created on today's date for ALL demo customers
-- (catches any other phantom data from previous broken seed runs)
DO $$
BEGIN
    DELETE FROM booking_promotions
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM booking_options
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM booking_status_histories
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM payments
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM wash_sessions
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM point_transactions
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM user_vouchers
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM violation_records
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM customer_combo_usages
    WHERE booking_id IN (
        SELECT id FROM bookings WHERE final_amount = 0 AND base_amount = 0
          AND created_at >= CURRENT_DATE
    );
    DELETE FROM bookings
    WHERE final_amount = 0 AND base_amount = 0
      AND created_at >= CURRENT_DATE;

    RAISE NOTICE 'Cleaned up zero-amount bookings created today';
END $$;
