package com.rtlms.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LogGenerateRequest {
    private String level;
    private String message;
    private String applicationId;
    private String serverId;
    private String sourceIp;
}
