ALTER TABLE bookings ADD COLUMN confirmation_email VARCHAR(255);
UPDATE bookings
SET confirmation_email = (
  SELECT users.email
  FROM users
  WHERE users.id = bookings.customer_id
)
WHERE bookings.confirmation_email IS NULL;
