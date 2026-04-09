package com.rtlms.scheduler;

import com.rtlms.service.DashboardService;
import com.rtlms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
public class RealtimeScheduler {

    private final SimpMessagingTemplate messagingTemplate;
    private final LogService logService;
    private final DashboardService dashboardService;

    @Scheduled(fixedDelay = 5000)
    public void pushLogs() {
        messagingTemplate.convertAndSend("/topic/logs", logService.getRecentForWebSocket());
    }

    @Scheduled(fixedDelay = 10000)
    public void pushDashboard() {
        messagingTemplate.convertAndSend("/topic/dashboard", dashboardService.getOverview());
    }
}
