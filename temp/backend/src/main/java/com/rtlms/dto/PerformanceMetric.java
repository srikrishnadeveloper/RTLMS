package com.rtlms.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PerformanceMetric {
    private String id;
    private String appName;
    private Double errorRate;
    private Long totalLogs;
}
