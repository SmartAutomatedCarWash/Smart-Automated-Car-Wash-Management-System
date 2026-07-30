import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@stomp/stompjs";
import { isRealtimeEnabled, resolveSockJsUrl } from "@/shared/lib/websocket";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SockJS = require("sockjs-client") as new (url: string) => WebSocket;
const BOOKING_TOPIC = "/topic/bookings";

type WsMessage = {
  eventType: "BOOKING_UPDATE" | "WASH_SESSION_UPDATE";
  bookingId?: string;
  sessionId?: string;
  status: string;
  changeType?: "BOOKING_CHANGED" | "STAFF_ASSIGNMENT_CHANGED";
  timestamp: string | number;
};

/**
 * useWebSocket — Real-time STOMP subscription for Booking / WashSession changes.
 * Automatically invalidates relevant React-Query caches on each server event.
 * Falls back gracefully: if the connection fails the app continues with polling.
 */
export function useWebSocket() {
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!isRealtimeEnabled()) {
      return;
    }
    const wsUrl = resolveSockJsUrl();
    const stompClient = new Client({
      // SockJS transport for maximum browser compatibility
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(BOOKING_TOPIC, (frame) => {
          try {
            const msg: WsMessage = JSON.parse(frame.body);
            handleWsMessage(msg, queryClient);
          } catch {
            // Ignore malformed messages
          }
        });
      },
      onStompError: (frame) => {
        console.warn("[WebSocket] STOMP error:", frame.headers["message"]);
      },
      onWebSocketError: () => {
        // Silently swallow — polling intervals on queries act as fallback
      },
    });

    stompClient.activate();
    clientRef.current = stompClient;

    return () => {
      stompClient.deactivate().catch(() => {});
    };
  }, [queryClient]);

  return null;
}

/** Invalidate all cached queries that are affected by a real-time event. */
function handleWsMessage(msg: WsMessage, queryClient: ReturnType<typeof useQueryClient>) {
  if (msg.eventType === "BOOKING_UPDATE") {
    // Admin / Manager booking lists
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["booking-staff-options"] });
    void queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
    if (msg.bookingId) {
      void queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", msg.bookingId] });
    }

    // Manager operations & dashboard
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
    void queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["manager-reports-dashboard"] });
  }

  if (msg.eventType === "WASH_SESSION_UPDATE") {
    // Admin booking status can change through manager/staff operations.
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-bookings-summary"] });

    // Staff operations queue
    void queryClient.invalidateQueries({ queryKey: ["staff-my-sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["staff-operations"] });
    void queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });

    // Manager operations queue (sessions appear here too)
    void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
    void queryClient.invalidateQueries({ queryKey: ["manager-staff"] });
  }
}
