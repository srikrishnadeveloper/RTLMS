package com.rtlms.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "alerts")
public class Alert {

    @Id
    private String id;

    @Field("alert_id")
    private String alertId;

    @Field("alert_name")
    private String alertName;

    private String description;
    private String severity;
    private String status;

    @Field("created_at")
    private Instant createdAt;

    @Field("last_triggered")
    private Instant lastTriggered;

    @Field("trigger_count")
    private Integer triggerCount;

    @Field("application_id")
    private String applicationId;

    @Field("server_id")
    private String serverId;

    @Field("rule_name")
    private String ruleName;

    private String condition;
    private Double threshold;

    @Field("time_window")
    private Integer timeWindow;

    @Field("notification_channels")
    private List<Map<String, Object>> notificationChannels;
}
