package com.rtlms.service;

import com.rtlms.dto.PerformanceMetric;
import com.rtlms.model.Application;
import com.rtlms.repository.ApplicationRepository;
import com.rtlms.repository.LogEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ApplicationRepository applicationRepository;
    private final LogEntryRepository logEntryRepository;

    public List<PerformanceMetric> getPerformance() {
        List<Application> apps = applicationRepository.findAll();
        return apps.stream().map(app -> {
            long errorCount = logEntryRepository.countByLevelAndApplicationId("ERROR", app.getId());
            long totalCount = logEntryRepository.countByApplicationId(app.getId());
            double errorRate = totalCount > 0 ? (double) errorCount / totalCount * 100 : 0;
            return new PerformanceMetric(app.getId(), app.getAppName(), errorRate, totalCount);
        }).collect(Collectors.toList());
    }
}
