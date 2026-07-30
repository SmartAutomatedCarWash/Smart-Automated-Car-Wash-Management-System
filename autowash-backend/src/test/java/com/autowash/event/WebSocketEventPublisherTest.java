package com.autowash.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.autowash.entity.enums.NotificationType;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class WebSocketEventPublisherTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketEventPublisher publisher;

    @Test
    void publishesNullSafeCustomerNotificationPayload() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);

        publisher.publishCustomerNotification(
                userId,
                notificationId,
                NotificationType.SYSTEM,
                null,
                null,
                null,
                null
        );

        verify(messagingTemplate).convertAndSend(
                eq("/topic/notifications/" + userId),
                payloadCaptor.capture()
        );
        assertThat(payloadCaptor.getValue())
                .containsEntry("eventType", "NOTIFICATION_CREATED")
                .containsEntry("notificationId", notificationId.toString())
                .containsEntry("title", "")
                .containsEntry("message", "");
    }

    @Test
    void broadcastsAnnouncementChangesToSharedTopic() {
        UUID announcementId = UUID.randomUUID();
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);

        publisher.publishAnnouncementChanged(announcementId, "UPDATED");

        verify(messagingTemplate).convertAndSend(
                eq("/topic/announcements"),
                payloadCaptor.capture()
        );
        assertThat(payloadCaptor.getValue())
                .containsEntry("eventType", "ANNOUNCEMENT_CHANGED")
                .containsEntry("announcementId", announcementId.toString())
                .containsEntry("changeType", "UPDATED");
    }
}
