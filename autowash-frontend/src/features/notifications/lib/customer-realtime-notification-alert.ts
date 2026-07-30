"use client";

import Swal, { type SweetAlertIcon } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type CustomerRealtimeNotification = {
  title: string;
  message: string;
  type: string;
  confirmButtonText: string;
};

function getNotificationIcon(type: string): SweetAlertIcon {
  switch (type.toUpperCase()) {
    case "PROMOTION":
    case "LOYALTY":
    case "VOUCHER_EXPIRY":
      return "success";
    case "BOOKING_REMINDER":
    case "NO_SHOW":
      return "warning";
    default:
      return "info";
  }
}

export function showCustomerRealtimeNotification({
  title,
  message,
  type,
  confirmButtonText,
}: CustomerRealtimeNotification) {
  return Swal.fire({
    icon: getNotificationIcon(type),
    titleText: title,
    text: message,
    confirmButtonText,
    showCloseButton: true,
    buttonsStyling: false,
    timer: 12_000,
    timerProgressBar: true,
    customClass: {
      container: "swal-customer-notification-container",
      popup: "swal-customer-notification-popup",
      title: "swal-customer-notification-title",
      htmlContainer: "swal-customer-notification-message",
      confirmButton: "swal-customer-notification-confirm",
      closeButton: "swal-customer-notification-close",
      timerProgressBar: "swal-customer-notification-progress",
    },
  });
}
