import * as React from "react";
import { notify } from "@/shared/lib/notify";
import { useCarwashStore } from "@/shared/store/carwash-store";

const FIRED_REMINDERS_KEY = "aura-fired-booking-reminders";

function getStoredReminderKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(FIRED_REMINDERS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

function saveStoredReminderKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify([...keys].slice(-200)));
}

export function CustomerReminderWatcher() {
  const { bookings, currentCustomerId, hydrated, isAuthenticated, role } = useCarwashStore();

  React.useEffect(() => {
    if (!hydrated || !isAuthenticated || role !== "Customer") return;

    const checkReminders = () => {
      const fired = getStoredReminderKeys();
      let changed = false;

      bookings.forEach((booking) => {
        if (booking.customerId !== currentCustomerId) return;
        if (!booking.reminderMinutesBefore) return;
        if (!["Pending", "Confirmed"].includes(booking.status)) return;

        const startsAt = new Date(`${booking.dateISO} ${booking.timeSlot}`);
        const diffMs = startsAt.getTime() - Date.now();
        if (diffMs <= 0 || diffMs > booking.reminderMinutesBefore * 60 * 1000) return;

        const key = `${booking.id}:${booking.dateISO}:${booking.timeSlot}:${booking.reminderMinutesBefore}`;
        if (fired.has(key)) return;

        const title = `Booking ${booking.id} starts soon`;
        const message = `${booking.vehiclePlate} check-in is at ${booking.timeSlot}.`;
        notify.info(title);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body: message });
        }

        fired.add(key);
        changed = true;
      });

      if (changed) {
        saveStoredReminderKeys(fired);
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [bookings, currentCustomerId, hydrated, isAuthenticated, role]);

  return null;
}
