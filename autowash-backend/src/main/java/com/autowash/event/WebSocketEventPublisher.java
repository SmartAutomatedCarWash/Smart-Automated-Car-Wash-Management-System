package com.autowash.event;

import com.autowash.entity.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishBookingUpdate(String bookingId, String status) {
        publishBookingUpdate(bookingId, status, "BOOKING_CHANGED");
    }

    public void publishBookingUpdate(String bookingId, String status, String changeType) {
        try {
            log.info("Broadcasting booking update: {} - {} - {}", bookingId, status, changeType);
            messagingTemplate.convertAndSend("/topic/bookings", Map.of(
                "eventType", "BOOKING_UPDATE",
                "bookingId", bookingId,
                "status", status,
                "changeType", changeType,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast booking update via WebSocket", e);
        }
    }

    public void publishWashSessionUpdate(String sessionId, String status) {
        try {
            log.info("Broadcasting wash session update: {} - {}", sessionId, status);
            messagingTemplate.convertAndSend("/topic/bookings", Map.of(
                "eventType", "WASH_SESSION_UPDATE",
                "sessionId", sessionId,
                "status", status,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast wash session update via WebSocket", e);
        }
    }

    public void publishCustomerNotification(
            UUID userId,
            UUID notificationId,
            NotificationType type,
            String title,
            String message,
            String oldTier,
            String newTier
    ) {
        try {
            log.info("Broadcasting customer notification: userId={} notificationId={} type={}", userId, notificationId, type);
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, Map.of(
                "eventType", "NOTIFICATION_CREATED",
                "notificationId", notificationId.toString(),
                "type", type.name(),
                "title", title,
                "message", message,
                "oldTier", oldTier == null ? "" : oldTier,
                "newTier", newTier == null ? "" : newTier,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Failed to broadcast customer notification via WebSocket", e);
        }
    }
}
