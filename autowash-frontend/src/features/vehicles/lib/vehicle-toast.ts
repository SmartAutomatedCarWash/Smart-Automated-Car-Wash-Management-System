import { getApiFieldErrors } from "@/shared/lib/api-errors";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { ExternalToast } from "sonner";
import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const VEHICLE_TOAST_OPTIONS = {
  position: "bottom-right",
  duration: 3200,
  classNames: {
    toast:
      "group-[.toaster]:w-[min(440px,calc(100vw-2rem))] group-[.toaster]:rounded-2xl group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:shadow-[0_20px_60px_rgba(15,23,42,0.16)]",
    title: "group-[.toast]:text-base group-[.toast]:font-bold group-[.toast]:leading-6",
    closeButton: "group-[.toast]:left-auto group-[.toast]:right-3 group-[.toast]:top-3",
  },
} satisfies ExternalToast;

const VEHICLE_ALERT_BASE: SweetAlertOptions = {
  confirmButtonText: "OK",
  timer: 10000,
  timerProgressBar: true,
  buttonsStyling: false,
  customClass: {
    popup: "swal-notify-popup",
    title: "swal-notify-title",
    htmlContainer: "swal-notify-message",
  },
};

export function showVehicleAlert({
  icon,
  title,
  message,
}: {
  icon: SweetAlertIcon;
  title: string;
  message: string;
}) {
  const confirmButtonClass =
    icon === "success"
      ? "swal-notify-btn-success"
      : icon === "error"
        ? "swal-notify-btn-error"
        : icon === "warning"
          ? "swal-notify-btn-warning"
          : "swal-notify-btn-info";

  return Swal.fire({
    ...VEHICLE_ALERT_BASE,
    icon,
    title,
    text: message,
    customClass: {
      ...VEHICLE_ALERT_BASE.customClass,
      confirmButton: confirmButtonClass,
    },
  });
}

export function getVehicleToastErrorMessage(
  error: unknown,
  fallback: string,
  getErrorMessage: (error: ApiErrorResponse) => string,
) {
  const fieldMessages = getApiFieldErrors(error)
    .map((item) => item.message?.trim())
    .filter(Boolean);

  if (fieldMessages.length > 0) {
    return fieldMessages.join(" ");
  }

  if (isApiErrorLike(error)) {
    return getErrorMessage(error);
  }

  return fallback;
}

function isApiErrorLike(error: unknown): error is ApiErrorResponse {
  return Boolean(error && typeof error === "object" && "message" in error);
}
