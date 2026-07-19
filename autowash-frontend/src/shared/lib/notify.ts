import { toast } from "sonner";

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
  error(message: string, options?: NotifyOptions) {
    toast.error(message, options);
  },
};
