WITH repaired_bookings AS (
    UPDATE bookings booking
    SET status = 'CONFIRMED',
        updated_at = now()
    FROM payments payment
    WHERE payment.booking_id = booking.id
      AND booking.status = 'PENDING'
      AND payment.method = 'OWNED_COMBO'
      AND payment.status = 'PAID'
      AND payment.amount = 0
    RETURNING booking.id
)
INSERT INTO booking_status_histories (booking_id, old_status, new_status, reason, changed_at)
SELECT id, 'PENDING', 'CONFIRMED', 'Repaired paid owned combo booking', now()
FROM repaired_bookings;
