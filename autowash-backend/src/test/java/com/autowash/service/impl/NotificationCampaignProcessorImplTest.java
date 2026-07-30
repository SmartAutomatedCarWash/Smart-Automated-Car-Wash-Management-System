package com.autowash.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.autowash.entity.NotificationCampaign;
import com.autowash.entity.User;
import com.autowash.entity.enums.CampaignStatus;
import com.autowash.entity.enums.CampaignTargetAudience;
import com.autowash.entity.enums.NotificationType;
import com.autowash.event.WebSocketEventPublisher;
import com.autowash.repository.NotificationCampaignRepository;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class NotificationCampaignProcessorImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationCampaignRepository campaignRepository;

    @Mock
    private WebSocketEventPublisher webSocketEventPublisher;

    @InjectMocks
    private NotificationCampaignProcessorImpl processor;

    @Test
    void publishesCustomerNotificationOnlyAfterCampaignTransactionCommits() {
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().id(customerId).build();
        NotificationCampaign campaign = NotificationCampaign.builder()
                .id(UUID.randomUUID())
                .title("Weekend promotion")
                .message("Save 20% on your next wash.")
                .type(NotificationType.PROMOTION)
                .targetAudience(CampaignTargetAudience.ALL_CUSTOMERS)
                .status(CampaignStatus.DRAFT)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(userRepository.findAllActiveCustomers()).thenReturn(List.of(customer));

        TransactionSynchronizationManager.initSynchronization();
        try {
            processor.processCampaign(campaign);

            verifyNoInteractions(webSocketEventPublisher);
            assertThat(campaign.getStatus()).isEqualTo(CampaignStatus.COMPLETED);
            assertThat(campaign.getSuccessCount()).isEqualTo(1);

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization -> synchronization.afterCommit());

            verify(webSocketEventPublisher).publishCustomerNotification(
                    eq(customerId),
                    any(UUID.class),
                    eq(NotificationType.PROMOTION),
                    eq("Weekend promotion"),
                    eq("Save 20% on your next wash."),
                    isNull(),
                    isNull()
            );
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
