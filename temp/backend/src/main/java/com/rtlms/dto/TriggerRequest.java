package com.rtlms.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TriggerRequest {
    private String triggerType;
    private Map<String, Object> params;
}
