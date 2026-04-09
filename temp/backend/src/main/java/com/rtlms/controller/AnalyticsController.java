package com.rtlms.controller;

import com.rtlms.dto.PerformanceMetric;
import com.rtlms.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/performance")
    public List<PerformanceMetric> performance() {
        return analyticsService.getPerformance();
    }
}
