import { create } from "zustand";

export type ManagerNotificationKind = "success" | "error" | "warning" | "info" | "priority" | "shift";

export type ManagerNotification = {
  id: string;
  kind: ManagerNotificationKind;
  title: string;
  message: string;
  target?: string;
  href?: string;
  plate?: string;
  createdAt: string;
  read: boolean;
};

type PushNotificationInput = Omit<ManagerNotification, "id" | "createdAt" | "read">;

type ManagerNotificationState = {
  notifications: ManagerNotification[];
  activePopup: ManagerNotification | null;
  push: (notification: PushNotificationInput) => ManagerNotification;
  openPopup: (notificationId: string) => void;
  closePopup: () => void;
  markAllRead: () => void;
  clear: () => void;
};

export const useManagerNotificationStore = create<ManagerNotificationState>((set, get) => ({
  notifications: [
    {
      id: "manager-welcome-note",
      kind: "info",
      title: "Manager notification center đã sẵn sàng",
      message: "Các thao tác như thêm staff, cập nhật ca, gửi note hoặc đánh dấu xe ưu tiên sẽ hiện tại đây.",
      target: "Manager",
      href: "/manager/settings",
      createdAt: "09:00",
      read: false,
    },
  ],
  activePopup: null,
  push: (notification) => {
    const nextNotification: ManagerNotification = {
      ...notification,
      id: `manager-notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };

    set((state) => ({
      notifications: [nextNotification, ...state.notifications].slice(0, 30),
      activePopup: nextNotification,
    }));

    return nextNotification;
  },
  openPopup: (notificationId) => {
    const notification = get().notifications.find((item) => item.id === notificationId) ?? null;
    set((state) => ({
      activePopup: notification,
      notifications: state.notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    }));
  },
  closePopup: () => set({ activePopup: null }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true })),
    })),
  clear: () => set({ notifications: [], activePopup: null }),
}));
