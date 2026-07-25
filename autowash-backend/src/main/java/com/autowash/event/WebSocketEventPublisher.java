package com.autowash.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishBookingUpdate(String bookingId, String status) {
        try {
            log.info("Broadcasting booking update: {} - {}", bookingId, status);
            messagingTemplate.convertAndSend("/topic/bookings", Map.of(
                "eventType", "BOOKING_UPDATE",
                "bookingId", bookingId,
                "status", status,
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
}
