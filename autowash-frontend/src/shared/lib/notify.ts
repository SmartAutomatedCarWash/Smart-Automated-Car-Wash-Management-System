import { toast } from "sonner";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";

type NotifyOptions = {
  description?: string;
  id?: string;
};

export const notify = {
  success(message: string, options?: NotifyOptions) {
    toast.success(message, options);
  },
  info(message: string, options?: NotifyOptions) {
    toast.info(message, options);
  },
  warning(message: string, options?: NotifyOptions) {
    toast.warning(message, options);
  },
  error(error: unknown, fallback = "Something went wrong. Please try again.", options?: NotifyOptions) {
    toast.error(getDisplayErrorMessage(error) || fallback, options);
  },
};
