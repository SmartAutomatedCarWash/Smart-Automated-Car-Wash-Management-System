"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@stomp/stompjs";
import { setAuthUser, useAuthStore } from "@/features/auth/store/auth.store";
import { customerLoyaltyScope } from "@/features/loyalty/hooks/customer-loyalty-query";
import { isRealtimeEnabled, resolveSockJsUrl } from "@/shared/lib/websocket";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SockJS = require("sockjs-client") as new (url: string) => WebSocket;

type NotificationSocketMessage = {
  eventType?: string;
  notificationId?: string;
  announcementId?: string;
  changeType?: string;
  type?: string;
  title?: string;
  message?: string;
  oldTier?: string;
  newTier?: string;
  timestamp?: number;
};

type CustomerNotificationRealtimeOptions = {
  onNotification?: (payload: {
    notificationId: string;
    type: string;
    title: string;
    message: string;
  }) => void;
  onTierUpgrade?: (payload: {
    notificationId: string;
    title: string;
    message: string;
    oldTier?: string | null;
    newTier?: string | null;
  }) => void;
  onAnnouncementChanged?: (payload: {
    announcementId: string;
    changeType: string;
    timestamp?: number;
  }) => void;
};

function customerNotificationsQueryKey(userId: string | null) {
  return ["customer-notifications", userId] as const;
}

export function useCustomerNotificationRealtime(
  enabled: boolean,
  options?: CustomerNotificationRealtimeOptions,
) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);
  const optionsRef = useRef<CustomerNotificationRealtimeOptions | undefined>(options);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = user?.userId ?? null;
  const isCustomer = user?.role === "CUSTOMER";

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!enabled || !accessToken || !userId || !isCustomer) return;
    if (!isRealtimeEnabled()) return;

    const wsUrl = resolveSockJsUrl();
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(`/topic/notifications/${userId}`, (frame) => {
          try {
            const message = JSON.parse(frame.body) as NotificationSocketMessage;
            if (message.eventType !== "NOTIFICATION_CREATED") return;

            if (message.newTier && user) {
              setAuthUser({
                ...user,
                tier: message.newTier,
              });
            }

            if (message.notificationId && message.title && message.message) {
              if (message.newTier) {
                optionsRef.current?.onTierUpgrade?.({
                  notificationId: message.notificationId,
                  title: message.title,
                  message: message.message,
                  oldTier: message.oldTier || null,
                  newTier: message.newTier,
                });
              } else {
                optionsRef.current?.onNotification?.({
                  notificationId: message.notificationId,
                  type: message.type || "SYSTEM",
                  title: message.title,
                  message: message.message,
                });
              }
            }
          } catch {
            // even if payload parsing fails, still refresh customer data as a safe fallback
          }

          void queryClient.invalidateQueries({ queryKey: customerNotificationsQueryKey(userId) });
          void queryClient.invalidateQueries({ queryKey: customerLoyaltyScope(userId) });
        });

        stompClient.subscribe("/topic/announcements", (frame) => {
          try {
            const message = JSON.parse(frame.body) as NotificationSocketMessage;
            if (message.eventType !== "ANNOUNCEMENT_CHANGED") return;
            if (message.announcementId && message.changeType) {
              optionsRef.current?.onAnnouncementChanged?.({
                announcementId: message.announcementId,
                changeType: message.changeType,
                timestamp: message.timestamp,
              });
            }
            void queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
          } catch {
            // The regular announcement refetch interval remains the fallback.
          }
        });
      },
      onStompError: () => {
        // fallback remains the notification polling interval
      },
      onWebSocketError: () => {
        // fallback remains the notification polling interval
      },
    });

    stompClient.activate();
    clientRef.current = stompClient;

    return () => {
      clientRef.current = null;
      stompClient.deactivate().catch(() => {});
    };
  }, [accessToken, enabled, isCustomer, queryClient, user, userId]);

  return null;
}
