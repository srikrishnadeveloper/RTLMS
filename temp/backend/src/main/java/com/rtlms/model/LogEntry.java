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
@Document(collection = "log_entries")
public class LogEntry {

    @Id
    private String id;

    @Field("log_id")
    private String logId;

    private Instant timestamp;
    private String level;
    private String message;

    @Field("source_ip")
    private String sourceIp;

    @Field("stack_trace")
    private String stackTrace;

    private List<String> tags;
    private Map<String, Object> metadata;

    @Field("application_id")
    private String applicationId;

    @Field("server_id")
    private String serverId;
}
