package com.rtlms.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DashboardOverview {
    private long applications;
    private long servers;
    private long totalLogs;
    private long activeAlerts;
    private long recentErrors;
    private List<Map<String, Object>> serversByDatacenter;
}
