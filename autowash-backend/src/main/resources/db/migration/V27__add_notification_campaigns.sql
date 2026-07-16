CREATE TABLE notification_campaigns (
    id UUID PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_audience VARCHAR(50) NOT NULL,
    target_details TEXT,
    status VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    success_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE notifications ADD COLUMN campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL;
