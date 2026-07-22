/**
 * notify — shared SweetAlert2 notification utility
 * Replaces sonner toast. API: notify.success / error / info / warning
 * Timer: 10s auto-close, progress bar, centered modal, custom CSS classes.
 */
import Swal, { SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type NotifyOptions = {
  description?: string;
  id?: string;
  position?: SweetAlertOptions["position"];
};

const BASE: SweetAlertOptions = {
  confirmButtonText: "OK",
  timer: 10000,
  timerProgressBar: true,
  customClass: {
    popup:         "swal-notify-popup",
    title:         "swal-notify-title",
    htmlContainer: "swal-notify-message",
  },
  buttonsStyling: false,
};

export const notify = {
  success(message: string, _options?: NotifyOptions) {
    return Swal.fire({
      ...BASE,
      icon: "success",
      title: "Thành công!",
      text: message,
      customClass: {
        ...BASE.customClass,
        confirmButton: "swal-notify-btn-success",
      },
    });
  },

  error(message: string, _options?: NotifyOptions) {
    return Swal.fire({
      ...BASE,
      icon: "error",
      title: "Có lỗi xảy ra!",
      text: message,
      customClass: {
        ...BASE.customClass,
        confirmButton: "swal-notify-btn-error",
      },
    });
  },

  info(message: string, _options?: NotifyOptions) {
    return Swal.fire({
      ...BASE,
      icon: "info",
      title: "Thông báo",
      text: message,
      customClass: {
        ...BASE.customClass,
        confirmButton: "swal-notify-btn-info",
      },
    });
  },

  warning(message: string, _options?: NotifyOptions) {
    return Swal.fire({
      ...BASE,
      icon: "warning",
      title: "Cảnh báo!",
      text: message,
      customClass: {
        ...BASE.customClass,
        confirmButton: "swal-notify-btn-warning",
      },
    });
  },
};
