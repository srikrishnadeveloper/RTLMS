package com.rtlms.service;

import com.rtlms.dto.DashboardOverview;
import com.rtlms.repository.AlertRepository;
import com.rtlms.repository.ApplicationRepository;
import com.rtlms.repository.LogEntryRepository;
import com.rtlms.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ApplicationRepository applicationRepository;
    private final ServerRepository serverRepository;
    private final LogEntryRepository logEntryRepository;
    private final AlertRepository alertRepository;

    public DashboardOverview getOverview() {
        long apps = applicationRepository.count();
        long servers = serverRepository.count();
        long totalLogs = logEntryRepository.count();
        long activeAlerts = alertRepository.countByStatus("ACTIVE");

        Instant since24h = Instant.now().minus(24, ChronoUnit.HOURS);
        long recentErrors = logEntryRepository.countByLevelAndTimestampAfter("ERROR", since24h);

        // servers by datacenter
        List<Map<String, Object>> byDc = new ArrayList<>();
        serverRepository.findAll().forEach(s -> {
            String dc = s.getDatacenter() != null ? s.getDatacenter() : "Unknown";
            byDc.stream()
                    .filter(m -> m.get("datacenter").equals(dc))
                    .findFirst()
                    .ifPresentOrElse(
                            m -> m.put("count", (long) m.get("count") + 1),
                            () -> { Map<String, Object> m = new HashMap<>(); m.put("datacenter", dc); m.put("count", 1L); byDc.add(m); }
                    );
        });

        return new DashboardOverview(apps, servers, totalLogs, activeAlerts, recentErrors, byDc);
    }
}
